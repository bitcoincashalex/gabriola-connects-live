-- ============================================================================
-- Directory: put the main categories back in A to Z order - Version 1.0.0 - 2026-10-20
-- Run in Supabase > SQL Editor (Strachan Family Project = Gabriola Connects).
--
-- "Personal Services" was added at the end of the list, so in the Add Your Business
-- drop-down it sat at the bottom after Transportation instead of between Pet Services
-- and Professional Services. This renumbers the main categories alphabetically.
-- Sub-categories are not touched. Safe to run more than once.
-- ============================================================================

UPDATE public.business_categories c
SET display_order = o.n
FROM (
  SELECT id, row_number() OVER (ORDER BY lower(name)) AS n
  FROM public.business_categories
  WHERE parent_id IS NULL
) o
WHERE c.id = o.id;

-- Check: the main categories in their new order
SELECT display_order, name, is_active
FROM public.business_categories
WHERE parent_id IS NULL
ORDER BY display_order;
