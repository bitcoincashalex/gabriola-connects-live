-- ============================================================================
-- Directory: add "Personal Services" as a category - Version 1.0.0 - 2026-10-20
-- Run in Supabase > SQL Editor (Strachan Family Project = Gabriola Connects).
--
-- Brent G Hair Studio was added under "Personal Services", which wasn't one of the
-- Directory's categories, so it only showed under "Other". This adds it as a main category
-- (hair, beauty, massage, tailoring and the like), so it gets its own button in the
-- Directory and shows in the Add Your Business list. Brent's listing needs no change.
-- Safe to run more than once.
-- Undo: DELETE FROM public.business_categories WHERE name = 'Personal Services' AND parent_id IS NULL;
-- ============================================================================

INSERT INTO public.business_categories (name, description, parent_id, display_order, is_active)
SELECT 'Personal Services', 'Hair, beauty, massage, tailoring and other personal services', NULL,
       COALESCE((SELECT max(display_order) FROM public.business_categories WHERE parent_id IS NULL), 0) + 1, true
WHERE NOT EXISTS (SELECT 1 FROM public.business_categories WHERE name = 'Personal Services');

-- Check: should show Personal Services, and Brent's listing under it
SELECT c.name AS category, c.is_active, (SELECT string_agg(b.name, ', ') FROM public.directory_businesses b WHERE b.category = c.name) AS businesses
FROM public.business_categories c WHERE c.name = 'Personal Services';
