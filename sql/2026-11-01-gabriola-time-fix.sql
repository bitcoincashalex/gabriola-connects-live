-- ============================================================================
-- Gabriola time fix: fixed UTC-7 - Version 1.0.0 - 2026-11-01
-- Run in Supabase > SQL Editor (Strachan Family Project = Gabriola Connects).
-- Goes with site version 1.3.58 (can be run before or after the push; both are needed).
--
-- Why: B.C. moved to permanent daylight time on March 8, 2026 (UTC-7 all year). The database
-- still has the old 'America/Vancouver' rules and fell back an hour on Nov. 1, so it thought
-- 3:06 a.m. was 2:06 a.m. 'Etc/GMT+7' is a fixed UTC-7 zone (the + is old POSIX notation; it
-- means 7 hours BEHIND UTC) that doesn't depend on those rules.
--
-- What this does: the ferry functions work out "today" and "now" in fixed UTC-7:
--   get_ferry_schedule (which day's sailings to show), get_next_ferry, cleanup_ferry_live_sailings.
-- Same names, inputs and outputs as before. Safe to run more than once.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_ferry_schedule()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  today date := (now() AT TIME ZONE 'Etc/GMT+7')::date;
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'fromGabriola', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'time', fs.time_display,
          'departureTime', fs.departure_display,
          'arrivalTime', fs.arrival_display
        ) ORDER BY fs.departure_time
      )
      FROM ferry_schedule fs
      WHERE fs.departure_terminal = 'Gabriola'
        AND fs.is_active = true
        AND fs.valid_from <= today
        AND (fs.valid_until IS NULL OR fs.valid_until >= today)
        AND ferry_runs_on(fs, today)
    ),
    'fromNanaimo', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'time', fs.time_display,
          'departureTime', fs.departure_display,
          'arrivalTime', fs.arrival_display
        ) ORDER BY fs.departure_time
      )
      FROM ferry_schedule fs
      WHERE fs.departure_terminal = 'Nanaimo'
        AND fs.is_active = true
        AND fs.valid_from <= today
        AND (fs.valid_until IS NULL OR fs.valid_until >= today)
        AND ferry_runs_on(fs, today)
    )
  ) INTO result;

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_next_ferry(from_location text, search_time time without time zone DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  today date := (now() AT TIME ZONE 'Etc/GMT+7')::date;
  t time := COALESCE(search_time, (now() AT TIME ZONE 'Etc/GMT+7')::time);
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'time', fs.time_display,
    'departureTime', fs.departure_display,
    'arrivalTime', fs.arrival_display,
    'departureTerminal', fs.departure_terminal,
    'arrivalTerminal', fs.arrival_terminal
  )
  INTO result
  FROM ferry_schedule fs
  WHERE fs.departure_terminal = from_location
    AND fs.is_active = true
    AND fs.valid_from <= today
    AND (fs.valid_until IS NULL OR fs.valid_until >= today)
    AND ferry_runs_on(fs, today)
    AND fs.departure_time > t
  ORDER BY fs.departure_time
  LIMIT 1;

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_ferry_live_sailings()
 RETURNS void LANGUAGE sql AS $$
  DELETE FROM public.ferry_live_sailings WHERE sailing_date < (now() AT TIME ZONE 'Etc/GMT+7')::date - 14;
  DELETE FROM public.ferry_auto_alerts WHERE created_at < now() - interval '14 days';
$$;

COMMIT;

-- Check 1: these two should be the same (database Gabriola time vs real B.C. time)
SELECT now() AT TIME ZONE 'Etc/GMT+7' AS gabriola_time_now, now() AT TIME ZONE 'UTC' - interval '7 hours' AS utc_minus_7;

-- Check 2: any OTHER database functions still using America/Vancouver (should be none;
-- if any are listed, tell Claude their names)
SELECT p.proname AS still_uses_america_vancouver
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prokind = 'f' AND pg_get_functiondef(p.oid) ILIKE '%America/Vancouver%';
