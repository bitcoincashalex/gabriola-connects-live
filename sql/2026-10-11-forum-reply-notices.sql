-- ============================================================================
-- Forum reply notices - Version 1.2.0 - 2026-10-11
-- 1.2.0: the link in each notice goes straight to the new reply (thread address + #reply-<id>).
--        Safe to run again over 1.0 or 1.1.
-- Run in Supabase > SQL Editor. Runs as one unit: if anything fails, nothing changes.
--
-- 1. Renames the Claude account to "Gabriola Connects" (the account that sends notices),
--    and changes the author name on its posts and replies already posted from "Claude"
--    to "Gabriola Connects". The "Summary written by Claude..." line in each post is not changed.
-- 2. When someone replies on the forum, sends a private message from Gabriola Connects to:
--      - the author of the post
--      - the author of the reply being answered (for a reply to a reply)
--    Replies to Island News posts (posted by the Gabriola Connects/Claude account) notify Alex.
--    Nobody is notified about their own reply, and nobody gets two notices for one reply.
--    People whose message setting is "Nobody" are not sent notices.
--    If a notice can't be sent for any reason, the reply is still saved.
--
-- Undo:
--   DROP TRIGGER IF EXISTS forum_reply_notice ON public.bbs_replies;
--   DROP FUNCTION IF EXISTS public.notify_forum_reply();
-- ============================================================================

BEGIN;

-- 1. The sending account's name
UPDATE public.users
SET full_name = 'Gabriola Connects',
    first_name = 'Gabriola Connects'
WHERE id = '713881fc-2506-490c-8d72-4c6205bd1093';

UPDATE public.bbs_posts
SET display_name = 'Gabriola Connects'
WHERE user_id = '713881fc-2506-490c-8d72-4c6205bd1093' AND display_name = 'Claude';

UPDATE public.bbs_replies
SET display_name = 'Gabriola Connects'
WHERE user_id = '713881fc-2506-490c-8d72-4c6205bd1093' AND display_name = 'Claude';

-- 2. The notice
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

  SELECT p.title, p.user_id INTO post_title, post_author
  FROM public.bbs_posts p WHERE p.id = NEW.post_id;
  IF post_title IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT u.id INTO alex FROM public.users u
  WHERE lower(u.email) = 'bitcoincashalex@gmail.com' LIMIT 1;

  IF NEW.parent_reply_id IS NOT NULL THEN
    SELECT r.user_id INTO parent_author FROM public.bbs_replies r WHERE r.id = NEW.parent_reply_id;
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
               OR recipient = NEW.user_id
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

-- Check: should show the renamed account, 0 posts still named Claude, and the new trigger
SELECT full_name FROM public.users WHERE id = '713881fc-2506-490c-8d72-4c6205bd1093';
SELECT count(*) AS posts_still_named_claude FROM public.bbs_posts
WHERE user_id = '713881fc-2506-490c-8d72-4c6205bd1093' AND display_name = 'Claude';
SELECT tgname FROM pg_trigger WHERE tgname = 'forum_reply_notice';
