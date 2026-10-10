-- ============================================================================
-- Events security rules - Version 1.0.0 - 2026-10-10
-- Run in Supabase > SQL Editor. Runs as one unit: if anything fails, nothing changes.
--
-- Fixes:
-- 1. "Anyone can view events" let anyone read every event through the database API,
--    including events waiting for approval and deleted ones. Replaced so the public
--    only sees approved events that haven't been deleted.
-- 2. Admins could not approve, reject or edit other people's events (only their own),
--    and Supabase gave no error, so Approve looked like it worked but didn't.
--
-- After this:
--   - Everyone: approved events that haven't been deleted
--   - Signed-in people: also their own events (so My Events shows their pending ones)
--   - Super admins and event admins: every event, and can approve/reject/edit any event
--   - Adding events and people editing/deleting their own events: unchanged
-- ============================================================================

BEGIN;

-- Is the signed-in person a super admin or an event admin?
-- (Reads admin_events safely whether or not that column exists.)
CREATE OR REPLACE FUNCTION public.is_event_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
      AND (u.is_super_admin IS TRUE OR (to_jsonb(u) ->> 'admin_events')::boolean IS TRUE)
  );
$$;

REVOKE ALL ON FUNCTION public.is_event_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_event_admin() TO anon, authenticated;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Old read rules
DROP POLICY IF EXISTS "Anyone can view events" ON public.events;
DROP POLICY IF EXISTS "Everyone can view approved events" ON public.events;

-- New read rules
DROP POLICY IF EXISTS "Public sees approved events" ON public.events;
CREATE POLICY "Public sees approved events" ON public.events
  FOR SELECT TO public
  USING (is_approved = true AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Creators see own events" ON public.events;
CREATE POLICY "Creators see own events" ON public.events
  FOR SELECT TO authenticated
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Event admins see all events" ON public.events;
CREATE POLICY "Event admins see all events" ON public.events
  FOR SELECT TO authenticated
  USING (public.is_event_admin());

-- Admins can approve, reject (soft delete) and edit any event
DROP POLICY IF EXISTS "Event admins update any event" ON public.events;
CREATE POLICY "Event admins update any event" ON public.events
  FOR UPDATE TO authenticated
  USING (public.is_event_admin())
  WITH CHECK (public.is_event_admin());

DROP POLICY IF EXISTS "Event admins delete any event" ON public.events;
CREATE POLICY "Event admins delete any event" ON public.events
  FOR DELETE TO authenticated
  USING (public.is_event_admin());

COMMIT;

-- Check: should list 8 rules (3 read, 2 update, 2 delete, 1 add)
SELECT policyname, cmd, roles FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'events'
ORDER BY cmd, policyname;
