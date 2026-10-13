-- ============================================================================
-- Volunteer rework - Version 1.1.0 - 2026-10-13
-- 1.1.0: matches the real columns (interest is stored by volunteer_id, dated by applied_at)
-- Run in Supabase > SQL Editor (Strachan Family Project = Gabriola Connects).
-- Runs as one unit: if anything fails, nothing changes.
--
-- 1. Takes down the 3 sample listings from January (they move to "taken down" in
--    Admin > Volunteer, where they can be put back).
-- 2. Lets the new posting form save: listings no longer need an "organization"
--    record, and status can be active / filled / closed.
-- 3. Security rules:
--      listings  - anyone can read live ones; any signed-in member can post;
--                  the poster or a volunteer admin can edit; only admins can
--                  take down or put back
--      interest  - you can say you're interested, see and take back your own;
--                  only the poster and admins see who's interested
--      organization_members - members see their own rows; admins see all
--      volunteer_badges / the two volunteer views - locked down (Supabase errors)
-- 4. When someone says they're interested, the poster gets a private message from
--    Gabriola Connects with their name, their note and a link to My listings.
--
-- Undo for the message: DROP TRIGGER IF EXISTS volunteer_interest_notice ON public.volunteer_applications;
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Who counts as a volunteer admin (super admins, and anyone with admin_volunteer)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_volunteer_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
      AND (u.is_super_admin IS TRUE OR (to_jsonb(u) ->> 'admin_volunteer') = 'true')
  );
$$;
REVOKE ALL ON FUNCTION public.is_volunteer_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_volunteer_admin() TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Constraints: only title, description and poster are required; status values
-- ---------------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  -- Old status / category rules (replaced below)
  FOR r IN SELECT conname FROM pg_constraint
           WHERE conrelid = 'public.volunteer_opportunities'::regclass AND contype = 'c'
             AND (pg_get_constraintdef(oid) ILIKE '%status%' OR pg_get_constraintdef(oid) ILIKE '%category%')
  LOOP
    EXECUTE format('ALTER TABLE public.volunteer_opportunities DROP CONSTRAINT %I', r.conname);
  END LOOP;

  -- Columns the form doesn't fill in must be allowed to be empty
  FOR r IN SELECT column_name FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'volunteer_opportunities'
             AND is_nullable = 'NO' AND column_default IS NULL
             AND column_name NOT IN ('id', 'title', 'description', 'posted_by')
  LOOP
    EXECUTE format('ALTER TABLE public.volunteer_opportunities ALTER COLUMN %I DROP NOT NULL', r.column_name);
  END LOOP;

  FOR r IN SELECT column_name FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'volunteer_applications'
             AND is_nullable = 'NO' AND column_default IS NULL
             AND column_name NOT IN ('id', 'opportunity_id', 'volunteer_id')
  LOOP
    EXECUTE format('ALTER TABLE public.volunteer_applications ALTER COLUMN %I DROP NOT NULL', r.column_name);
  END LOOP;

  -- One "interested" per person per listing
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.volunteer_applications'::regclass AND contype = 'u'
      AND pg_get_constraintdef(oid) ILIKE '%opportunity_id%volunteer_id%'
  ) THEN
    DELETE FROM public.volunteer_applications a
    USING public.volunteer_applications b
    WHERE a.opportunity_id = b.opportunity_id AND a.volunteer_id = b.volunteer_id AND a.ctid > b.ctid;
    ALTER TABLE public.volunteer_applications
      ADD CONSTRAINT volunteer_applications_one_per_person UNIQUE (opportunity_id, volunteer_id);
  END IF;
END $$;

ALTER TABLE public.volunteer_opportunities
  ADD CONSTRAINT volunteer_opportunities_status_check
  CHECK (status IN ('active', 'filled', 'closed', 'cancelled', 'draft', 'paused', 'expired', 'completed')) NOT VALID;

-- ---------------------------------------------------------------------------
-- 1. Take down the 3 sample listings
-- ---------------------------------------------------------------------------
UPDATE public.volunteer_opportunities
SET deleted_at = now(),
    deleted_by = posted_by
