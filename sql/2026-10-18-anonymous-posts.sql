-- ============================================================================
-- Anonymous forum posts that are really anonymous - Version 1.0.0 - 2026-10-18
-- Run in Supabase > SQL Editor (Strachan Family Project = Gabriola Connects).
--
-- The problem: a post or reply marked anonymous hid the name on the page, but every
-- visitor's browser still received the poster's account id and profile photo link, and
-- any photos on it were tagged with the poster's account id. Anyone who looked could work
-- out who wrote it.
--
-- What this does:
--   1. Who wrote each anonymous post/reply is kept in a private table
--      (bbs_anonymous_authors). Nobody can read it through the site, signed in or not.
--      Only a super admin can look up one item's author, one at a time, with
--      admin_anonymous_author().
--   2. Anonymous posts and replies (old and new) are saved with no account id, the name
--      "Island Neighbour", no "deleted by", and photos on them have no uploader.
--      This happens inside the database before the row is saved, so the account id never
--      goes out anywhere, including the live updates the forum page listens to.
--   3. The author can still delete (and edit replies on) their own anonymous items, and
--      still sees them under My Posts. The site asks the database "which anonymous items
--      are mine?" (my_anonymous_items) and only ever gets the signed in person's own.
--   4. Reply notices still reach the author of an anonymous post or reply, and nobody gets
--      a notice about replying to themselves.
--   5. An anonymous item can't be switched back to showing the name by anyone except
--      its author.
--
-- Safe to run more than once. The site code that goes with this is v1.3.37.
-- ============================================================================

BEGIN;

-- 1. Private table: who wrote each anonymous item --------------------------------
CREATE TABLE IF NOT EXISTS public.bbs_anonymous_authors (
  item_type  text NOT NULL CHECK (item_type IN ('post', 'reply')),
  item_id    uuid NOT NULL,
  user_id    uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (item_type, item_id)
);
CREATE INDEX IF NOT EXISTS bbs_anonymous_authors_user_idx ON public.bbs_anonymous_authors (user_id);
ALTER TABLE public.bbs_anonymous_authors ENABLE ROW LEVEL SECURITY;   -- no rules = nobody through the site
REVOKE ALL ON public.bbs_anonymous_authors FROM anon, authenticated;

-- Anonymous rows have no account id from now on
ALTER TABLE public.bbs_posts        ALTER COLUMN user_id     DROP NOT NULL;
ALTER TABLE public.bbs_replies      ALTER COLUMN user_id     DROP NOT NULL;
ALTER TABLE public.bbs_post_images  ALTER COLUMN uploaded_by DROP NOT NULL;
ALTER TABLE public.bbs_reply_images ALTER COLUMN uploaded_by DROP NOT NULL;

-- 2. Helpers -----------------------------------------------------------------------

-- Who wrote it (used only inside the database; nobody on the site can call it)
CREATE OR REPLACE FUNCTION public.bbs_anonymous_author(p_type text, p_id uuid)
RETURNS uuid
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
  SELECT user_id FROM public.bbs_anonymous_authors WHERE item_type = p_type AND item_id = p_id;
$$;
REVOKE ALL ON FUNCTION public.bbs_anonymous_author(text, uuid) FROM PUBLIC, anon, authenticated;

-- "Did I write this?" - only ever answers about the person asking
-- (VOLATILE on purpose: it has to see the private row saved a moment earlier in the same insert)
CREATE OR REPLACE FUNCTION public.bbs_is_my_anonymous(p_type text, p_id uuid)
RETURNS boolean
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.bbs_anonymous_authors
    WHERE item_type = p_type AND item_id = p_id AND user_id = auth.uid()
  );
