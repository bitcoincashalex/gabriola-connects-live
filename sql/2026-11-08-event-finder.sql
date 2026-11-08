-- ============================================================================
-- Event finder - Version 1.0.0 - 2026-11-08
-- Run in Supabase > SQL Editor (Strachan Family Project = Gabriola Connects).
-- Goes with site version 1.3.80. RUN THIS BEFORE PUSHING.
--
-- What this does:
--   1. event_suggestions: what the event finder found for Alex to review at Admin > Event Finder:
--        new         on another calendar (the Community Hall's for now), not on ours
--        not_listed  on ours at that venue, gone from theirs (often cancelled)
--      Nothing is added or removed until Alex presses a button.
--   2. event_finder_ignores: titles Alex said to always ignore (e.g. a private weekly booking).
--   3. A timer calls /api/cron/event-finder at 7:20 a.m. Gabriola time on Tuesdays and Fridays
--      (14:20 UTC). It copies the secret from the ferry timer. If it can't find it, nothing changes.
--   Only super admins can see or change the suggestions.
-- Safe to run more than once.
--
-- Undo: SELECT cron.unschedule('event-finder');
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.event_suggestions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        text NOT NULL CHECK (kind IN ('new', 'not_listed')),
  source      text NOT NULL,
  source_key  text NOT NULL UNIQUE,         -- so the same thing is only suggested once
  title       text NOT NULL,
  start_date  date NOT NULL,
  start_time  time,
  end_time    time,
  is_all_day  boolean NOT NULL DEFAULT false,
  location    text,
  event_id    uuid,                         -- not_listed: our event
  status      text NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'added', 'ignored', 'hidden', 'kept')),
  decided_by  uuid,
  decided_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS event_suggestions_pending_idx ON public.event_suggestions (status, start_date);

CREATE TABLE IF NOT EXISTS public.event_finder_ignores (
  source     text NOT NULL,
  title_key  text NOT NULL,                 -- lower case, punctuation removed
  title      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source, title_key)
);

ALTER TABLE public.event_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_finder_ignores ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.event_suggestions FROM anon, authenticated;
REVOKE ALL ON public.event_finder_ignores FROM anon, authenticated;
GRANT SELECT, UPDATE ON public.event_suggestions TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.event_finder_ignores TO authenticated;

DROP POLICY IF EXISTS "Super admins read suggestions" ON public.event_suggestions;
CREATE POLICY "Super admins read suggestions" ON public.event_suggestions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_super_admin IS TRUE));
DROP POLICY IF EXISTS "Super admins decide suggestions" ON public.event_suggestions;
CREATE POLICY "Super admins decide suggestions" ON public.event_suggestions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_super_admin IS TRUE))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_super_admin IS TRUE));

DROP POLICY IF EXISTS "Super admins manage ignores" ON public.event_finder_ignores;
CREATE POLICY "Super admins manage ignores" ON public.event_finder_ignores FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_super_admin IS TRUE))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_super_admin IS TRUE));

-- Timer
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

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'event-finder') THEN
    PERFORM cron.unschedule('event-finder');
  END IF;

  PERFORM cron.schedule(
    'event-finder',
    '20 14 * * 2,5',
    format($cmd$
      SELECT net.http_get(
        url := 'https://www.gabriolaconnects.ca/api/cron/event-finder',
        headers := jsonb_build_object('Authorization', %L),
        timeout_milliseconds := 60000
      );
    $cmd$, 'Bearer ' || secret)
  );
END $$;

COMMIT;

-- Check: the timer should show the same fingerprint as the ferry timer
SELECT jobname, schedule, active, md5(substring(command from 'Bearer ([^''"]+)')) AS secret_fingerprint
FROM cron.job
WHERE jobname = 'event-finder' OR command ILIKE '%/api/cron/ferry%';
