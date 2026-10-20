-- ============================================================================
-- Security Advisor fixes - Version 1.0.0 - 2026-10-13
-- Run in Supabase > SQL Editor (Strachan Family Project = Gabriola Connects).
--
-- Fixes the 4 errors in Security Advisor:
--
-- 1. volunteer_badges - security was off, so anyone could add, change or delete rows.
--    Turns security on. Anyone can still read badges; nobody can change them from
--    the website (only from Supabase itself). The site's code doesn't use this table.
--
-- 2. active_volunteer_opportunities and volunteer_leaderboard (views) - these ran
--    with the database owner's full access, skipping every security rule. Now they
--    run with the access of whoever is looking. The site's code doesn't use them.
--
-- 3. spatial_ref_sys - a built-in map reference table that comes with PostGIS (the
--    map add-on). Supabase won't let us switch its security on, because the add-on
--    owns it. Instead this takes away the public's ability to add, change or delete
--    rows in it. Reading stays allowed, because map functions need it.
--
-- Undo (if ever needed):
--   ALTER TABLE public.volunteer_badges DISABLE ROW LEVEL SECURITY;
--   ALTER VIEW public.active_volunteer_opportunities SET (security_invoker = off);
--   ALTER VIEW public.volunteer_leaderboard SET (security_invoker = off);
-- ============================================================================

-- 1. volunteer_badges
ALTER TABLE public.volunteer_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read volunteer badges" ON public.volunteer_badges;
CREATE POLICY "Anyone can read volunteer badges"
  ON public.volunteer_badges
  FOR SELECT
  USING (true);

-- 2. The two views
ALTER VIEW public.active_volunteer_opportunities SET (security_invoker = on);
ALTER VIEW public.volunteer_leaderboard SET (security_invoker = on);

-- 3. spatial_ref_sys: no public writes (skipped with a notice if Supabase doesn't allow it)
DO $$
BEGIN
  REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.spatial_ref_sys FROM anon, authenticated;
  RAISE NOTICE 'spatial_ref_sys: public can no longer change it';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'spatial_ref_sys: could not change permissions (%). Nothing else is affected.', SQLERRM;
END $$;

-- Check: should show
--   spatial_ref_sys   security_on false, public_can_add false, public_can_delete false
--   volunteer_badges  security_on true (public_can_add/delete may still say true, but with security on
--                     the rules only allow reading, so nothing can actually be added or deleted)
SELECT c.relname AS table_name,
       c.relrowsecurity AS security_on,
       has_table_privilege('anon', c.oid, 'INSERT') AS public_can_add,
       has_table_privilege('anon', c.oid, 'DELETE') AS public_can_delete
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname IN ('volunteer_badges', 'spatial_ref_sys');
