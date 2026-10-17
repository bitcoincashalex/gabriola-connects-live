-- ============================================================================
-- BC Hydro outage alerts - Version 1.0.0 - 2026-10-17
-- Run in Supabase > SQL Editor (Strachan Family Project = Gabriola Connects).
--
-- 1. hydro_outages: remembers which Gabriola outages already have an alert on the site,
--    so each outage gets one alert that is kept up to date. Only the site's server can
--    read or change it.
-- 2. A timer that calls /api/cron/hydro-outages every 5 minutes, using the same secret as
--    the ferry timer (copied over without showing it).
--
-- Undo:
--   SELECT cron.unschedule('hydro-outage-check');
--   DROP TABLE IF EXISTS public.hydro_outages;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.hydro_outages (
  outage_key  text PRIMARY KEY,
  alert_id    uuid,
  area        text,
  customers   integer,
  time_off    text,
  status      text NOT NULL DEFAULT 'current',
  first_seen  timestamptz NOT NULL DEFAULT now(),
  last_seen   timestamptz NOT NULL DEFAULT now(),
  restored_at timestamptz
);

-- Security on with no rules: nobody but the site's server (service role) can read or change it
ALTER TABLE public.hydro_outages ENABLE ROW LEVEL SECURITY;

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
    RAISE EXCEPTION 'Could not find the secret in the ferry timer. The table was not created either; nothing changed.';
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'hydro-outage-check') THEN
    PERFORM cron.unschedule('hydro-outage-check');
  END IF;

  -- Every 5 minutes, offset from the ferry (0) and notices (2) timers
  PERFORM cron.schedule(
    'hydro-outage-check',
    '4-59/5 * * * *',
    format($cmd$
      SELECT net.http_get(
        url := 'https://www.gabriolaconnects.ca/api/cron/hydro-outages',
        headers := jsonb_build_object('Authorization', %L),
        timeout_milliseconds := 30000
      );
    $cmd$, 'Bearer ' || secret)
  );
END $$;

COMMIT;

-- Check: the new timer should show the same fingerprint as the ferry timer
SELECT jobname, schedule, active, md5(substring(command from 'Bearer ([^''"]+)')) AS secret_fingerprint
FROM cron.job
WHERE jobname = 'hydro-outage-check' OR command ILIKE '%/api/cron/ferry%';
