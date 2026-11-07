-- ============================================================================
-- Event end dates - Version 1.0.0 - 2026-11-07
-- Run in Supabase > SQL Editor (Strachan Family Project = Gabriola Connects).
-- Goes with site version 1.3.78 (can be run before or after pushing).
--
-- The first week of November in Month view was misaligned because 5 events end before they start
-- (end date Nov 5). They're the 5 events Claude added on Nov 5 directly to the database without an
-- end date. They all got the day they were added as their end date, so the events table almost
-- certainly has "today" as the default for end_date. Events added through the site's form aren't
-- affected (the form always sends an end date or blank).
--
-- 1. Those 5 (and any other event ending before it starts) become one-day events.
-- 2. The "end date = today" default is removed, so it can't happen again.
-- 3. The database refuses an end date before the start date from now on.
-- Safe to run more than once.
-- ============================================================================

BEGIN;

UPDATE public.events SET end_date = NULL
WHERE end_date IS NOT NULL AND end_date < start_date;

ALTER TABLE public.events ALTER COLUMN end_date DROP DEFAULT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_end_after_start') THEN
    ALTER TABLE public.events ADD CONSTRAINT events_end_after_start
      CHECK (end_date IS NULL OR end_date >= start_date);
  END IF;
END $$;

COMMIT;

-- Check: should return no rows
SELECT title, start_date, end_date FROM public.events
WHERE end_date IS NOT NULL AND end_date < start_date;
