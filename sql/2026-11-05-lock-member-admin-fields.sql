-- ============================================================================
-- Lock admin fields on members - Version 1.0.0 - 2026-11-05
-- Run in Supabase > SQL Editor (Strachan Family Project = Gabriola Connects).
-- No site code change needed. Run any time (after sql/2026-11-05-resident-review.sql).
--
-- The problem: the database rule "allow_own_update" lets every signed-in member change ANY field
-- on their own row. A member who knows how could send one request straight to the database and
-- make themselves a super admin, unban themselves, give themselves alert powers, and so on.
-- The site's pages never do this, but the database allowed it.
--
-- What this does:
--   1. Only a super admin can change admin and permission fields on a member: role, super admin,
--      every admin_ flag, can_ permissions, alert level/organization, ban / suspension / lock /
--      read-only, forum moderator, verified flags, resident review. If anyone else tries, those
--      fields quietly keep their old values and the rest of the change goes through, so normal
--      profile edits keep working. The site's server routes (master key) and the SQL Editor
--      aren't affected.
--   2. The postal-code rule (set_resident_status) only decides "resident" for members you haven't
--      reviewed yet. Before this, a member you'd marked "not a resident" could type a V0R postal
--      code and get the Resident badge, and a verified resident without a V0R code lost it the
--      next time they saved their profile. It also now only counts Gabriola postal codes
--      (V0R 1X..., the same rule as the tip on New User Signups), not every V0R area.
--
-- Note: the forum admin pages (ban, read-only, moderator), event creator rights and bulk user
-- edits change OTHER members from the browser. The database has never allowed that (members can
-- only update their own row), so those buttons already don't save for other members. This
-- doesn't change that; they need moving to the server, like Admin > Users already is.
-- Safe to run more than once.
-- ============================================================================

BEGIN;

-- 1. Guard (replaces the resident-review-only guard; same trigger, runs before the audit)
CREATE OR REPLACE FUNCTION public.resident_review_guard()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  locked text[] := ARRAY[
    'role', 'is_super_admin',
    'admin_events', 'admin_forum', 'admin_bbs', 'admin_directory', 'admin_alerts',
    'admin_alert_organizations', 'admin_ferry', 'admin_users', 'admin_marketplace',
    'can_create_events', 'can_issue_alerts', 'can_moderate_events', 'can_edit_directory',
    'alert_level_permission', 'alert_organization',
    'can_post', 'can_create_posts', 'can_reply', 'can_comment', 'can_rsvp',
    'is_banned', 'banned_at', 'banned_by', 'banned_reason',
    'is_suspended', 'account_locked', 'forum_read_only', 'forum_moderator',
    'is_verified', 'email_verified', 'residency_verified_at', 'resident_review'];
  old_row jsonb := to_jsonb(OLD);
  keep    jsonb;
BEGIN
  -- SQL Editor, the site's server routes (master key) and super admins: as given
  IF auth.uid() IS NULL
     OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_super_admin IS TRUE) THEN
    RETURN NEW;
  END IF;

  -- Everyone else: the locked fields keep their old values
  SELECT jsonb_object_agg(k, old_row -> k) INTO keep
  FROM unnest(locked) AS k
  WHERE old_row ? k;
  IF keep IS NOT NULL THEN
    NEW := jsonb_populate_record(NEW, keep);
  END IF;

  -- Reviewed as not a resident or spam: can't give themselves the Resident badge
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

-- 2. Postal-code rule: only for members not reviewed yet, and only Gabriola codes
CREATE OR REPLACE FUNCTION public.set_resident_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Your review decides; the postal code doesn't override it
  IF COALESCE(NEW.resident_review, 'pending') <> 'pending' THEN
    RETURN NEW;
  END IF;
  IF upper(replace(COALESCE(NEW.postal_code, ''), ' ', '')) LIKE 'V0R1X%' THEN
    NEW.is_resident = TRUE;
    NEW.residency_verified_at = NOW();
  ELSE
    NEW.is_resident = FALSE;
    NEW.residency_verified_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;

COMMIT;

-- Check: should show 2 rows: resident_review_guard = true (locks admin fields), set_resident_status = false
SELECT p.proname, position('is_super_admin' IN pg_get_functiondef(p.oid)) > 0 AS locks_admin_fields
FROM pg_proc p
WHERE p.proname IN ('resident_review_guard', 'set_resident_status')
ORDER BY 1;
