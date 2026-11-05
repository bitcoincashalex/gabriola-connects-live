-- ============================================================================
-- New member review: Resident / Not a Resident / Spam - Version 1.0.0 - 2026-11-05
-- Run in Supabase > SQL Editor (Strachan Family Project = Gabriola Connects).
-- Goes with site version 1.3.72. RUN THIS BEFORE PUSHING.
--
-- What this does:
--   1. users.resident_review: pending / resident / not_resident / spam. It's the result of your
--      review on Admin > New User Signups, so a member who isn't a resident no longer sits at
--      "Pending" forever.
--        resident      Resident badge, can post and comment (same as Verify Resident before)
--        not_resident  a member, no Resident badge, can post and comment
--        spam          banned, can't post or comment (for junk signups and test accounts)
--        pending       not reviewed yet (Undo puts a member back here, and lifts a spam ban)
--   2. set_resident_review(member, choice): the buttons use it. Super admins only.
--   3. Members can't set their own review, and someone marked "not a resident" or "spam" can't
--      tick "I live on Gabriola" on their profile to get the Resident badge back.
--   4. The Audit Log (Admin powers) records each review: who, which member, from what to what.
--   Existing members who are marked as residents start as "resident"; everyone else "pending".
-- Safe to run more than once.
-- ============================================================================

BEGIN;

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS resident_review text NOT NULL DEFAULT 'pending';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_resident_review_check') THEN
    ALTER TABLE public.users ADD CONSTRAINT users_resident_review_check
      CHECK (resident_review IN ('pending', 'resident', 'not_resident', 'spam'));
  END IF;
END $$;

-- Starting point (only touches members still at the default)
UPDATE public.users SET resident_review = 'resident'
WHERE is_resident IS TRUE AND resident_review = 'pending';

-- 2. The review buttons
CREATE OR REPLACE FUNCTION public.set_resident_review(target_user uuid, choice text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_super_admin IS TRUE) THEN
    RAISE EXCEPTION 'Only a super admin can review new members';
  END IF;
  IF choice NOT IN ('pending', 'resident', 'not_resident', 'spam') THEN
    RAISE EXCEPTION 'Unknown choice: %', choice;
  END IF;
  IF target_user = auth.uid() AND choice = 'spam' THEN
    RAISE EXCEPTION 'You can''t mark your own account as spam';
  END IF;

  UPDATE public.users SET
    resident_review = choice,
    is_resident = CASE choice WHEN 'resident' THEN true
                              WHEN 'pending' THEN is_resident
                              ELSE false END,
    can_post    = (choice <> 'spam'),
    can_comment = (choice <> 'spam'),
    is_banned   = CASE choice WHEN 'spam' THEN true
                              WHEN 'pending' THEN false   -- Undo lifts a spam ban
                              ELSE is_banned END
  WHERE id = target_user;

  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.set_resident_review(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_resident_review(uuid, text) TO authenticated;

-- The old Verify Resident function now also records the review
CREATE OR REPLACE FUNCTION public.verify_resident(target_user uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.set_resident_review(target_user, 'resident');
$$;
REVOKE ALL ON FUNCTION public.verify_resident(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_resident(uuid) TO authenticated;

-- 3. Members can't change their own review. Named "a0_..." so it runs before the audit trigger
--    (Postgres runs triggers in name order), so an undone change isn't logged.
CREATE OR REPLACE FUNCTION public.resident_review_guard()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- SQL Editor and the site's admin routes (no signed-in member) and super admins: as given
  IF auth.uid() IS NULL
     OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_super_admin IS TRUE) THEN
    RETURN NEW;
  END IF;
  NEW.resident_review := OLD.resident_review;
  IF OLD.resident_review IN ('not_resident', 'spam') AND NEW.is_resident IS TRUE THEN
    NEW.is_resident := false;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.resident_review_guard() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS a0_resident_review_guard ON public.users;
CREATE TRIGGER a0_resident_review_guard BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.resident_review_guard();

-- 4. Audit: same as before, plus resident_review
CREATE OR REPLACE FUNCTION public.audit_admin_powers()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  actor  uuid := COALESCE(auth.uid(), NEW.changed_by);   -- the site's admin route passes changed_by
  diff   jsonb := '{}'::jsonb;
  f      text;
  before jsonb := to_jsonb(OLD);
  after  jsonb := to_jsonb(NEW);
BEGIN
  NEW.changed_by := NULL;                                 -- never kept on the member
  FOREACH f IN ARRAY ARRAY[
    'role', 'is_super_admin', 'admin_events', 'admin_forum', 'admin_bbs', 'admin_directory',
    'admin_alerts', 'admin_alert_organizations', 'admin_ferry', 'admin_users', 'admin_marketplace',
    'can_create_events', 'can_issue_alerts', 'alert_level_permission', 'alert_organization',
    'can_post', 'can_create_posts', 'can_reply', 'can_comment',
    'is_banned', 'is_suspended', 'account_locked', 'forum_read_only', 'is_verified', 'is_resident',
    'resident_review']
  LOOP
    IF (before ? f OR after ? f) AND (before -> f) IS DISTINCT FROM (after -> f) THEN
      diff := diff || jsonb_build_object(f, jsonb_build_object('from', before -> f, 'to', after -> f));
    END IF;
  END LOOP;

  IF diff <> '{}'::jsonb THEN
    PERFORM public.audit_write('admin powers', 'changed', actor, 'member', NEW.id,
      COALESCE(NULLIF(trim(NEW.full_name), ''), NEW.email), diff);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'admin powers audit not written: %', SQLERRM;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.audit_admin_powers() FROM PUBLIC, anon, authenticated;

COMMIT;

-- Check: how many members are at each stage (new signups Kent and Doug should be "pending")
SELECT resident_review, count(*) FROM public.users GROUP BY 1 ORDER BY 1;
