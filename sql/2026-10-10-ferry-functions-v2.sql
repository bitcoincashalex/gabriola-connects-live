-- ============================================================================
-- get_ferry_schedule() and get_next_ferry() - Version 2.0.0 - 2026-10-10
-- Run in Supabase > SQL Editor (after 2026-10-10-ferry-schedule-fix.sql).
--
-- Changes from previous version:
--   1. Only sailings that run TODAY are returned, using the operates_monday ..
--      operates_sunday columns. Before, the day columns were ignored, so
--      weekday-only and no-Sunday sailings showed every day.
--   2. "Today" is worked out in Gabriola time (America/Vancouver). Before, the
--      database used UTC, so from late afternoon Pacific it was already tomorrow.
--   3. get_ferry_schedule orders by departure time (was sort_order).
--   Function names, inputs and outputs are unchanged, so no website code changes.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.ferry_runs_on(fs ferry_schedule, d date)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT CASE extract(isodow FROM d)::int
    WHEN 1 THEN fs.operates_monday
    WHEN 2 THEN fs.operates_tuesday
    WHEN 3 THEN fs.operates_wednesday
    WHEN 4 THEN fs.operates_thursday
    WHEN 5 THEN fs.operates_friday
    WHEN 6 THEN fs.operates_saturday
    WHEN 7 THEN fs.operates_sunday
  END
$function$;

CREATE OR REPLACE FUNCTION public.get_ferry_schedule()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  today date := (now() AT TIME ZONE 'America/Vancouver')::date;
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
  today date := (now() AT TIME ZONE 'America/Vancouver')::date;
  t time := COALESCE(search_time, (now() AT TIME ZONE 'America/Vancouver')::time);
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
