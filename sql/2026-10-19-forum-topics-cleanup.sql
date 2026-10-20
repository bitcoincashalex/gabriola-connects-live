-- ============================================================================
-- Forum topics: 32 down to 8 - Version 1.1.0 - 2026-10-19
-- 1.1.0: the 8 topics become top-level topics first (no parent), because the database won't
--        let a topic sit under a hidden parent. 1.0.0 stopped with "Parent category must be
--        active and not archived" and changed nothing.
-- Run in Supabase > SQL Editor (Strachan Family Project = Gabriola Connects).
--
-- Nothing is deleted:
--   - 8 existing topics are kept (same web names, so shared links keep working) and renamed
--   - the other 24 are hidden (is_active = false), not removed
--   - every post in a hidden topic moves into one of the 8
--   - before anything changes, the topics and each post's topic are copied into two backup
--     tables, so the whole thing can be put back (see Undo at the bottom)
-- Runs as one unit: if anything fails, nothing changes.
-- ============================================================================

BEGIN;

-- 0. Backups (only made the first time this runs)
CREATE TABLE IF NOT EXISTS public.bbs_categories_backup_20261019 AS
  SELECT * FROM public.bbs_categories;
CREATE TABLE IF NOT EXISTS public.bbs_posts_topic_backup_20261019 AS
  SELECT id, category, category_id FROM public.bbs_posts;
ALTER TABLE public.bbs_categories_backup_20261019 ENABLE ROW LEVEL SECURITY;   -- not readable from the site
ALTER TABLE public.bbs_posts_topic_backup_20261019 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bbs_categories_backup_20261019 FROM anon, authenticated;
REVOKE ALL ON public.bbs_posts_topic_backup_20261019 FROM anon, authenticated;

-- 1a. Flat list: no topic sits under another one any more (the old parent links are in the backup)
UPDATE public.bbs_categories SET parent_id = NULL WHERE parent_id IS NOT NULL;

-- 1. The 8 topics that stay: new names, descriptions and order
UPDATE public.bbs_categories c SET
  name = v.name, description = v.description, emoji = v.emoji, display_order = v.ord,
  is_active = true, is_archived = false, updated_at = now()
FROM (VALUES
  ('welcome',                    'Welcome & Help',                'New here? Say hello, ask how the site works, or tell me what to fix or add.', '👋', 1),
  ('island-issues-governance',   'Local Government & Planning',   'Islands Trust, RDN, the school board, elections, development and the Official Community Plan, and First Nations relations.', '🏛️', 2),
  ('ferry-transportation',       'Ferry, Roads & Trails',         'The ferry, GERTIE, Ferry Hill, roads, trails and getting around the island.', '⛴️', 3),
  ('environment-infrastructure', 'Environment, Water & Power',    'Water, power outages, weather and climate, wildlife, deer and invasive species.', '🌲', 4),
  ('healthcare-seniors',         'Health, Housing & Safety',      'Doctors and health care, seniors, housing, the fire department and emergency services.', '🏥', 5),
  ('business-economy',           'Business, Arts & Events',       'Local businesses, arts and culture, what''s on, and asking for recommendations.', '🎨', 6),
  ('classifieds',                'Buy, Sell & Free',              'Things for sale, things wanted, and things free to a good home.', '🏷️', 7),
  ('general-chat',               'General Chat',                  'Anything else about island life, including Mudge Island. Photos, humour and the Sounder too.', '💬', 8)
) AS v(slug, name, description, emoji, ord)
WHERE c.slug = v.slug;

-- 2. Which hidden topic goes where
CREATE TEMP TABLE topic_moves (old_slug text PRIMARY KEY, new_slug text NOT NULL) ON COMMIT DROP;
INSERT INTO topic_moves VALUES
  ('announcements',        'welcome'),
  ('new-members',          'welcome'),
  ('forum-help',           'welcome'),
  ('feedback',             'welcome'),
  ('updates',              'welcome'),
  ('islands-trust-rdn',    'island-issues-governance'),
  ('development-planning', 'island-issues-governance'),
  ('first-nations',        'island-issues-governance'),
  ('education-youth',      'island-issues-governance'),
  ('roads-trails',         'ferry-transportation'),
  ('water-power',          'environment-infrastructure'),
  ('climate-weather',      'environment-infrastructure'),
  ('invasive-species',     'environment-infrastructure'),
  ('wildlife-deer',        'environment-infrastructure'),
  ('housing-homelessness', 'healthcare-seniors'),
  ('fire-emergency',       'healthcare-seniors'),
  ('arts-culture',         'business-economy'),
  ('recommendations',      'business-economy'),
  ('community-life',       'general-chat'),
  ('random',               'general-chat'),
  ('humor',                'general-chat'),
  ('photos',               'general-chat'),
  ('sounder',              'general-chat'),
  ('mudge',                'general-chat');

-- Stop if a topic exists that isn't in this plan (so nothing ends up in a hidden topic)
DO $$
DECLARE missing text;
BEGIN
  SELECT string_agg(c.slug, ', ') INTO missing
  FROM public.bbs_categories c
  WHERE c.slug NOT IN (SELECT old_slug FROM topic_moves)
    AND c.slug NOT IN ('welcome','island-issues-governance','ferry-transportation','environment-infrastructure',
                       'healthcare-seniors','business-economy','classifieds','general-chat');
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'These topics are not in the plan, nothing was changed: %', missing;
  END IF;
END $$;

-- 3. Move the posts (deleted ones too, so a restored post lands in a live topic)
UPDATE public.bbs_posts p
SET category = m.new_slug, category_id = n.id
FROM topic_moves m
JOIN public.bbs_categories n ON n.slug = m.new_slug
WHERE p.category = m.old_slug;

-- Posts that only had the topic's id (no web name) - same move
UPDATE public.bbs_posts p
SET category = m.new_slug, category_id = n.id
FROM topic_moves m
JOIN public.bbs_categories o ON o.slug = m.old_slug
JOIN public.bbs_categories n ON n.slug = m.new_slug
WHERE p.category_id = o.id AND p.category IS DISTINCT FROM m.new_slug;

-- 4. Hide the 24 old topics
UPDATE public.bbs_categories c
SET is_active = false, updated_at = now()
WHERE c.slug IN (SELECT old_slug FROM topic_moves);

COMMIT;

-- Check: 8 topics, with how many live posts each has. "posts_in_hidden_topics" must be 0.
SELECT c.display_order AS "order", c.name, c.slug,
       (SELECT count(*) FROM public.bbs_posts p WHERE p.category = c.slug AND p.is_active) AS live_posts,
       (SELECT count(*) FROM public.bbs_posts p JOIN public.bbs_categories h ON h.slug = p.category
         WHERE h.is_active = false) AS posts_in_hidden_topics
FROM public.bbs_categories c
WHERE c.is_active
ORDER BY c.display_order;

-- Undo (puts every topic and every post's topic back exactly as before):
--   BEGIN;
--   UPDATE public.bbs_categories c SET name = b.name, description = b.description, emoji = b.emoji,
--          display_order = b.display_order, is_active = b.is_active, is_archived = b.is_archived
--     FROM public.bbs_categories_backup_20261019 b WHERE b.id = c.id;
--   UPDATE public.bbs_categories c SET parent_id = b.parent_id
--     FROM public.bbs_categories_backup_20261019 b WHERE b.id = c.id;
--   UPDATE public.bbs_posts p SET category = b.category, category_id = b.category_id
--     FROM public.bbs_posts_topic_backup_20261019 b WHERE b.id = p.id;
--   COMMIT;
