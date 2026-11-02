-- ============================================================================
-- Admin audit log: admin powers, removals, anonymous lookups - Version 1.0.0 - 2026-11-02
-- Run in Supabase > SQL Editor (Strachan Family Project = Gabriola Connects).
-- Goes with site version 1.3.66. RUN THIS BEFORE PUSHING.
--
-- What this does (alerts already have their own history: sql/2026-11-02-alert-audit.sql):
--   1. Admin powers: any change to a member's admin roles, permissions, ban / suspension /
--      lock / read-only, verified or resident status is logged: who, whose account, old -> new.
--   2. Removals: when someone takes down SOMEONE ELSE'S forum post, reply, listing, listing
--      comment, event or business (hide, delete, or put back) it's logged with the title.
--      People removing their own things are NOT logged.
--      For anything posted without a name, the log says "posted without a name" and never
--      records who posted it.
--   3. Anonymous lookups: every use of the admin tools that show who posted an anonymous
--      forum post, reply or listing is logged (who looked, at what, when). The poster's
--      identity is NOT written to the log.
--   Nobody can change or delete entries through the site. Only super admins can read them.
--
-- Known limit: the Supabase SQL Editor runs as the database owner. Changes made there show
-- as "System", and reading the private anonymous-author tables directly there can't be logged.
-- Safe to run more than once.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.audit_log (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  category     text NOT NULL CHECK (category IN ('admin powers', 'removal', 'anonymous lookup')),
  action       text NOT NULL,
  actor_id     uuid,                        -- empty = System / SQL Editor
  actor_name   text NOT NULL,
  target_type  text NOT NULL,               -- member, forum post, forum reply, listing, ...
  target_id    uuid,
  target_label text,                        -- member's name, or the item's title
  details      jsonb,
  at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_log_at_idx ON public.audit_log (category, at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.audit_log FROM anon, authenticated;
GRANT SELECT ON public.audit_log TO authenticated;
DROP POLICY IF EXISTS "Super admins read the audit log" ON public.audit_log;
CREATE POLICY "Super admins read the audit log" ON public.audit_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_super_admin IS TRUE));

CREATE OR REPLACE FUNCTION public.audit_write(
  p_category text, p_action text, p_actor uuid, p_type text, p_id uuid, p_label text, p_details jsonb)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (category, action, actor_id, actor_name, target_type, target_id, target_label, details)
  VALUES (p_category, p_action, p_actor, public.alert_audit_name(p_actor), p_type, p_id, left(p_label, 200), p_details);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'audit log not written: %', SQLERRM;   -- never blocks the action itself
END;
$$;
REVOKE ALL ON FUNCTION public.audit_write(text, text, uuid, text, uuid, text, jsonb) FROM PUBLIC, anon, authenticated;

-- 1. Admin powers ---------------------------------------------------------------------------
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS changed_by uuid;

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
    'is_banned', 'is_suspended', 'account_locked', 'forum_read_only', 'is_verified', 'is_resident']
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

DROP TRIGGER IF EXISTS audit_admin_powers ON public.users;
CREATE TRIGGER audit_admin_powers BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_powers();

-- 2. Removals of other people's things -------------------------------------------------------
-- TG_ARGV[0] = what it is (forum post, forum reply, listing, listing comment, event, business)
CREATE OR REPLACE FUNCTION public.audit_removal()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  kind    text := TG_ARGV[0];
  actor   uuid := auth.uid();
  o       jsonb := to_jsonb(OLD);
  n       jsonb := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END;
  author  uuid;
  anon    boolean := COALESCE((o ->> 'is_anonymous')::boolean, false);
  label   text;
  act     text;
  was_up  boolean;
  now_up  boolean;