$$;
REVOKE ALL ON FUNCTION public.bbs_is_my_anonymous(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bbs_is_my_anonymous(text, uuid) TO authenticated;

-- The signed in person's own anonymous items (for My Posts and the delete/edit buttons)
CREATE OR REPLACE FUNCTION public.my_anonymous_items()
RETURNS TABLE (item_type text, item_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT a.item_type, a.item_id FROM public.bbs_anonymous_authors a WHERE a.user_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.my_anonymous_items() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_anonymous_items() TO authenticated;

-- Super admin only: who wrote one anonymous item (for moderation)
CREATE OR REPLACE FUNCTION public.admin_anonymous_author(p_type text, p_id uuid)
RETURNS TABLE (user_id uuid, full_name text, email text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_super_admin IS TRUE) THEN
    RAISE EXCEPTION 'Only a super admin can see who wrote an anonymous post';
  END IF;
  RETURN QUERY
    SELECT u.id, u.full_name, u.email
    FROM public.bbs_anonymous_authors a JOIN public.users u ON u.id = a.user_id
    WHERE a.item_type = p_type AND a.item_id = p_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_anonymous_author(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_anonymous_author(text, uuid) TO authenticated;

-- 3. Move the existing anonymous items over ------------------------------------------
INSERT INTO public.bbs_anonymous_authors (item_type, item_id, user_id)
SELECT 'post', id, user_id FROM public.bbs_posts WHERE is_anonymous IS TRUE AND user_id IS NOT NULL
ON CONFLICT (item_type, item_id) DO NOTHING;

INSERT INTO public.bbs_anonymous_authors (item_type, item_id, user_id)
SELECT 'reply', id, user_id FROM public.bbs_replies WHERE is_anonymous IS TRUE AND user_id IS NOT NULL
ON CONFLICT (item_type, item_id) DO NOTHING;

-- "Deleted by" the author would give them away (only if the table has that column)
DO $$
DECLARE t text; k text;
BEGIN
  FOR t, k IN VALUES ('bbs_posts', 'post'), ('bbs_replies', 'reply') LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = t AND column_name = 'deleted_by') THEN
      EXECUTE format(
        'UPDATE public.%I x SET deleted_by = NULL FROM public.bbs_anonymous_authors a
         WHERE a.item_type = %L AND a.item_id = x.id AND x.deleted_by = a.user_id', t, k);
    END IF;
  END LOOP;
END $$;

UPDATE public.bbs_posts p
SET user_id = NULL, display_name = 'Island Neighbour'
FROM public.bbs_anonymous_authors a
WHERE a.item_type = 'post' AND a.item_id = p.id AND p.is_anonymous IS TRUE;

UPDATE public.bbs_replies r
SET user_id = NULL, display_name = 'Island Neighbour'
FROM public.bbs_anonymous_authors a
WHERE a.item_type = 'reply' AND a.item_id = r.id AND r.is_anonymous IS TRUE;

UPDATE public.bbs_post_images i SET uploaded_by = NULL
WHERE uploaded_by IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.bbs_anonymous_authors a WHERE a.item_type = 'post' AND a.item_id = i.post_id);

UPDATE public.bbs_reply_images i SET uploaded_by = NULL
WHERE uploaded_by IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.bbs_anonymous_authors a WHERE a.item_type = 'reply' AND a.item_id = i.reply_id);

-- 4. From now on: strip the account id before anything is saved -----------------------
CREATE OR REPLACE FUNCTION public.bbs_keep_anonymous()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  kind   text := CASE TG_TABLE_NAME WHEN 'bbs_posts' THEN 'post' ELSE 'reply' END;
  author uuid;
BEGIN
  IF NEW.is_anonymous IS TRUE THEN
    IF NEW.user_id IS NOT NULL THEN
      -- New anonymous item, or an item being made anonymous: remember the author privately
      INSERT INTO public.bbs_anonymous_authors (item_type, item_id, user_id)
      VALUES (kind, NEW.id, NEW.user_id)
      ON CONFLICT (item_type, item_id) DO UPDATE SET user_id = EXCLUDED.user_id;
      NEW.user_id := NULL;
    END IF;
    NEW.display_name := 'Island Neighbour';
    author := public.bbs_anonymous_author(kind, NEW.id);
    -- "Deleted by" the author would give them away
    IF (to_jsonb(NEW) ->> 'deleted_by') IS NOT NULL AND (to_jsonb(NEW) ->> 'deleted_by')::uuid = author THEN
      NEW := jsonb_populate_record(NEW, '{"deleted_by": null}'::jsonb);
    END IF;

  ELSIF TG_OP = 'UPDATE' AND OLD.is_anonymous IS TRUE THEN
    -- Showing the name again: only the author can do that (or the SQL editor)
    author := public.bbs_anonymous_author(kind, NEW.id);
    IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM author THEN
      RAISE EXCEPTION 'Only the author can remove anonymity from a post';
    END IF;
    NEW.user_id := COALESCE(NEW.user_id, author);
    DELETE FROM public.bbs_anonymous_authors WHERE item_type = kind AND item_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.bbs_keep_anonymous() FROM PUBLIC, anon, authenticated;

-- "zz_" so it runs after any other before-save trigger on these tables
DROP TRIGGER IF EXISTS zz_bbs_keep_anonymous ON public.bbs_posts;
CREATE TRIGGER zz_bbs_keep_anonymous BEFORE INSERT OR UPDATE ON public.bbs_posts
  FOR EACH ROW EXECUTE FUNCTION public.bbs_keep_anonymous();
DROP TRIGGER IF EXISTS zz_bbs_keep_anonymous ON public.bbs_replies;
CREATE TRIGGER zz_bbs_keep_anonymous BEFORE INSERT OR UPDATE ON public.bbs_replies
  FOR EACH ROW EXECUTE FUNCTION public.bbs_keep_anonymous();

-- Photos on an anonymous item: no uploader
CREATE OR REPLACE FUNCTION public.bbs_keep_anonymous_images()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'bbs_post_images' THEN
    IF EXISTS (SELECT 1 FROM public.bbs_anonymous_authors WHERE item_type = 'post' AND item_id = NEW.post_id) THEN
      NEW.uploaded_by := NULL;
    END IF;
  ELSE
    IF EXISTS (SELECT 1 FROM public.bbs_anonymous_authors WHERE item_type = 'reply' AND item_id = NEW.reply_id) THEN
      NEW.uploaded_by := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.bbs_keep_anonymous_images() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS zz_bbs_keep_anonymous_images ON public.bbs_post_images;
CREATE TRIGGER zz_bbs_keep_anonymous_images BEFORE INSERT OR UPDATE ON public.bbs_post_images
  FOR EACH ROW EXECUTE FUNCTION public.bbs_keep_anonymous_images();
DROP TRIGGER IF EXISTS zz_bbs_keep_anonymous_images ON public.bbs_reply_images;
CREATE TRIGGER zz_bbs_keep_anonymous_images BEFORE INSERT OR UPDATE ON public.bbs_reply_images
  FOR EACH ROW EXECUTE FUNCTION public.bbs_keep_anonymous_images();

-- 5. Rules so the author can still post, delete and edit their anonymous items -------
-- (These are added alongside the existing rules; nothing existing is removed.)
DROP POLICY IF EXISTS "Anonymous author can add" ON public.bbs_posts;
CREATE POLICY "Anonymous author can add" ON public.bbs_posts FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL AND is_anonymous IS TRUE AND public.bbs_is_my_anonymous('post', id));
DROP POLICY IF EXISTS "Anonymous author can see own" ON public.bbs_posts;
CREATE POLICY "Anonymous author can see own" ON public.bbs_posts FOR SELECT TO authenticated
  USING (user_id IS NULL AND public.bbs_is_my_anonymous('post', id));
