-- ============================================================================
-- Alert notifications by email and site inbox - Version 1.0.0 - 2026-10-22
-- Run in Supabase > SQL Editor (Strachan Family Project = Gabriola Connects).
-- Goes with site version 1.3.52. RUN THIS BEFORE PUSHING.
--
-- What this does:
--   1. Members' choices on Edit Profile > Notification Preferences now do something:
--      each new alert goes to members who ticked its level (Info, Advisory, Warning,
--      Emergency) by the ways they ticked (email, site inbox).
--   2. Email only goes to members who have SAVED their notification choices. The page used
--      to show Email as ticked for everyone, so a member who never chose isn't emailed.
--      If this database can tell who already saved (see Check 1), they keep their choice.
--   3. An alert is sent once, when it goes up, and again only if it is raised to a higher
--      level. Updates (like the power outage numbers changing) and "Power restored" don't
--      send anything.
--   4. Every alert email has a "stop these emails" link (private table alert_email_tokens).
--   5. Alerts that already exist are marked as sent, so nothing old goes out.
--   6. A timer calls /api/cron/alert-notifications every minute. It copies the secret from
--      the ferry timer. If it can't find it, nothing in this file is changed.
-- Safe to run more than once.
--
-- Undo: SELECT cron.unschedule('alert-notifications');
--       DROP FUNCTION IF EXISTS public.queue_alert_notifications(), public.alert_severity_rank(text);
--       DROP TABLE IF EXISTS public.alert_deliveries, public.alert_email_tokens;
-- ============================================================================

BEGIN;

-- 1. Members' settings ----------------------------------------------------------------------
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notify_email boolean;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notify_inbox boolean NOT NULL DEFAULT false;

-- Private "stop alert emails" link codes, one per member (only the site's server can read them)
CREATE TABLE IF NOT EXISTS public.alert_email_tokens (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  token   uuid NOT NULL UNIQUE DEFAULT gen_random_uuid()
);
ALTER TABLE public.alert_email_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.alert_email_tokens FROM anon, authenticated;

-- notify_prefs_saved_at: set when a member saves Notification Preferences.
-- First run only: if notify_email has no default, a value in it means the member saved it.
DO $$
DECLARE
  has_default boolean;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'notify_prefs_saved_at') THEN
    ALTER TABLE public.users ADD COLUMN notify_prefs_saved_at timestamptz;

    SELECT column_default IS NOT NULL INTO has_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'notify_email';

    IF NOT has_default THEN
      UPDATE public.users SET notify_prefs_saved_at = COALESCE(updated_at, now())
      WHERE notify_email IS NOT NULL;
    END IF;
  END IF;
END $$;

-- 2. Alerts remember the level they were last sent at ----------------------------------------
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS notified_severity text;
UPDATE public.alerts SET notified_severity = severity WHERE notified_severity IS NULL;

CREATE OR REPLACE FUNCTION public.alert_severity_rank(p text)
RETURNS integer
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE p WHEN 'info' THEN 1 WHEN 'advisory' THEN 2 WHEN 'warning' THEN 3 WHEN 'emergency' THEN 4 ELSE 0 END;
$$;

