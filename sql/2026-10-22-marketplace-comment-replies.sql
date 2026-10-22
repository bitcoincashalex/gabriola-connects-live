-- ============================================================================
-- Buy, Sell, Rent & Free: replies under comments - Version 1.0.0 - 2026-10-22
-- Run in Supabase > SQL Editor (Strachan Family Project = Gabriola Connects).
-- Goes with site version 1.3.48.
--
-- RUN ORDER:
--   1. sql/2026-10-22-marketplace-anonymous.sql   (if not run yet; this file needs it)
--   2. this file
--   3. then push the code
--
-- What this does:
--   1. Each comment can be a reply to another comment (parent_id). Replies are one level
--      deep: a reply to a reply is filed under the original question.
--   2. A reply must be on the same listing as the comment it answers.
--   3. Deleting a comment also deletes the replies under it.
--   4. Notices: a reply goes to the person who asked and anyone else who replied in that
--      thread, plus the poster. A seller's reply to one question no longer pings every
--      commenter on the listing, only the people in that thread. A seller's top level note
--      still goes to everyone who commented.
-- Existing comments stay as they are (all top level). Safe to run more than once.
--
-- Undo: ALTER TABLE public.marketplace_comments DROP COLUMN parent_id;
--       then run sql/2026-10-22-marketplace-anonymous.sql again for the old functions.
-- ============================================================================

BEGIN;

DO $$
BEGIN
  IF to_regprocedure('public.marketplace_listing_owner(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Run sql/2026-10-22-marketplace-anonymous.sql first, then this file.';
  END IF;
END $$;

-- 1. The reply link -------------------------------------------------------------------------
ALTER TABLE public.marketplace_comments
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.marketplace_comments(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS marketplace_comments_parent_idx ON public.marketplace_comments (parent_id);

-- 2. Comment guard (version 1.2.0): checks and flattens replies ------------------------------
CREATE OR REPLACE FUNCTION public.marketplace_comment_guard()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  owner  uuid := public.marketplace_listing_owner(NEW.listing_id);
  anon   boolean := COALESCE((SELECT l.is_anonymous FROM public.marketplace_listings l WHERE l.id = NEW.listing_id), false);
  parent record;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  NEW.body := trim(NEW.body);
  NEW.created_at := now();

  IF NEW.parent_id IS NOT NULL THEN
    SELECT c.id, c.listing_id, c.parent_id INTO parent
    FROM public.marketplace_comments c WHERE c.id = NEW.parent_id;
    IF parent.id IS NULL THEN
      RAISE EXCEPTION 'That comment has been deleted.';
    END IF;
    IF parent.listing_id <> NEW.listing_id THEN
      RAISE EXCEPTION 'A reply must be on the same listing.';
    END IF;
    NEW.parent_id := COALESCE(parent.parent_id, parent.id);   -- one level deep
  END IF;

  NEW.is_seller := NEW.user_id IS NOT NULL AND NEW.user_id = owner;
  IF NEW.is_seller AND anon THEN
    NEW.author_name := 'A neighbour';
    NEW.user_id := NULL;
  ELSE
    SELECT COALESCE(NULLIF(trim(u.first_name), ''), NULLIF(split_part(trim(u.full_name), ' ', 1), ''), 'A neighbour')
    INTO NEW.author_name
    FROM public.users u WHERE u.id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.marketplace_comment_guard() FROM PUBLIC, anon, authenticated;

-- 3. Comment notices (version 1.2.0): replies go to the people in that thread ----------------
CREATE OR REPLACE FUNCTION public.notify_marketplace_comment()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  sender    uuid := '713881fc-2506-490c-8d72-4c6205bd1093';  -- Gabriola Connects
  listing   record;
  owner     uuid;
  recipient uuid;
  conv      uuid;
  excerpt   text;
  msg       text;
  url       text;
BEGIN
  SELECT l.id, l.title INTO listing FROM public.marketplace_listings l WHERE l.id = NEW.listing_id;
  IF listing.id IS NULL THEN
    RETURN NEW;
  END IF;
  owner := public.marketplace_listing_owner(listing.id);

  excerpt := CASE WHEN char_length(NEW.body) > 140 THEN left(NEW.body, 137) || '...' ELSE NEW.body END;
  url := 'https://www.gabriolaconnects.ca/marketplace/' || listing.id || '#comment-' || NEW.id;

  FOR recipient IN
    -- the poster hears about every comment and reply that isn't theirs
    SELECT owner WHERE NOT NEW.is_seller
    UNION
    -- a reply: everyone in that thread (the question and the other replies)
    SELECT c.user_id FROM public.marketplace_comments c
    WHERE NEW.parent_id IS NOT NULL AND c.id <> NEW.id
      AND (c.id = NEW.parent_id OR c.parent_id = NEW.parent_id)
      AND c.user_id IS NOT NULL
    UNION
    -- the poster's top level note: everyone who has commented on the listing
    SELECT c.user_id FROM public.marketplace_comments c
    WHERE NEW.is_seller AND NEW.parent_id IS NULL AND c.listing_id = listing.id AND c.id <> NEW.id
      AND c.user_id IS NOT NULL AND c.user_id IS DISTINCT FROM owner
  LOOP
    CONTINUE WHEN recipient IS NULL OR recipient = sender OR recipient IS NOT DISTINCT FROM NEW.user_id;
    CONTINUE WHEN NEW.is_seller AND recipient = owner;
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM public.message_settings s
      WHERE s.user_id = recipient AND s.allow_messages_from = 'nobody'
    );

    msg := CASE
      WHEN NEW.is_seller
        THEN NEW.author_name || ' (the seller) replied on "' || listing.title || '": ' || excerpt
      WHEN recipient = owner AND NEW.parent_id IS NOT NULL
        THEN NEW.author_name || ' replied to a comment on your listing "' || listing.title || '": ' || excerpt
      WHEN recipient = owner
        THEN NEW.author_name || ' commented on your listing "' || listing.title || '": ' || excerpt
      ELSE NEW.author_name || ' replied on "' || listing.title || '": ' || excerpt
    END;

    conv := NULL;
    SELECT c.id INTO conv FROM public.message_conversations c
    WHERE (c.participant_1 = sender AND c.participant_2 = recipient)
       OR (c.participant_1 = recipient AND c.participant_2 = sender)
    LIMIT 1;
    IF conv IS NULL THEN
      INSERT INTO public.message_conversations (participant_1, participant_2, last_message_at)
      VALUES (sender, recipient, now()) RETURNING id INTO conv;
    ELSE
      UPDATE public.message_conversations SET last_message_at = now() WHERE id = conv;
    END IF;

    INSERT INTO public.private_messages (sender_id, receiver_id, message, conversation_id, read, link_url)
    VALUES (sender, recipient, msg, conv, false, url);
  END LOOP;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'marketplace comment notice not sent: %', SQLERRM;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.notify_marketplace_comment() FROM PUBLIC, anon, authenticated;

COMMIT;

-- Check: should show  parent_id | uuid
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'marketplace_comments' AND column_name = 'parent_id';
