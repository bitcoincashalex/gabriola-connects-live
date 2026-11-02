-- ============================================================================
-- Alert audit trail - Version 1.0.0 - 2026-11-02
-- Run in Supabase > SQL Editor (Strachan Family Project = Gabriola Connects).
-- Goes with site version 1.3.65. RUN THIS BEFORE PUSHING.
--
-- What this does:
--   Every change to an alert is written to alert_audit: posted, edited (with the old and new
--   wording), taken down, put back up, deleted. Each entry says who did it, or "System" for
--   the automatic ferry and power alerts, and when.
--   - Nobody can change or delete entries through the site (no write access at all).
--   - Super admins and alert admins can read it (Admin > Alert Audit Log, and History on each alert).
--   - Entries stay after an alert is deleted, with the alert's title at the time.
--   - Internal bookkeeping (like which level an alert was already sent at) isn't logged.
--
-- How "who" is known: the site's admin routes use the master key, so the database can't see
-- who's signed in. They now pass the admin's id in alerts.changed_by (cleared again straight
-- away, so it's never stored on the alert), and deletes go through delete_alert_logged().
-- Safe to run more than once.
--
-- Undo: DROP TRIGGER IF EXISTS alert_audit_change ON public.alerts;
--       DROP TRIGGER IF EXISTS alert_audit_delete ON public.alerts;
--       (alert_audit keeps the history; drop it only if you mean to lose it)
-- ============================================================================

BEGIN;

ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS changed_by uuid;

CREATE TABLE IF NOT EXISTS public.alert_audit (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  alert_id    uuid NOT NULL,                 -- no link to alerts, so history survives a delete
  alert_title text,
  action      text NOT NULL CHECK (action IN ('posted', 'edited', 'taken down', 'put back up', 'deleted')),
  actor_id    uuid,                          -- empty = System (automatic alerts)
  actor_name  text NOT NULL,
  changes     jsonb,                         -- { field: { "from": ..., "to": ... } }
  at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS alert_audit_alert_idx ON public.alert_audit (alert_id, at);
CREATE INDEX IF NOT EXISTS alert_audit_at_idx ON public.alert_audit (at DESC);

ALTER TABLE public.alert_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.alert_audit FROM anon, authenticated;
GRANT SELECT ON public.alert_audit TO authenticated;
DROP POLICY IF EXISTS "Admins read the alert audit log" ON public.alert_audit;
CREATE POLICY "Admins read the alert audit log" ON public.alert_audit FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
      AND (u.is_super_admin IS TRUE OR (to_jsonb(u) ->> 'admin_alerts')::boolean IS TRUE)
  ));

-- Who is making this change
CREATE OR REPLACE FUNCTION public.alert_audit_actor(p_changed_by uuid)
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(auth.uid(), NULLIF(current_setting('app.alert_actor', true), '')::uuid, p_changed_by);
$$;

CREATE OR REPLACE FUNCTION public.alert_audit_name(p_actor uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE WHEN p_actor IS NULL THEN 'System'
    ELSE COALESCE((SELECT COALESCE(NULLIF(trim(u.full_name), ''), u.email) FROM public.users u WHERE u.id = p_actor), 'Unknown member')
  END;
$$;

-- Posted and changed (runs before the row is saved, so changed_by can be cleared)
CREATE OR REPLACE FUNCTION public.alert_audit_on_change()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  actor  uuid := public.alert_audit_actor(NEW.changed_by);
  diff   jsonb := '{}'::jsonb;
  f      text;
  before jsonb;
  after  jsonb;
  act    text;
BEGIN
  NEW.changed_by := NULL;                     -- never kept on the alert itself

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.alert_audit (alert_id, alert_title, action, actor_id, actor_name, changes)
    VALUES (NEW.id, NEW.title, 'posted', actor, public.alert_audit_name(actor),
            jsonb_build_object('severity', NEW.severity, 'message', NEW.message,
                               'on_behalf_of', NEW.on_behalf_of_name, 'expires_at', NEW.expires_at));
    RETURN NEW;
  END IF;

  before := to_jsonb(OLD);
  after := to_jsonb(NEW);
  FOREACH f IN ARRAY ARRAY['title', 'message', 'severity', 'category', 'active', 'expires_at',
                           'link_url', 'link_text', 'on_behalf_of_name', 'on_behalf_of_organization',
                           'affected_areas', 'image_url']
  LOOP
    IF (before -> f) IS DISTINCT FROM (after -> f) AND (before ? f OR after ? f) THEN
      diff := diff || jsonb_build_object(f, jsonb_build_object('from', before -> f, 'to', after -> f));
    END IF;
  END LOOP;

  IF diff = '{}'::jsonb THEN
    RETURN NEW;                               -- nothing a person would call a change
  END IF;

  act := CASE
    WHEN (diff ? 'active') AND NEW.active IS FALSE THEN 'taken down'
    WHEN (diff ? 'active') AND NEW.active IS TRUE THEN 'put back up'
    ELSE 'edited'
  END;

  INSERT INTO public.alert_audit (alert_id, alert_title, action, actor_id, actor_name, changes)
  VALUES (NEW.id, NEW.title, act, actor, public.alert_audit_name(actor), diff);
  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'alert audit not written: %', SQLERRM;  -- never blocks the alert itself
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.alert_audit_on_change() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.alert_audit_on_delete()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  actor uuid := public.alert_audit_actor(NULL);
BEGIN
  INSERT INTO public.alert_audit (alert_id, alert_title, action, actor_id, actor_name, changes)
  VALUES (OLD.id, OLD.title, 'deleted', actor, public.alert_audit_name(actor),
          jsonb_build_object('severity', OLD.severity, 'message', OLD.message));
  RETURN OLD;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'alert audit not written: %', SQLERRM;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.alert_audit_on_delete() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS alert_audit_change ON public.alerts;
CREATE TRIGGER alert_audit_change BEFORE INSERT OR UPDATE ON public.alerts
  FOR EACH ROW EXECUTE FUNCTION public.alert_audit_on_change();

DROP TRIGGER IF EXISTS alert_audit_delete ON public.alerts;
CREATE TRIGGER alert_audit_delete BEFORE DELETE ON public.alerts
  FOR EACH ROW EXECUTE FUNCTION public.alert_audit_on_delete();

-- Delete an alert and record who did it (used by the site's admin route, master key only)
CREATE OR REPLACE FUNCTION public.delete_alert_logged(p_alert uuid, p_actor uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.alert_actor', COALESCE(p_actor::text, ''), true);  -- this transaction only
  DELETE FROM public.alerts WHERE id = p_alert;
  PERFORM set_config('app.alert_actor', '', true);
END;
$$;
REVOKE ALL ON FUNCTION public.delete_alert_logged(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_alert_logged(uuid, uuid) TO service_role;

COMMIT;

-- Check: should show both triggers on alerts
SELECT tgname AS audit_trigger FROM pg_trigger
WHERE tgrelid = 'public.alerts'::regclass AND tgname LIKE 'alert_audit%' ORDER BY tgname;