-- 3. Emails waiting to go out (only the site's server can see this table) --------------------
CREATE TABLE IF NOT EXISTS public.alert_deliveries (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id   uuid NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  severity   text NOT NULL,
  status     text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  attempts   integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at    timestamptz,
  UNIQUE (alert_id, user_id, severity)
);
CREATE INDEX IF NOT EXISTS alert_deliveries_pending_idx ON public.alert_deliveries (created_at) WHERE status = 'pending';
ALTER TABLE public.alert_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.alert_deliveries FROM anon, authenticated;

-- 4. Find new (or raised) alerts: send inbox messages now, queue the emails -------------------
-- Called by the site's server every minute. Returns how many alerts it handled.
CREATE OR REPLACE FUNCTION public.queue_alert_notifications()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  sender  uuid := '713881fc-2506-490c-8d72-4c6205bd1093';  -- Gabriola Connects
  a       record;
  m       record;
  conv    uuid;
  label   text;
  msg     text;
  handled integer := 0;
BEGIN
  FOR a IN
    SELECT al.* FROM public.alerts al
    WHERE al.active IS TRUE
      AND (al.expires_at IS NULL OR al.expires_at > now())
      AND public.alert_severity_rank(al.severity) > public.alert_severity_rank(al.notified_severity)
    ORDER BY al.created_at
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.alerts SET notified_severity = a.severity WHERE id = a.id;
    handled := handled + 1;

    label := CASE a.severity WHEN 'emergency' THEN 'Emergency' WHEN 'warning' THEN 'Warning'
                             WHEN 'advisory' THEN 'Advisory' ELSE 'Info' END;
    msg := label || ' alert: ' || a.title || E'\n\n' || COALESCE(a.message, '')
        || E'\n\nYou get these because of your Notification Preferences on your profile.';

    FOR m IN
      SELECT u.id, COALESCE(u.notify_inbox, false) AS inbox,
             (u.notify_prefs_saved_at IS NOT NULL AND u.notify_email IS TRUE AND u.email IS NOT NULL) AS email
      FROM public.users u
      WHERE u.id <> sender
        AND a.severity IN (SELECT jsonb_array_elements_text(
              COALESCE(to_jsonb(u.alert_subscriptions), '["warning", "emergency"]'::jsonb)))
        AND (COALESCE(u.notify_inbox, false)
             OR (u.notify_prefs_saved_at IS NOT NULL AND u.notify_email IS TRUE AND u.email IS NOT NULL))
    LOOP
      IF m.email THEN
        INSERT INTO public.alert_email_tokens (user_id) VALUES (m.id) ON CONFLICT (user_id) DO NOTHING;
        INSERT INTO public.alert_deliveries (alert_id, user_id, severity)
        VALUES (a.id, m.id, a.severity)
        ON CONFLICT (alert_id, user_id, severity) DO NOTHING;
      END IF;

      IF m.inbox AND NOT EXISTS (
        SELECT 1 FROM public.message_settings s WHERE s.user_id = m.id AND s.allow_messages_from = 'nobody'
      ) THEN
        conv := NULL;
        SELECT c.id INTO conv FROM public.message_conversations c
        WHERE (c.participant_1 = sender AND c.participant_2 = m.id)
           OR (c.participant_1 = m.id AND c.participant_2 = sender)
        LIMIT 1;
        IF conv IS NULL THEN
          INSERT INTO public.message_conversations (participant_1, participant_2, last_message_at)
          VALUES (sender, m.id, now()) RETURNING id INTO conv;
        ELSE
          UPDATE public.message_conversations SET last_message_at = now() WHERE id = conv;
        END IF;
        INSERT INTO public.private_messages (sender_id, receiver_id, message, conversation_id, read, link_url)
        VALUES (sender, m.id, msg, conv, false, 'https://www.gabriolaconnects.ca/alerts');
      END IF;
    END LOOP;
  END LOOP;

  RETURN handled;
END;
$$;
REVOKE ALL ON FUNCTION public.queue_alert_notifications() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.queue_alert_notifications() TO service_role;

-- 5. The every-minute timer ----------------------------------------------------------------
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

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'alert-notifications') THEN
    PERFORM cron.unschedule('alert-notifications');
  END IF;

  PERFORM cron.schedule(
    'alert-notifications',
    '* * * * *',
    format($cmd$
      SELECT net.http_get(
        url := 'https://www.gabriolaconnects.ca/api/cron/alert-notifications',
        headers := jsonb_build_object('Authorization', %L),
        timeout_milliseconds := 55000
      );
    $cmd$, 'Bearer ' || secret)
  );
END $$;

COMMIT;

-- Check 1: members whose email choice carried over (saved before), and members set up for each way
SELECT count(*) FILTER (WHERE notify_prefs_saved_at IS NOT NULL)                    AS saved_choices,
       count(*) FILTER (WHERE notify_prefs_saved_at IS NOT NULL AND notify_email)   AS will_get_email,
       count(*) FILTER (WHERE notify_inbox)                                          AS will_get_inbox,
       count(*)                                                                      AS all_members
FROM public.users;

-- Check 2: the new timer should show the same fingerprint as the ferry timer
SELECT jobname, schedule, active, md5(substring(command from 'Bearer ([^''"]+)')) AS secret_fingerprint
FROM cron.job
WHERE jobname = 'alert-notifications' OR command ILIKE '%/api/cron/ferry%';
