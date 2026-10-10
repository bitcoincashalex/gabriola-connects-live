-- ============================================================================
-- Calendar import fix - Version 1.0.0 - 2026-10-10
-- The 2026-10-10 import saved "&amp;" instead of "&" in 49 venue names and locations
-- (Gabriola Golf &amp; Country Club). This changes them to "&".
-- Only touches events from that import.
-- ============================================================================

UPDATE public.events
SET venue_name = replace(venue_name, '&amp;', '&'),
    location   = replace(location, '&amp;', '&')
WHERE source_type = 'import_2026_10_10'
  AND (venue_name LIKE '%&amp;%' OR location LIKE '%&amp;%');

-- Check: should return 0
SELECT count(*) AS still_wrong
FROM public.events
WHERE source_type = 'import_2026_10_10'
  AND (venue_name LIKE '%&amp;%' OR location LIKE '%&amp;%');