DROP POLICY IF EXISTS "Anonymous author can change own" ON public.bbs_posts;
CREATE POLICY "Anonymous author can change own" ON public.bbs_posts FOR UPDATE TO authenticated
  USING (user_id IS NULL AND public.bbs_is_my_anonymous('post', id))
  WITH CHECK (public.bbs_is_my_anonymous('post', id) OR user_id = auth.uid());

DROP POLICY IF EXISTS "Anonymous author can add" ON public.bbs_replies;
CREATE POLICY "Anonymous author can add" ON public.bbs_replies FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL AND is_anonymous IS TRUE AND public.bbs_is_my_anonymous('reply', id));
DROP POLICY IF EXISTS "Anonymous author can see own" ON public.bbs_replies;
CREATE POLICY "Anonymous author can see own" ON public.bbs_replies FOR SELECT TO authenticated
  USING (user_id IS NULL AND public.bbs_is_my_anonymous('reply', id));
DROP POLICY IF EXISTS "Anonymous author can change own" ON public.bbs_replies;
CREATE POLICY "Anonymous author can change own" ON public.bbs_replies FOR UPDATE TO authenticated
  USING (user_id IS NULL AND public.bbs_is_my_anonymous('reply', id))
  WITH CHECK (public.bbs_is_my_anonymous('reply', id) OR user_id = auth.uid());