BEGIN
  -- Was it showing before, and is it showing now?
  was_up := (o ->> 'deleted_at') IS NULL AND COALESCE((o ->> 'is_active')::boolean, true)
            AND NOT COALESCE((o ->> 'is_hidden')::boolean, false) AND COALESCE(o ->> 'status', '') <> 'hidden';
  IF TG_OP = 'DELETE' THEN
    act := 'deleted';
  ELSE
    now_up := (n ->> 'deleted_at') IS NULL AND COALESCE((n ->> 'is_active')::boolean, true)
              AND NOT COALESCE((n ->> 'is_hidden')::boolean, false) AND COALESCE(n ->> 'status', '') <> 'hidden';
    IF was_up AND NOT now_up THEN act := 'removed';
    ELSIF NOT was_up AND now_up THEN act := 'put back';
    ELSE RETURN NEW;                              -- not a removal
    END IF;
  END IF;

  -- Who posted it (private tables for anonymous items; never written to the log)
  IF kind = 'business' THEN
    author := public.directory_real_owner(OLD.id);   -- the 134 added by admins count as unowned
  ELSE
    author := COALESCE((o ->> 'user_id')::uuid, (o ->> 'created_by')::uuid);
  END IF;
  IF author IS NULL AND kind = 'forum post' THEN
    SELECT a.user_id INTO author FROM public.bbs_anonymous_authors a WHERE a.item_type = 'post' AND a.item_id = OLD.id;
  ELSIF author IS NULL AND kind = 'forum reply' THEN
    SELECT a.user_id INTO author FROM public.bbs_anonymous_authors a WHERE a.item_type = 'reply' AND a.item_id = OLD.id;
  ELSIF author IS NULL AND kind = 'listing' THEN
    author := public.marketplace_listing_owner(OLD.id);
  ELSIF author IS NULL AND kind = 'listing comment' AND (o ->> 'listing_id') IS NOT NULL THEN
    author := public.marketplace_listing_owner((o ->> 'listing_id')::uuid);  -- anonymous poster answering
    anon := true;
  END IF;

  -- People taking down their own things aren't logged
  IF actor IS NOT NULL AND actor IS NOT DISTINCT FROM author THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  label := COALESCE(o ->> 'title', o ->> 'name', left(o ->> 'body', 80), 'Untitled');
  PERFORM public.audit_write('removal', act, actor, kind, OLD.id, label,
    jsonb_build_object('posted_by', CASE WHEN anon THEN 'posted without a name'
                                         ELSE CASE WHEN author IS NULL THEN 'no owner on record'
                                         ELSE public.alert_audit_name(author) END END));
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'removal audit not written: %', SQLERRM;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;
REVOKE ALL ON FUNCTION public.audit_removal() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT * FROM (VALUES
    ('bbs_posts', 'forum post'), ('bbs_replies', 'forum reply'),
    ('marketplace_listings', 'listing'), ('marketplace_comments', 'listing comment'),
    ('events', 'event'), ('directory_businesses', 'business')) AS v(tbl, kind)
  LOOP
    IF to_regclass('public.' || t.tbl) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS audit_removal ON public.%I', t.tbl);
      EXECUTE format('CREATE TRIGGER audit_removal BEFORE UPDATE OR DELETE ON public.%I
                      FOR EACH ROW EXECUTE FUNCTION public.audit_removal(%L)', t.tbl, t.kind);
    END IF;
  END LOOP;
END $$;

-- 3. Anonymous lookups (same answers as before, now logged; the poster isn't logged) ----------
CREATE OR REPLACE FUNCTION public.admin_anonymous_author(p_type text, p_id uuid)
RETURNS TABLE (user_id uuid, full_name text, email text)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_super_admin IS TRUE) THEN
    RAISE EXCEPTION 'Only a super admin can see who wrote an anonymous post';
  END IF;
  PERFORM public.audit_write('anonymous lookup', 'looked up who posted', auth.uid(),
    CASE p_type WHEN 'reply' THEN 'forum reply' ELSE 'forum post' END, p_id,
    CASE p_type WHEN 'reply' THEN (SELECT left(r.body, 80) FROM public.bbs_replies r WHERE r.id = p_id)
                ELSE (SELECT p.title FROM public.bbs_posts p WHERE p.id = p_id) END,
    NULL);
  RETURN QUERY
    SELECT u.id, u.full_name, u.email
    FROM public.bbs_anonymous_authors a JOIN public.users u ON u.id = a.user_id
    WHERE a.item_type = p_type AND a.item_id = p_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_anonymous_author(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_anonymous_author(text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_listing_owner(p_listing uuid)
RETURNS TABLE (user_id uuid, full_name text, email text)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_super_admin IS TRUE) THEN
    RAISE EXCEPTION 'Only a super admin can see who posted a listing';
  END IF;
  PERFORM public.audit_write('anonymous lookup', 'looked up who posted', auth.uid(), 'listing', p_listing,
    (SELECT l.title FROM public.marketplace_listings l WHERE l.id = p_listing), NULL);
  RETURN QUERY
    SELECT u.id, u.full_name, u.email FROM public.users u
    WHERE u.id = public.marketplace_listing_owner(p_listing);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_listing_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_listing_owner(uuid) TO authenticated;

COMMIT;

-- Check: the triggers in place (should be 7 rows: audit_admin_powers on users, and
-- audit_removal on bbs_posts, bbs_replies, marketplace_listings, marketplace_comments,
-- events, directory_businesses)
SELECT c.relname AS on_table, t.tgname AS audit_trigger
FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
WHERE t.tgname IN ('audit_admin_powers', 'audit_removal') ORDER BY 1;