WHERE deleted_at IS NULL
  AND title IN ('Beach Cleanup Volunteer', 'Senior Tech Helper', 'Food Bank Assistant')
  AND created_at::date = DATE '2026-01-13';

-- ---------------------------------------------------------------------------
-- Posters can't undo a take-down or change who posted; only admins can
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.volunteer_listing_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_volunteer_admin() THEN
    NEW.posted_by   := OLD.posted_by;
    NEW.deleted_at  := OLD.deleted_at;
    NEW.deleted_by  := OLD.deleted_by;
    NEW.is_approved := OLD.is_approved;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS volunteer_listing_guard ON public.volunteer_opportunities;
CREATE TRIGGER volunteer_listing_guard
  BEFORE UPDATE ON public.volunteer_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.volunteer_listing_guard();

-- ---------------------------------------------------------------------------
-- 3. Security rules (old rules on these tables are replaced)
-- ---------------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename, policyname FROM pg_policies
           WHERE schemaname = 'public'
             AND tablename IN ('volunteer_opportunities', 'volunteer_applications', 'organization_members')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

ALTER TABLE public.volunteer_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_applications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members    ENABLE ROW LEVEL SECURITY;

-- Listings
CREATE POLICY "Anyone reads listings that are up"
  ON public.volunteer_opportunities FOR SELECT
  USING (deleted_at IS NULL OR posted_by = auth.uid() OR public.is_volunteer_admin());

CREATE POLICY "Members post their own listings"
  ON public.volunteer_opportunities FOR INSERT TO authenticated
  WITH CHECK (posted_by = auth.uid());

CREATE POLICY "Poster or admin edits a listing"
  ON public.volunteer_opportunities FOR UPDATE TO authenticated
  USING (posted_by = auth.uid() OR public.is_volunteer_admin())
  WITH CHECK (posted_by = auth.uid() OR public.is_volunteer_admin());

CREATE POLICY "Admins delete listings"
  ON public.volunteer_opportunities FOR DELETE TO authenticated
  USING (public.is_volunteer_admin());

-- Interest
CREATE POLICY "Members say they're interested in a live listing"
  ON public.volunteer_applications FOR INSERT TO authenticated
  WITH CHECK (
    volunteer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.volunteer_opportunities o
      WHERE o.id = opportunity_id AND o.deleted_at IS NULL AND o.status = 'active'
    )
  );

CREATE POLICY "Members see their own interest; admins see all"
  ON public.volunteer_applications FOR SELECT TO authenticated
  USING (volunteer_id = auth.uid() OR public.is_volunteer_admin());

CREATE POLICY "Members take back their own interest"
  ON public.volunteer_applications FOR DELETE TO authenticated
  USING (volunteer_id = auth.uid() OR public.is_volunteer_admin());

-- Organization members (not used by the new pages)
CREATE POLICY "Members see their own memberships; admins see all"
  ON public.organization_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_volunteer_admin());

CREATE POLICY "Admins manage memberships"
  ON public.organization_members FOR ALL TO authenticated
  USING (public.is_volunteer_admin())
  WITH CHECK (public.is_volunteer_admin());

-- Badges and the two views (the Supabase Security Advisor errors)
ALTER TABLE public.volunteer_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read volunteer badges" ON public.volunteer_badges;
CREATE POLICY "Anyone can read volunteer badges"
  ON public.volunteer_badges FOR SELECT USING (true);
ALTER VIEW public.active_volunteer_opportunities SET (security_invoker = on);
ALTER VIEW public.volunteer_leaderboard SET (security_invoker = on);