DROP POLICY IF EXISTS "Anonymous author can add photos" ON public.bbs_post_images;
CREATE POLICY "Anonymous author can add photos" ON public.bbs_post_images FOR INSERT TO authenticated
  WITH CHECK (uploaded_by IS NULL AND public.bbs_is_my_anonymous('post', post_id));
DROP POLICY IF EXISTS "Anonymous author can change photos" ON public.bbs_post_images;
CREATE POLICY "Anonymous author can change photos" ON public.bbs_post_images FOR UPDATE TO authenticated
  USING (uploaded_by IS NULL AND public.bbs_is_my_anonymous('post', post_id));
DROP POLICY IF EXISTS "Anonymous author can remove photos" ON public.bbs_post_images;
CREATE POLICY "Anonymous author can remove photos" ON public.bbs_post_images FOR DELETE TO authenticated
  USING (uploaded_by IS NULL AND public.bbs_is_my_anonymous('post', post_id));

DROP POLICY IF EXISTS "Anonymous author can add photos" ON public.bbs_reply_images;
CREATE POLICY "Anonymous author can add photos" ON public.bbs_reply_images FOR INSERT TO authenticated
  WITH CHECK (uploaded_by IS NULL AND public.bbs_is_my_anonymous('reply', reply_id));
DROP POLICY IF EXISTS "Anonymous author can change photos" ON public.bbs_reply_images;
CREATE POLICY "Anonymous author can change photos" ON public.bbs_reply_images FOR UPDATE TO authenticated
  USING (uploaded_by IS NULL AND public.bbs_is_my_anonymous('reply', reply_id));
DROP POLICY IF EXISTS "Anonymous author can remove photos" ON public.bbs_reply_images;
CREATE POLICY "Anonymous author can remove photos" ON public.bbs_reply_images FOR DELETE TO authenticated
  USING (uploaded_by IS NULL AND public.bbs_is_my_anonymous('reply', reply_id));

-- 6. Reply notices: find the real author of anonymous posts/replies (v1.3.0) ------------
CREATE OR REPLACE FUNCTION public.notify_forum_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender      uuid := '713881fc-2506-490c-8d72-4c6205bd1093';  -- Gabriola Connects
  alex        uuid;
  post_title  text;
  post_author uuid;
  parent_author uuid;
  replier     uuid;
  who         text;
  url         text;
  recipient   uuid;
  kind        text;
  conv        uuid;
  sent        uuid[] := ARRAY[]::uuid[];
  msg         text;
