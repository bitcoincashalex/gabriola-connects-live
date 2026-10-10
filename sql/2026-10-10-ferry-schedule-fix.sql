-- ============================================================================
-- Ferry schedule corrections - 2026-10-10
-- Run in Supabase > SQL Editor. Matches the BC Ferries Route 19 schedule
-- effective April 1, 2025 (until further notice). Nanaimo departures were
-- confirmed against BC Ferries Current Conditions for Fri Oct 9, 2026.
-- Gabriola departures are from the Gabriola FAC copy of that schedule.
-- ============================================================================

BEGIN;

-- 1. 6:35 am from Nanaimo does not exist in the schedule
UPDATE ferry_schedule SET is_active = false, updated_at = now()
WHERE departure_terminal = 'Nanaimo' AND departure_time = '06:35:00';

-- 2. Last Gabriola sailing is 11:00 pm, not 11:05 pm
UPDATE ferry_schedule SET departure_time = '23:00:00', arrival_time = '23:20:00', updated_at = now()
WHERE departure_terminal = 'Gabriola' AND departure_time = '23:05:00';

-- 3. Monday to Friday only: 5:15 am and 7:05 am from Gabriola, 5:45 am from Nanaimo
UPDATE ferry_schedule SET operates_saturday = false, operates_sunday = false, updated_at = now()
WHERE (departure_terminal = 'Gabriola' AND departure_time IN ('05:15:00', '07:05:00'))
   OR (departure_terminal = 'Nanaimo'  AND departure_time = '05:45:00');

-- 4. Daily except Sundays: 7:35 am from Gabriola, 6:55 am and 7:35 am from Nanaimo
UPDATE ferry_schedule SET operates_sunday = false, updated_at = now()
WHERE (departure_terminal = 'Gabriola' AND departure_time = '07:35:00')
   OR (departure_terminal = 'Nanaimo'  AND departure_time IN ('06:55:00', '07:35:00'));

-- 5. Wednesdays: dangerous cargo only (no passengers or other vehicles) on
--    5:55 pm from Gabriola and 10:35 am from Nanaimo; and no 11:00 pm from
--    Gabriola or 10:30 pm from Nanaimo. Treated as not running for the public.
UPDATE ferry_schedule SET operates_wednesday = false, updated_at = now()
WHERE (departure_terminal = 'Gabriola' AND departure_time IN ('17:55:00', '23:00:00'))
   OR (departure_terminal = 'Nanaimo'  AND departure_time IN ('10:35:00', '22:30:00'));

COMMIT;

-- Check: should show 24 active from Gabriola and 23 from Nanaimo
SELECT departure_terminal, count(*) FILTER (WHERE is_active) AS active_sailings
FROM ferry_schedule GROUP BY departure_terminal;
