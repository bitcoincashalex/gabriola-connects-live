-- ============================================================================
-- Forum cleanup - Version 1.0.0 - 2026-10-11
-- Run in Supabase > SQL Editor.
--
-- Deletes these posts from the Gabriola Connects account the same way the site's
-- Delete button does (they disappear from the forum and go to Mod > Hidden posts,
-- where you can restore them or delete them for good):
--   - "Coffee anyone?"
--   - "Hydro down in Village and surrounding area - Resolved 5:06pm"
--   - one of the two "1,900 Trees" posts (keeps the one with more replies and views;
--     if they're tied, keeps the newer one)
-- ============================================================================

BEGIN;

WITH trees AS (
  SELECT id
  FROM public.bbs_posts
  WHERE user_id = '713881fc-2506-490c-8d72-4c6205bd1093'
    AND is_active IS TRUE
    AND title LIKE '1,900 Trees%'
  ORDER BY COALESCE(reply_count, 0) + COALESCE(view_count, 0) ASC, created_at ASC
  LIMIT 1
)
UPDATE public.bbs_posts p
SET is_active  = false,
    deleted_at = now(),
    deleted_by = (SELECT u.id FROM public.users u WHERE lower(u.email) = 'bitcoincashalex@gmail.com' LIMIT 1)
WHERE p.user_id = '713881fc-2506-490c-8d72-4c6205bd1093'
  AND p.is_active IS TRUE
  AND (
        p.title = 'Coffee anyone?'
     OR p.title = 'Hydro down in Village and surrounding area - Resolved 5:06pm'
     OR p.id IN (SELECT id FROM trees)
  )
  -- only hide a "1,900 Trees" post if both are still showing
  AND (p.title NOT LIKE '1,900 Trees%' OR (
        SELECT count(*) FROM public.bbs_posts t
        WHERE t.user_id = '713881fc-2506-490c-8d72-4c6205bd1093'
          AND t.is_active IS TRUE AND t.title LIKE '1,900 Trees%') > 1);

COMMIT;

-- Check: should list the 3 posts just deleted
SELECT title, deleted_at FROM public.bbs_posts
WHERE user_id = '713881fc-2506-490c-8d72-4c6205bd1093' AND is_active IS FALSE
ORDER BY deleted_at DESC;
