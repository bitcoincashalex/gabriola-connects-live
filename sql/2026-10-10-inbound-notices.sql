-- ============================================================================
-- Notices email reader (notices@gabriolaconnects.ca) - Version 1.0.0 - 2026-10-10
-- Run in Supabase > SQL Editor AFTER 2026-10-10-ferry-live-status.sql
-- (that file turns on pg_cron / pg_net and creates the ferry timer).
-- Before running: replace PASTE_CRON_SECRET_HERE with the same CRON_SECRET.
-- ============================================================================

-- Every email that arrives at notices@ is logged here with the AI's decision
CREATE TABLE IF NOT EXISTS public.inbound_notices (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id      text        NOT NULL UNIQUE,
  received_at     timestamptz,
  from_address    text,
  from_domain     text,
  subject         text,
  body_excerpt    text,
  sender_trusted  boolean     NOT NULL DEFAULT false,
  auth_summary    text,                         -- how the sender was (or wasn't) verified
  ai              jsonb,                        -- AI decision, proposed title/message, etc.
  status          text        NOT NULL,         -- published | held | ignored | dismissed | error
  alert_id        uuid,
  error           text,
  attempts        integer     NOT NULL DEFAULT 0,
  reviewed_at     timestamptz,
  reviewed_by     uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inbound_notices_status ON public.inbound_notices (status, created_at DESC);

-- Only super admins can see or review these (the server writes with the service role)
ALTER TABLE public.inbound_notices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins read inbound notices" ON public.inbound_notices;
CREATE POLICY "Super admins read inbound notices" ON public.inbound_notices
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_super_admin = true));

DROP POLICY IF EXISTS "Super admins review inbound notices" ON public.inbound_notices;
CREATE POLICY "Super admins review inbound notices" ON public.inbound_notices
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_super_admin = true));

-- Check the mailbox every 5 minutes (offset by 2 minutes from the ferry check)
-- SELECT cron.unschedule('notices-email-check');   -- uncomment to remove/replace the job
SELECT cron.schedule(
  'notices-email-check',
  '2-59/5 * * * *',
  $$
  SELECT net.http_get(
    url := 'https://www.gabriolaconnects.ca/api/cron/notices-email',
    headers := jsonb_build_object('Authorization', 'Bearer PASTE_CRON_SECRET_HERE'),
    timeout_milliseconds := 60000
  );
  $$
);

-- Check: should list the job
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'notices-email-check';
