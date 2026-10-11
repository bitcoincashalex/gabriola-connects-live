-- ============================================================================
-- Verify resident - Version 1.0.0 - 2026-10-11
-- Run in Supabase > SQL Editor.
--
-- The "Verify Resident" button on Admin > New User Signups did nothing because
-- the database only lets people change their own row in users, so the change
-- was quietly skipped. This adds a verify_resident() function that a super admin
-- can call to verify anyone, with or without a postal code.
--
-- Undo:
--   DROP FUNCTION IF EXISTS public.verify_resident(uuid);
-- ============================================================================

CREATE OR REPLACE FUNCTION public.verify_resident(target_user uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.is_super_admin IS TRUE
  ) THEN
    RAISE EXCEPTION 'Only a super admin can verify residents';
  END IF;

  UPDATE public.users
  SET is_resident = true,
      can_post    = true,
      can_comment = true
  WHERE id = target_user;

  RETURN FOUND;  -- false if no user has that id
END;
$$;

REVOKE ALL ON FUNCTION public.verify_resident(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_resident(uuid) TO authenticated;

-- Check: should show verify_resident
SELECT proname FROM pg_proc WHERE proname = 'verify_resident';
