-- ============================================================================
-- Weekly email update - Version 1.0.0 - 2026-11-02
-- Run in Supabase > SQL Editor (Strachan Family Project = Gabriola Connects).
-- Goes with site version 1.3.62. RUN THIS BEFORE PUSHING.
--
-- What this does:
--   1. users.digest_email: members tick "Weekly Email Update" on their profile to get it.
--      Off for everyone until they tick it (nobody gets it without choosing to).
--   2. users.digest_last_sent_at: so each member gets at most one a week.
--   3. A timer calls /api/cron/weekly-digest every 10 minutes from 7:00 to 8:59 a.m. Gabriola
--      time on Fridays (14:00-15:59 UTC), so a long list goes out in batches of 40.
--      It copies the secret from the ferry timer. If it can't find it, nothing is changed.
-- Safe to run more than once.
--
-- Undo: SELECT cron.unschedule('weekly-digest');
-- ============================================================================

BEGIN;

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS digest_email boolean NOT NULL DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS digest_last_sent_at timestamptz;

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

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-digest') THEN
    PERFORM cron.unschedule('weekly-digest');
  END IF;

  PERFORM cron.schedule(
    'weekly-digest',
    '*/10 14-15 * * 5',
    format($cmd$
      SELECT net.http_get(
        url := 'https://www.gabriolaconnects.ca/api/cron/weekly-digest',
        headers := jsonb_build_object('Authorization', %L),
        timeout_milliseconds := 60000
      );
    $cmd$, 'Bearer ' || secret)
  );
END $$;

COMMIT;

-- Check 1: should show 0 (nobody has it on yet)
SELECT count(*) FILTER (WHERE digest_email) AS weekly_email_on FROM public.users;

-- Check 2: the new timer should show the same fingerprint as the ferry timer
SELECT jobname, schedule, active, md5(substring(command from 'Bearer ([^''"]+)')) AS secret_fingerprint
FROM cron.job
WHERE jobname = 'weekly-digest' OR command ILIKE '%/api/cron/ferry%';
