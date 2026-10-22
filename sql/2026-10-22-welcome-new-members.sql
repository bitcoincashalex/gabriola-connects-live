-- ============================================================================
-- Welcome new members - Version 1.0.0 - 2026-10-22
-- Run in Supabase > SQL Editor (Strachan Family Project = Gabriola Connects).
-- Goes with site version 1.3.51. RUN THIS BEFORE PUSHING.
--
-- What this does:
--   1. When someone registers (email or Google), a welcome message from the Gabriola
--      Connects account goes straight into their inbox on the site.
--   2. Adds welcome_email_sent_at to users. Everyone who is already a member is marked as
--      done, so ONLY people who register from now on get the welcome email.
--   3. Adds a timer that calls the site every 5 minutes to email anyone new
--      (/api/cron/welcome-email). It copies the secret from the ferry timer, like the
--      hydro timer did. If the timer can't find it, nothing in this file is changed.
-- Safe to run more than once (members already marked stay marked).
--
-- Undo: SELECT cron.unschedule('welcome-email');
--       DROP TRIGGER IF EXISTS welcome_new_member ON public.users;
--       DROP FUNCTION IF EXISTS public.welcome_new_member();
-- ============================================================================

BEGIN;

-- 1. Who has had the welcome email ----------------------------------------------------------
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS welcome_email_sent_at timestamptz;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS welcome_email_attempts integer NOT NULL DEFAULT 0;

-- Existing members don't get it (only runs on the first run: after that new members are
-- left alone until the site emails them)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE welcome_email_sent_at IS NOT NULL) THEN
    UPDATE public.users SET welcome_email_sent_at = now() WHERE welcome_email_sent_at IS NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS users_welcome_email_pending_idx
  ON public.users (created_at) WHERE welcome_email_sent_at IS NULL;

-- 2. The welcome message in their site inbox -------------------------------------------------
CREATE OR REPLACE FUNCTION public.welcome_new_member()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  sender uuid := '713881fc-2506-490c-8d72-4c6205bd1093';  -- Gabriola Connects
  name   text;
  conv   uuid;
  msg    text;
BEGIN
  IF NEW.id = sender THEN
    RETURN NEW;
  END IF;

  name := COALESCE(NULLIF(trim(NEW.first_name), ''), NULLIF(split_part(trim(NEW.full_name), ' ', 1), ''));
  IF name IS NULL OR lower(name) = 'user' THEN
    name := NULL;
  END IF;

  msg := 'Welcome to Gabriola Connects' || COALESCE(', ' || name, '') || '. '
      || 'This is your first message on the site, and it lives here in your inbox. '
      || 'Members can message each other privately, and this is also where you''ll get a note when someone replies to your post or comments on your listing. '
      || E'\n\n'
      || 'Have a look around. The ferry status, events calendar, island alerts, forum, business directory, Island Map, volunteer listings and Buy, Sell, Rent & Free are all free to use, and I hope you find it useful. '
      || E'\n\n'
      || 'If something doesn''t work the way you expect, or you have an idea that would make it better, email connects@gabriolaconnects.ca and it comes straight to me.'
      || E'\n\n'
      || 'Alex';

  INSERT INTO public.message_conversations (participant_1, participant_2, last_message_at)
  VALUES (sender, NEW.id, now()) RETURNING id INTO conv;

  INSERT INTO public.private_messages (sender_id, receiver_id, message, conversation_id, read, link_url)
  VALUES (sender, NEW.id, msg, conv, false, 'https://www.gabriolaconnects.ca/');

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'welcome message not sent: %', SQLERRM;   -- never blocks a registration
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.welcome_new_member() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS welcome_new_member ON public.users;
CREATE TRIGGER welcome_new_member AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.welcome_new_member();

-- 3. The 5 minute email timer ----------------------------------------------------------------
DO $$
DECLARE
  secret text;
BEGIN
  SELECT substring(command from 'Bearer ([^''"]+)') INTO secret
  FROM cron.job
  WHERE command ILIKE '%/api/cron/ferry%' AND command LIKE '%Bearer %'
  ORDER BY jobid
  LIMIT 1;

  IF secret IS NULL OR secret = 'PASTE_CRON_SECRET_HERE' THEN
    RAISE EXCEPTION 'Could not find the secret in the ferry timer. Nothing was changed.';
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'welcome-email') THEN
    PERFORM cron.unschedule('welcome-email');
  END IF;

  -- Every 5 minutes, offset from the ferry (0), notices (2) and hydro (4) timers
  PERFORM cron.schedule(
    'welcome-email',
    '1-59/5 * * * *',
    format($cmd$
      SELECT net.http_get(
        url := 'https://www.gabriolaconnects.ca/api/cron/welcome-email',
        headers := jsonb_build_object('Authorization', %L),
        timeout_milliseconds := 30000
      );
    $cmd$, 'Bearer ' || secret)
  );
END $$;

COMMIT;

-- Check 1: members already marked done, and members waiting for the email (should be 0 now)
SELECT count(*) FILTER (WHERE welcome_email_sent_at IS NOT NULL) AS already_members,
       count(*) FILTER (WHERE welcome_email_sent_at IS NULL)     AS waiting_for_email
FROM public.users;

-- Check 2: the new timer should show the same fingerprint as the ferry timer
SELECT jobname, schedule, active, md5(substring(command from 'Bearer ([^''"]+)')) AS secret_fingerprint
FROM cron.job
WHERE jobname = 'welcome-email' OR command ILIKE '%/api/cron/ferry%';
