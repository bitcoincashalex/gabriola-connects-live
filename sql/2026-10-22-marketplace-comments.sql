-- ============================================================================
-- Buy, Sell & Free: public questions and comments - Version 1.0.0 - 2026-10-22
-- Run in Supabase > SQL Editor (Strachan Family Project = Gabriola Connects).
-- Goes with site version 1.3.42.
--
-- 1. marketplace_comments: public questions and comments under each listing.
--    - Anyone can read the comments on a listing they can see.
--    - Signed in members can comment while the listing is live (not sold, hidden or expired).
--    - Each comment shows the commenter's first name; the seller's own comments are
--      marked as the seller's.
--    - You can delete your own comments; the seller can delete any comment on their
--      listing; admins can delete any comment. Comments can't be edited.
-- 2. Notices from the Gabriola Connects account (site messages):
--    - the seller, when someone comments on their listing
--    - everyone who commented before, when the seller replies
--    (Nobody gets a notice about their own comment; "Nobody can message me" is respected.)
--
-- Safe to run more than once.
-- Undo: DROP TABLE IF EXISTS public.marketplace_comments;
--       DROP FUNCTION IF EXISTS public.marketplace_comment_guard(), public.notify_marketplace_comment(), public.marketplace_listing_open(uuid);
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.marketplace_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  uuid NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES public.users(id) ON DELETE CASCADE,
  author_name text,
  is_seller   boolean NOT NULL DEFAULT false,
  body        text NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 1000),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS marketplace_comments_listing_idx ON public.marketplace_comments (listing_id, created_at);

-- Is the listing taking comments? (live: active and not expired)
CREATE OR REPLACE FUNCTION public.marketplace_listing_open(p_listing uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.marketplace_listings l
    WHERE l.id = p_listing AND l.status = 'active' AND l.expires_at > now()
  );
$$;
REVOKE ALL ON FUNCTION public.marketplace_listing_open(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.marketplace_listing_open(uuid) TO authenticated;

-- Who wrote it, first name only, and whether it's the seller - set by the database
CREATE OR REPLACE FUNCTION public.marketplace_comment_guard()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  NEW.body := trim(NEW.body);
  NEW.created_at := now();
  SELECT COALESCE(NULLIF(trim(u.first_name), ''), NULLIF(split_part(trim(u.full_name), ' ', 1), ''), 'A neighbour')
  INTO NEW.author_name
  FROM public.users u WHERE u.id = NEW.user_id;
  NEW.is_seller := EXISTS (
    SELECT 1 FROM public.marketplace_listings l WHERE l.id = NEW.listing_id AND l.user_id = NEW.user_id
  );
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.marketplace_comment_guard() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS marketplace_comment_guard ON public.marketplace_comments;
CREATE TRIGGER marketplace_comment_guard BEFORE INSERT ON public.marketplace_comments
  FOR EACH ROW EXECUTE FUNCTION public.marketplace_comment_guard();

ALTER TABLE public.marketplace_comments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marketplace_comments FROM anon, authenticated;
GRANT SELECT ON public.marketplace_comments TO anon;
GRANT SELECT, INSERT, DELETE ON public.marketplace_comments TO authenticated;

-- Read: the comments on any listing you're allowed to see
DROP POLICY IF EXISTS "Comments on visible listings" ON public.marketplace_comments;
CREATE POLICY "Comments on visible listings" ON public.marketplace_comments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.marketplace_listings l WHERE l.id = listing_id));

-- Add: signed in, as yourself, only while the listing is live
DROP POLICY IF EXISTS "Members comment on live listings" ON public.marketplace_comments;
CREATE POLICY "Members comment on live listings" ON public.marketplace_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.marketplace_listing_open(listing_id));

-- Remove: your own, any on your listing, or any if you're an admin
DROP POLICY IF EXISTS "Authors, sellers and admins remove comments" ON public.marketplace_comments;
CREATE POLICY "Authors, sellers and admins remove comments" ON public.marketplace_comments FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_marketplace_admin()
    OR EXISTS (SELECT 1 FROM public.marketplace_listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

-- Notices -------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_marketplace_comment()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  sender    uuid := '713881fc-2506-490c-8d72-4c6205bd1093';  -- Gabriola Connects
  listing   record;
  recipient uuid;
  conv      uuid;
  excerpt   text;
  msg       text;
  url       text;
BEGIN
  SELECT l.id, l.title, l.user_id INTO listing FROM public.marketplace_listings l WHERE l.id = NEW.listing_id;
  IF listing.id IS NULL THEN
    RETURN NEW;
  END IF;

  excerpt := CASE WHEN char_length(NEW.body) > 140 THEN left(NEW.body, 137) || '...' ELSE NEW.body END;
  url := 'https://www.gabriolaconnects.ca/marketplace/' || listing.id || '#comment-' || NEW.id;

  FOR recipient IN
    -- A buyer's comment goes to the seller; the seller's reply goes to everyone who commented before
    SELECT listing.user_id WHERE NOT NEW.is_seller
    UNION
    SELECT DISTINCT c.user_id FROM public.marketplace_comments c
    WHERE NEW.is_seller AND c.listing_id = listing.id AND c.id <> NEW.id AND c.user_id <> listing.user_id
  LOOP
    CONTINUE WHEN recipient IS NULL OR recipient = NEW.user_id OR recipient = sender;
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM public.message_settings s
      WHERE s.user_id = recipient AND s.allow_messages_from = 'nobody'
    );

    msg := CASE WHEN NEW.is_seller
      THEN NEW.author_name || ' (the seller) replied on "' || listing.title || '": ' || excerpt
      ELSE NEW.author_name || ' commented on your listing "' || listing.title || '": ' || excerpt
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

DROP TRIGGER IF EXISTS marketplace_comment_notice ON public.marketplace_comments;
CREATE TRIGGER marketplace_comment_notice AFTER INSERT ON public.marketplace_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_marketplace_comment();

COMMIT;

-- Check: security on, and both triggers in place
SELECT
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.marketplace_comments'::regclass) AS comments_security_on,
  (SELECT count(*) FROM pg_trigger WHERE tgname IN ('marketplace_comment_guard', 'marketplace_comment_notice')) AS triggers_2;
