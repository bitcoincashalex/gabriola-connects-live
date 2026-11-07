-- ============================================================================
-- Calendar data fixes - Version 1.0.0 - 2026-11-06
-- Run in Supabase > SQL Editor (Strachan Family Project = Gabriola Connects).
-- Goes with site version 1.3.77 (can be run before or after pushing).
--
-- 1. Experience Watercolours!!! was one event stretched from Oct 17 to Nov 28. Its own description
--    says it's two weekly classes at the Gabriola Fellowship Church:
--      Intermediate: Saturdays Oct 17 to Nov 28, 10am to noon
--      Beginner:     Saturdays Oct 17 to Nov 28, 1:30 to 3:30
--    The original becomes the first Intermediate class, and each class gets its 7 Saturdays as a
--    linked series (same as a repeating event added on the site). Everything else is copied.
-- 2. Museum Trivia Night ended on Nov 8 in the data (import error); it's one evening, Nov 7.
-- Safe to run more than once (it only acts if the long Watercolours event is still there).
-- ============================================================================

BEGIN;

DO $$
DECLARE
  orig   public.events;
  beg_id uuid := gen_random_uuid();
  d      date;
BEGIN
  SELECT * INTO orig FROM public.events
  WHERE id = '756f4874-4a1e-459e-a6fd-a41da7b1059d' AND end_date = '2026-11-28';
  IF NOT FOUND THEN
    RAISE NOTICE 'Watercolours already split, nothing to do';
    RETURN;
  END IF;

  -- The original: first Intermediate class
  UPDATE public.events SET
    title = 'Experience Watercolours: Intermediate',
    end_date = NULL, start_time = '10:00', end_time = '12:00', is_all_day = false,
    series_id = orig.id, is_recurring = true,
    recurrence_pattern = 'Every week until Nov 28, 2026'
  WHERE id = orig.id;

  FOR d IN SELECT generate_series('2026-10-17'::date, '2026-11-28'::date, '7 days')::date LOOP
    -- Intermediate, 10 to noon (Oct 17 is the original)
    IF d > '2026-10-17' THEN
      INSERT INTO public.events
      SELECT (jsonb_populate_record(orig, jsonb_build_object(
        'id', gen_random_uuid(), 'title', 'Experience Watercolours: Intermediate',
        'start_date', d, 'end_date', NULL, 'start_time', '10:00', 'end_time', '12:00',
        'is_all_day', false, 'series_id', orig.id, 'is_recurring', true,
        'recurrence_pattern', 'Every week until Nov 28, 2026'))).*;
    END IF;
    -- Beginner, 1:30 to 3:30
    INSERT INTO public.events
    SELECT (jsonb_populate_record(orig, jsonb_build_object(
      'id', CASE WHEN d = '2026-10-17' THEN beg_id ELSE gen_random_uuid() END,
      'title', 'Experience Watercolours: Beginner',
      'start_date', d, 'end_date', NULL, 'start_time', '13:30', 'end_time', '15:30',
      'is_all_day', false, 'series_id', beg_id, 'is_recurring', true,
      'recurrence_pattern', 'Every week until Nov 28, 2026'))).*;
  END LOOP;
END $$;

UPDATE public.events SET end_date = NULL
WHERE id = 'a91e8840-7d73-42d6-bb6c-dca23d564cbe' AND end_date = '2026-11-08';

COMMIT;

-- Check: should list 14 Watercolours classes (7 Intermediate, 7 Beginner) and Trivia on Nov 7 only
SELECT title, start_date, start_time, end_date FROM public.events
WHERE title LIKE 'Experience Watercolours%' OR id = 'a91e8840-7d73-42d6-bb6c-dca23d564cbe'
ORDER BY start_date, start_time;