-- ---------------------------------------------------------------------------
-- Lookups the pages use
-- ---------------------------------------------------------------------------
-- The poster's name, for a listing that's up
CREATE OR REPLACE FUNCTION public.volunteer_poster_name(listing_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.full_name
  FROM public.volunteer_opportunities o
  JOIN public.users u ON u.id = o.posted_by
  WHERE o.id = listing_id AND o.deleted_at IS NULL;
$$;
REVOKE ALL ON FUNCTION public.volunteer_poster_name(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.volunteer_poster_name(uuid) TO anon, authenticated;

-- Who's interested in a listing: only for its poster and admins
CREATE OR REPLACE FUNCTION public.volunteer_interested(listing_id uuid)
RETURNS TABLE (user_id uuid, full_name text, message text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.volunteer_id, u.full_name, a.message, a.applied_at
  FROM public.volunteer_applications a
  JOIN public.volunteer_opportunities o ON o.id = a.opportunity_id
  LEFT JOIN public.users u ON u.id = a.volunteer_id
  WHERE a.opportunity_id = listing_id
    AND (o.posted_by = auth.uid() OR public.is_volunteer_admin())
  ORDER BY a.applied_at;
$$;
REVOKE ALL ON FUNCTION public.volunteer_interested(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.volunteer_interested(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Interest count, and the message to the poster
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.volunteer_interest_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender   uuid := '713881fc-2506-490c-8d72-4c6205bd1093';  -- Gabriola Connects
  listing  record;
  who      text;
  msg      text;
  conv     uuid;
  opp_id   uuid := COALESCE(NEW.opportunity_id, OLD.opportunity_id);
BEGIN
  UPDATE public.volunteer_opportunities
  SET application_count = (SELECT count(*) FROM public.volunteer_applications WHERE opportunity_id = opp_id)
  WHERE id = opp_id;

  IF TG_OP <> 'INSERT' THEN
    RETURN NULL;
  END IF;

  BEGIN
    SELECT id, title, posted_by INTO listing FROM public.volunteer_opportunities WHERE id = NEW.opportunity_id;
    IF listing.posted_by IS NULL OR listing.posted_by = NEW.volunteer_id OR listing.posted_by = sender THEN
      RETURN NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM public.message_settings s
               WHERE s.user_id = listing.posted_by AND s.allow_messages_from = 'nobody') THEN
      RETURN NULL;
    END IF;

    SELECT COALESCE(NULLIF(trim(u.full_name), ''), 'A member') INTO who FROM public.users u WHERE u.id = NEW.volunteer_id;
    msg := COALESCE(who, 'A member') || ' is interested in volunteering for "' || listing.title || '"';
    IF NEW.message IS NOT NULL AND trim(NEW.message) <> '' THEN
      msg := msg || E'\n\nTheir note: ' || trim(NEW.message);
    END IF;
    msg := msg || E'\n\nYou can message them from My volunteer listings.';

    SELECT c.id INTO conv FROM public.message_conversations c
    WHERE (c.participant_1 = sender AND c.participant_2 = listing.posted_by)
       OR (c.participant_1 = listing.posted_by AND c.participant_2 = sender)
    LIMIT 1;
    IF conv IS NULL THEN
      INSERT INTO public.message_conversations (participant_1, participant_2, last_message_at)
      VALUES (sender, listing.posted_by, now()) RETURNING id INTO conv;
    ELSE
      UPDATE public.message_conversations SET last_message_at = now() WHERE id = conv;
    END IF;

    INSERT INTO public.private_messages (sender_id, receiver_id, message, conversation_id, read, link_url)
    VALUES (sender, listing.posted_by, msg, conv, false, 'https://www.gabriolaconnects.ca/volunteer/mine');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'volunteer interest notice not sent: %', SQLERRM;
  END;

  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.volunteer_interest_changed() FROM PUBLIC;

DROP TRIGGER IF EXISTS volunteer_interest_notice ON public.volunteer_applications;
CREATE TRIGGER volunteer_interest_notice
  AFTER INSERT OR DELETE ON public.volunteer_applications
  FOR EACH ROW EXECUTE FUNCTION public.volunteer_interest_changed();

COMMIT;

-- Check: listings that are still up (should be none until someone posts), and the new pieces
SELECT
  (SELECT count(*) FROM public.volunteer_opportunities WHERE deleted_at IS NULL) AS listings_up,
  (SELECT count(*) FROM public.volunteer_opportunities WHERE deleted_at IS NOT NULL) AS listings_taken_down,
  (SELECT count(*) FROM pg_trigger WHERE tgname IN ('volunteer_interest_notice', 'volunteer_listing_guard')) AS triggers_in_place;
