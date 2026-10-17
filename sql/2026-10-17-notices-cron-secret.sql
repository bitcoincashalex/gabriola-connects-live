-- ============================================================================
-- Notices email timer: use the same secret as the ferry timer - Version 1.0.0 - 2026-10-17
-- Run in Supabase > SQL Editor (Strachan Family Project = Gabriola Connects).
--
-- The notices-email-check timer was being turned away with "Unauthorized" because the
-- secret in it doesn't match Vercel's CRON_SECRET. The ferry timer uses the right one.
-- This copies the ferry timer's secret into the notices timer. The secret is never shown.
-- ============================================================================

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

  PERFORM cron.unschedule('notices-email-check');
  PERFORM cron.schedule(
    'notices-email-check',
    '2-59/5 * * * *',
    format($cmd$
      SELECT net.http_get(
        url := 'https://www.gabriolaconnects.ca/api/cron/notices-email',
        headers := jsonb_build_object('Authorization', %L),
        timeout_milliseconds := 60000
      );
    $cmd$, 'Bearer ' || secret)
  );
  RAISE NOTICE 'Notices timer now uses the same secret as the ferry timer.';
END $$;

-- Check: both timers should show the same fingerprint (the secret itself is not shown)
SELECT jobname, active, md5(substring(command from 'Bearer ([^''"]+)')) AS secret_fingerprint
FROM cron.job
WHERE jobname = 'notices-email-check' OR command ILIKE '%/api/cron/ferry%';
