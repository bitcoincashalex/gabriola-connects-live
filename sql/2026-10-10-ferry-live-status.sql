-- ============================================================================
-- Live ferry status from BC Ferries - Version 1.0.1 - 2026-10-10
-- (1.0.1: Vercel setting is now AUTO_ALERT_USER_ID, shared with the notices email reader)
-- Run in Supabase > SQL Editor, in two parts.
--
-- PART 1 creates the tables. Run it as is.
-- PART 2 starts the 5-minute timer. Before running it, replace
--   PASTE_CRON_SECRET_HERE with the same secret you put in Vercel as CRON_SECRET.
-- ============================================================================


-- =============================== PART 1 =====================================

-- One row per sailing per day, as last seen on BC Ferries Current Conditions
CREATE TABLE IF NOT EXISTS public.ferry_live_sailings (
  route            text        NOT NULL,             -- 'NAH-GAB' (Nanaimo Harbour to Gabriola)
  sailing_date     date        NOT NULL,             -- Gabriola date
  scheduled_time   time        NOT NULL,
  actual_departure time,
  delay_minutes    integer,
  status           text        NOT NULL,             -- departed | upcoming | cancelled | other
  status_text      text,
  reason           text,
  vessel           text,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (route, sailing_date, scheduled_time)
);

-- One row per route: when we last checked and what BC Ferries said
CREATE TABLE IF NOT EXISTS public.ferry_live_meta (
  route            text        PRIMARY KEY,
  last_checked_at  timestamptz,
  last_success_at  timestamptz,
  bc_last_updated  text,                              -- BC Ferries' own "Last updated" time
  notices          jsonb       NOT NULL DEFAULT '[]'::jsonb,
  last_error       text
);

-- Remembers which automatic alerts were already posted, so nothing posts twice
CREATE TABLE IF NOT EXISTS public.ferry_auto_alerts (
  alert_key   text        PRIMARY KEY,
  alert_id    uuid,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Anyone can read live status; only the server (service role) can write it
ALTER TABLE public.ferry_live_sailings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ferry_live_meta     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ferry_auto_alerts   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read live sailings" ON public.ferry_live_sailings;
CREATE POLICY "Public can read live sailings" ON public.ferry_live_sailings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can read live meta" ON public.ferry_live_meta;
CREATE POLICY "Public can read live meta" ON public.ferry_live_meta FOR SELECT USING (true);
-- ferry_auto_alerts: no policies = no public access at all

-- Keep two weeks of history, delete older rows
CREATE OR REPLACE FUNCTION public.cleanup_ferry_live_sailings()
 RETURNS void LANGUAGE sql AS $$
  DELETE FROM public.ferry_live_sailings WHERE sailing_date < (now() AT TIME ZONE 'America/Vancouver')::date - 14;
  DELETE FROM public.ferry_auto_alerts WHERE created_at < now() - interval '14 days';
$$;

-- Shows the user ids of super admins. Put YOUR id into Vercel as AUTO_ALERT_USER_ID
-- (automatic alerts need an "issued by" user; they also say "on behalf of BC Ferries").
SELECT id, full_name, email FROM public.users WHERE is_super_admin = true;


-- =============================== PART 2 =====================================
-- First: Supabase > Database > Extensions, turn on pg_cron and pg_net.
-- Then replace PASTE_CRON_SECRET_HERE below and run this part.

-- SELECT cron.unschedule('ferry-status-check');   -- uncomment to remove/replace the job

SELECT cron.schedule(
  'ferry-status-check',
  '*/5 * * * *',
  $$
  SELECT net.http_get(
    url := 'https://www.gabriolaconnects.ca/api/cron/ferry-status',
    headers := jsonb_build_object('Authorization', 'Bearer PASTE_CRON_SECRET_HERE'),
    timeout_milliseconds := 30000
  );
  $$
);

SELECT cron.schedule('ferry-status-cleanup', '15 11 * * *', $$ SELECT public.cleanup_ferry_live_sailings(); $$);

-- Check: should list both jobs
SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE 'ferry-status%';
