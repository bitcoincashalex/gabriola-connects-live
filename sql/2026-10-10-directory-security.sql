-- ============================================================================
-- Directory security rules - Version 1.0.0 - 2026-10-10
-- Run in Supabase > SQL Editor. Runs as one unit: if anything fails, nothing changes.
--
-- Fix: "Admin full access" checked auth.role() = 'admin', but Supabase never uses that
-- role name (signed-in people are always 'authenticated'), so the rule never applied.
-- Admins could not edit other people's businesses, and nobody could delete a business
-- from the website. Supabase gave no error, so Edit/Delete looked like they worked.
--
-- After this:
--   - Super admins and directory admins can view, add, edit and delete any business
--   - Everything else is unchanged: anyone can view businesses, signed-in people can add
--     one, and owners/creators can edit their own
-- ============================================================================

BEGIN;

-- Is the signed-in person a super admin or a directory admin?
-- (Reads admin_directory safely whether or not that column exists.)
CREATE OR REPLACE FUNCTION public.is_directory_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
      AND (u.is_super_admin IS TRUE OR (to_jsonb(u) ->> 'admin_directory')::boolean IS TRUE)
  );
$$;

REVOKE ALL ON FUNCTION public.is_directory_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_directory_admin() TO anon, authenticated;

ALTER TABLE public.directory_businesses ENABLE ROW LEVEL SECURITY;

-- Replace the rule that never applied
DROP POLICY IF EXISTS "Admin full access" ON public.directory_businesses;

DROP POLICY IF EXISTS "Directory admins manage all businesses" ON public.directory_businesses;
CREATE POLICY "Directory admins manage all businesses" ON public.directory_businesses
  FOR ALL TO authenticated
  USING (public.is_directory_admin())
  WITH CHECK (public.is_directory_admin());

COMMIT;

-- Check: should list 5 rules, including "Directory admins manage all businesses"
SELECT policyname, cmd, roles FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'directory_businesses'
ORDER BY cmd, policyname;
