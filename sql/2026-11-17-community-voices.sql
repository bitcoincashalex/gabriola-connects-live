-- ============================================================================
-- Forum topic "Community Voices" (columns and letters) - Version 1.0.0 - 2026-11-17
-- Run in Supabase > SQL Editor (Strachan Family Project = Gabriola Connects).
-- Goes with site version 1.3.93. RUN THIS BEFORE PUSHING.
--
-- A new forum topic for regular columns and letters from Gabriola writers (Erik Andersen first).
-- Anyone signed in can post in it, like the other topics. Posts in it are marked OPINION, carry a
-- line saying the views are the writer's own, and the newest one shows on the front page.
-- Safe to run more than once.
-- ============================================================================

INSERT INTO public.bbs_categories
  (slug, name, description, emoji, color, display_order, is_featured, is_active, is_archived,
   min_role_to_post, min_role_to_view, requires_approval)
SELECT 'community-voices', 'Community Voices',
       'Columns and letters from Gabriola writers. Opinions are the writer''s own.',
       '✍️', '#7A3E72', 9, true, true, false, 'user', 'user', false
WHERE NOT EXISTS (SELECT 1 FROM public.bbs_categories WHERE slug = 'community-voices');

-- Check: the topic list, in order
SELECT display_order, name, slug, is_active FROM public.bbs_categories
WHERE is_active AND NOT is_archived ORDER BY display_order;
