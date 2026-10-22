-- ============================================================================
-- Directory: owners can edit their own business - Version 1.1.0 - 2026-10-20
-- 1.1.0: new businesses are also marked approved. They were saved as not approved, so the
--        front page count and the Island Map left them out (Brent's showed in the Directory
--        but not on the map, and the front page said 134 instead of 135).
-- Run in Supabase > SQL Editor (Strachan Family Project = Gabriola Connects).
-- Goes with site version 1.3.40.
--
-- The problem: when someone added a business, the site never saved who added it, so no
-- business had an owner and nobody but admins could edit one.
--
-- What this does:
--   1. From now on, the database records who added each business (the signed in person),
--      whatever the page sends.
--   2. The person who added a business can edit it. They can't hand it to someone else;
--      only directory admins can change who it belongs to.
--   3. New businesses are marked approved, since the Add form says they appear right away.
--      Brent's listing is approved too.
--   4. Brent G Hair Studio is given to Brent's account, but only if exactly one member
--      named Brent exists. Otherwise nothing is changed and the check below says so.
-- Directory admins keep full access as before. Safe to run more than once.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.directory_owner_guard()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.is_approved := true;                              -- the Add form promises it shows right away
    IF auth.uid() IS NOT NULL AND NOT public.is_directory_admin() THEN
      NEW.created_by := auth.uid();                       -- you add businesses as yourself
    ELSE
      NEW.created_by := COALESCE(NEW.created_by, auth.uid());
    END IF;
  ELSIF NEW.created_by IS DISTINCT FROM OLD.created_by
        AND auth.uid() IS NOT NULL AND NOT public.is_directory_admin() THEN
    NEW.created_by := OLD.created_by;                     -- only admins change the owner
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.directory_owner_guard() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS directory_owner_guard ON public.directory_businesses;
CREATE TRIGGER directory_owner_guard BEFORE INSERT OR UPDATE ON public.directory_businesses
  FOR EACH ROW EXECUTE FUNCTION public.directory_owner_guard();

DROP POLICY IF EXISTS "Owners edit their own business" ON public.directory_businesses;
CREATE POLICY "Owners edit their own business" ON public.directory_businesses
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Approve any business added through the site that was left unapproved (Brent's)
UPDATE public.directory_businesses SET is_approved = true
WHERE is_approved IS NOT TRUE AND is_active IS TRUE;

-- Brent's listing: only if there is exactly one member whose name starts with Brent
UPDATE public.directory_businesses b
SET created_by = (SELECT u.id FROM public.users u WHERE u.full_name ILIKE 'brent%')
WHERE b.name = 'Brent G Hair Studio'
  AND b.created_by IS NULL
  AND (SELECT count(*) FROM public.users u WHERE u.full_name ILIKE 'brent%') = 1;

COMMIT;

-- Check 1: Brent's listing and who it belongs to (empty owner = not set; see below)
SELECT b.name, b.is_approved, u.full_name AS owner, u.email AS owner_email
FROM public.directory_businesses b LEFT JOIN public.users u ON u.id = b.created_by
WHERE b.name = 'Brent G Hair Studio';

-- Check 2: members named Brent (if Check 1 shows no owner, there were none or several;
-- tell Claude which one is him)
SELECT full_name, email, created_at::date AS joined FROM public.users WHERE full_name ILIKE 'brent%';