BEGIN
  IF NEW.is_active IS FALSE THEN
    RETURN NEW;
  END IF;

  SELECT p.title, COALESCE(p.user_id, public.bbs_anonymous_author('post', p.id))
  INTO post_title, post_author
  FROM public.bbs_posts p WHERE p.id = NEW.post_id;
  IF post_title IS NULL THEN
    RETURN NEW;
  END IF;

  replier := COALESCE(NEW.user_id, public.bbs_anonymous_author('reply', NEW.id));

  SELECT u.id INTO alex FROM public.users u
  WHERE lower(u.email) = 'bitcoincashalex@gmail.com' LIMIT 1;

  IF NEW.parent_reply_id IS NOT NULL THEN
    SELECT COALESCE(r.user_id, public.bbs_anonymous_author('reply', r.id)) INTO parent_author
    FROM public.bbs_replies r WHERE r.id = NEW.parent_reply_id;
  END IF;

  who := CASE WHEN NEW.is_anonymous IS TRUE THEN 'Someone'
              ELSE COALESCE(NULLIF(trim(NEW.display_name), ''), 'Someone') END;
  url := 'https://www.gabriolaconnects.ca/community/thread/' || NEW.post_id || '#reply-' || NEW.id;

  -- Up to two notices: the post's author, then the author of the reply being answered
  FOR recipient, kind IN
    SELECT x.uid, x.kind FROM (VALUES
      (CASE WHEN post_author = sender THEN alex ELSE post_author END,
       CASE WHEN post_author = sender THEN 'news' ELSE 'post' END, 1),
      (CASE WHEN parent_author = sender THEN alex ELSE parent_author END, 'reply', 2)
    ) AS x(uid, kind, ord)
    ORDER BY x.ord
  LOOP
    CONTINUE WHEN recipient IS NULL
               OR recipient = replier
               OR recipient = sender
               OR recipient = ANY(sent);

    -- Respect "Nobody can message me"
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM public.message_settings s
      WHERE s.user_id = recipient AND s.allow_messages_from = 'nobody'
    );

    msg := CASE kind
      WHEN 'news'  THEN who || ' replied to the Island News post "' || post_title || '"'
      WHEN 'reply' THEN who || ' replied to your reply on "' || post_title || '"'
      ELSE              who || ' replied to your post "' || post_title || '"'
    END;

    conv := NULL;
    SELECT c.id INTO conv FROM public.message_conversations c
    WHERE (c.participant_1 = sender AND c.participant_2 = recipient)
       OR (c.participant_1 = recipient AND c.participant_2 = sender)
    LIMIT 1;

    IF conv IS NULL THEN
      INSERT INTO public.message_conversations (participant_1, participant_2, last_message_at)
      VALUES (sender, recipient, now())
      RETURNING id INTO conv;
    ELSE
      UPDATE public.message_conversations SET last_message_at = now() WHERE id = conv;
    END IF;

    INSERT INTO public.private_messages (sender_id, receiver_id, message, conversation_id, read, link_url)
    VALUES (sender, recipient, msg, conv, false, url);

    sent := sent || recipient;
  END LOOP;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- Never stop a reply from being saved because a notice failed
  RAISE WARNING 'forum reply notice not sent: %', SQLERRM;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_forum_reply() FROM PUBLIC;

DROP TRIGGER IF EXISTS forum_reply_notice ON public.bbs_replies;
CREATE TRIGGER forum_reply_notice
  AFTER INSERT ON public.bbs_replies
  FOR EACH ROW EXECUTE FUNCTION public.notify_forum_reply();

COMMIT;

-- Check: every number in the last two columns should be 0
SELECT
  (SELECT count(*) FROM public.bbs_anonymous_authors)                                              AS anonymous_items_protected,
  (SELECT count(*) FROM public.bbs_posts   WHERE is_anonymous IS TRUE AND user_id IS NOT NULL)
+ (SELECT count(*) FROM public.bbs_replies WHERE is_anonymous IS TRUE AND user_id IS NOT NULL)      AS anonymous_items_still_showing_id,
  (SELECT count(*) FROM public.bbs_post_images i JOIN public.bbs_anonymous_authors a
     ON a.item_type = 'post' AND a.item_id = i.post_id WHERE i.uploaded_by IS NOT NULL)
+ (SELECT count(*) FROM public.bbs_reply_images i JOIN public.bbs_anonymous_authors a
     ON a.item_type = 'reply' AND a.item_id = i.reply_id WHERE i.uploaded_by IS NOT NULL)          AS anonymous_photos_still_showing_id;
