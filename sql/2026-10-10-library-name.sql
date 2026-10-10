-- ============================================================================
-- One name for the library - Version 1.0.0 - 2026-10-10
-- Events and the venue list used three names for the same library:
-- "Gabriola Library", "Gabriola Public Library" and "Gabriola Island Library".
-- This makes them all "Gabriola Library". Event titles are not changed.
-- ============================================================================

-- Events: venue name and location
UPDATE public.events
SET venue_name = 'Gabriola Library'
WHERE venue_name IN ('Gabriola Public Library', 'Gabriola Island Library');

UPDATE public.events
SET location = 'Gabriola Library'
WHERE location IN ('Gabriola Public Library', 'Gabriola Island Library');

-- Venue list (the Venue dropdown when adding an event). The old names are kept as
-- alternate names so anything that matches on them still finds the library.
UPDATE public.venues
SET name = 'Gabriola Library',
    alternate_names = (
      SELECT array_agg(DISTINCT n)
      FROM unnest(
        array_remove(alternate_names, 'Gabriola Library')
        || ARRAY['Gabriola Island Library', 'Gabriola Public Library']
      ) AS n
    )
WHERE name = 'Gabriola Island Library';

-- Check: should list only "Gabriola Library"
SELECT 'event' AS kind, venue_name AS name, count(*) FROM public.events
WHERE venue_name ILIKE '%librar%' GROUP BY venue_name
UNION ALL
SELECT 'venue', name, 1 FROM public.venues WHERE name ILIKE '%librar%';
