-- ============================================================================
-- Automatic alerts are posted by the Gabriola Connects Claude account - Version 1.0.0 - 2026-11-17
-- Run in Supabase > SQL Editor (Strachan Family Project = Gabriola Connects).
-- No site code change. Do this together with the Vercel setting below.
--
-- The automatic alerts (BC Ferries status and service notices, BC Hydro outages, and notices read
-- from the notices email) were posted under Alex's account, because Vercel's AUTO_ALERT_USER_ID
-- setting held Alex's id. They should show as posted by the Gabriola Connects Claude account
-- (713881fc-2506-490c-8d72-4c6205bd1093).
--
-- 1. In Vercel > gabriola-connects > Settings > Environment Variables, change AUTO_ALERT_USER_ID to
--      713881fc-2506-490c-8d72-4c6205bd1093
--    then Deployments > the latest one > Redeploy (a setting change only applies after a redeploy).
-- 2. Run this, to move the automatic alerts already posted over to the Claude account.
--    Only alerts the automatic checks posted are changed (the ones they keep track of); alerts
--    anyone posted by hand are not touched. The alert audit log doesn't record this (it doesn't
--    track who an alert is "issued by").
-- Safe to run more than once.
-- ============================================================================

BEGIN;

UPDATE public.alerts a
SET issued_by = '713881fc-2506-490c-8d72-4c6205bd1093'
WHERE a.issued_by IS DISTINCT FROM '713881fc-2506-490c-8d72-4c6205bd1093'
  AND a.id IN (
    SELECT alert_id FROM public.ferry_auto_alerts WHERE alert_id IS NOT NULL
    UNION SELECT alert_id FROM public.hydro_outages WHERE alert_id IS NOT NULL
    UNION SELECT alert_id FROM public.inbound_notices WHERE alert_id IS NOT NULL
  );

COMMIT;

-- Check: automatic alerts by who posted them (should all be the Claude account)
SELECT COALESCE(NULLIF(trim(u.full_name), ''), u.email) AS posted_by, count(*)
FROM public.alerts a
LEFT JOIN public.users u ON u.id = a.issued_by
WHERE a.id IN (
  SELECT alert_id FROM public.ferry_auto_alerts
  UNION SELECT alert_id FROM public.hydro_outages
  UNION SELECT alert_id FROM public.inbound_notices
)
GROUP BY 1;
