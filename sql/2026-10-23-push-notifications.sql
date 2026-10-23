-- ============================================================================
-- Alert push notifications (phone and computer) - Version 1.0.0 - 2026-10-23
-- Run in Supabase > SQL Editor (Strachan Family Project = Gabriola Connects).
-- Goes with site version 1.3.54. RUN THIS BEFORE PUSHING.
-- Needs sql/2026-10-22-alert-notifications.sql (already run).
--
-- What this does:
--   1. push_subscriptions: one row per phone or computer a member turned notifications on for.
--      Members can only see, add and remove their own.
--   2. alert_deliveries gets a channel column ('email' or 'push'), so one alert can be queued
--      for both.
--   3. queue_alert_notifications (version 1.1.0) also queues a push for members who turned
--      them on, at the alert levels they chose. Same rules as email: once when the alert goes
--      up, again only if it is raised.
-- A push only goes to a device where the member said yes to the browser's permission
-- question, so nobody gets them without choosing to. Safe to run more than once.
--
-- Undo: DROP TABLE IF EXISTS public.push_subscriptions; then run
--       sql/2026-10-22-alert-notifications.sql again for the old queue function.
-- ============================================================================

BEGIN;

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notify_push boolean;

-- 1. Devices --------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL DEFAULT auth.uid() REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint        text NOT NULL UNIQUE CHECK (endpoint LIKE 'https://%'),
  p256dh          text NOT NULL,
  auth            text NOT NULL,
  user_agent      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_success_at timestamptz,
  failures        integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.push_subscriptions FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;

DROP POLICY IF EXISTS "Members see their own devices" ON public.push_subscriptions;
CREATE POLICY "Members see their own devices" ON public.push_subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Members add their own devices" ON public.push_subscriptions;
CREATE POLICY "Members add their own devices" ON public.push_subscriptions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Members update their own devices" ON public.push_subscriptions;
CREATE POLICY "Members update their own devices" ON public.push_subscriptions FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Members remove their own devices" ON public.push_subscriptions;
CREATE POLICY "Members remove their own devices" ON public.push_subscriptions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- A browser can hand the same device to a different member who signs in on it later:
-- this lets the site move that device to whoever is signed in now.
CREATE OR REPLACE FUNCTION public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Please sign in first.';
  END IF;
  IF p_endpoint NOT LIKE 'https://%' OR char_length(p_endpoint) > 1000 THEN
    RAISE EXCEPTION 'That device address does not look right.';
  END IF;
  INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  VALUES (auth.uid(), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  ON CONFLICT (endpoint) DO UPDATE
    SET user_id = auth.uid(), p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth,
        user_agent = EXCLUDED.user_agent, failures = 0;
  UPDATE public.users SET notify_push = true WHERE id = auth.uid();
END;
$$;
REVOKE ALL ON FUNCTION public.save_push_subscription(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_push_subscription(text, text, text, text) TO authenticated;

-- 2. One alert can be queued for email and push ----------------------------------------------
ALTER TABLE public.alert_deliveries ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'email';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'alert_deliveries_channel_check') THEN
    ALTER TABLE public.alert_deliveries ADD CONSTRAINT alert_deliveries_channel_check CHECK (channel IN ('email', 'push'));
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'alert_deliveries_alert_id_user_id_severity_key') THEN
    ALTER TABLE public.alert_deliveries DROP CONSTRAINT alert_deliveries_alert_id_user_id_severity_key;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'alert_deliveries_one_per_channel') THEN
    ALTER TABLE public.alert_deliveries ADD CONSTRAINT alert_deliveries_one_per_channel UNIQUE (alert_id, user_id, severity, channel);
  END IF;
END $$;

-- 3. Queue function (version 1.1.0: adds push) -----------------------------------------------
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
             (u.notify_prefs_saved_at IS NOT NULL AND u.notify_email IS TRUE AND u.email IS NOT NULL) AS email,
             (u.notify_push IS NOT FALSE AND EXISTS (SELECT 1 FROM public.push_subscriptions p WHERE p.user_id = u.id)) AS push
      FROM public.users u
      WHERE u.id <> sender
        AND a.severity IN (SELECT jsonb_array_elements_text(
              COALESCE(to_jsonb(u.alert_subscriptions), '["warning", "emergency"]'::jsonb)))
        AND (COALESCE(u.notify_inbox, false)
             OR (u.notify_prefs_saved_at IS NOT NULL AND u.notify_email IS TRUE AND u.email IS NOT NULL)
             OR (u.notify_push IS NOT FALSE AND EXISTS (SELECT 1 FROM public.push_subscriptions p WHERE p.user_id = u.id)))
    LOOP
      IF m.email THEN
        INSERT INTO public.alert_email_tokens (user_id) VALUES (m.id) ON CONFLICT (user_id) DO NOTHING;
        INSERT INTO public.alert_deliveries (alert_id, user_id, severity, channel)
        VALUES (a.id, m.id, a.severity, 'email')
        ON CONFLICT (alert_id, user_id, severity, channel) DO NOTHING;
      END IF;

      IF m.push THEN
        INSERT INTO public.alert_deliveries (alert_id, user_id, severity, channel)
        VALUES (a.id, m.id, a.severity, 'push')
        ON CONFLICT (alert_id, user_id, severity, channel) DO NOTHING;
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

COMMIT;

-- Check: should show  push_subscriptions | 0 devices, and channel column present
SELECT 'push_subscriptions' AS what, count(*) AS devices FROM public.push_subscriptions
UNION ALL
SELECT 'alert_deliveries.channel', count(*) FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'alert_deliveries' AND column_name = 'channel';
