-- ============================================================================
-- Events: owner stays the owner, last edited by, repeating events - Version 1.0.0 - 2026-11-03
-- Run in Supabase > SQL Editor (Strachan Family Project = Gabriola Connects).
-- Goes with site version 1.3.67. RUN THIS BEFORE PUSHING.
--
-- What this does:
--   1. The person who adds an event stays its owner, whoever edits it later. Before this, editing
--      an event made the editor the owner, so a member lost the right to edit their own event
--      after an admin touched it. The database now keeps the owner no matter what the page sends.
--   2. events.updated_by: who last edited each event (shown on the event as "Last edited by").
--   3. events.series_id: links the dates of a repeating event (every week, every 2 weeks, monthly)
--      so the owner can change or delete all the later dates at once.
--   4. The "new event" message to Alex's inbox: says it's on the calendar (no more approving),
--      and a repeating event sends ONE message ("It repeats: Every week until Feb 2, 2027 (14 dates)"),
--      not one per date.
--   5. Gives "Gabriola Mens Group" back to Kent (only if exactly one member's name starts
--      with Kent; otherwise it changes nothing and says so).
--
-- Changes made here in the SQL Editor keep whatever owner you set (that's how 5 works).
-- Safe to run more than once.
-- ============================================================================

BEGIN;

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS series_id uuid;
CREATE INDEX IF NOT EXISTS events_series_idx ON public.events (series_id, start_date) WHERE series_id IS NOT NULL;

-- 1 and 2: owner is whoever is signed in when it's added, and never changes on edits
CREATE OR REPLACE FUNCTION public.events_keep_owner()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  series_owner uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;                               -- SQL Editor / imports: as given
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := auth.uid();
    NEW.updated_by := NULL;
    -- More dates added to an existing series by an admin stay the series owner's
    IF NEW.series_id IS NOT NULL AND NEW.series_id <> NEW.id THEN
      SELECT e.created_by INTO series_owner FROM public.events e WHERE e.id = NEW.series_id;
      IF series_owner IS NOT NULL AND series_owner <> auth.uid() AND public.is_event_admin() THEN
        NEW.created_by := series_owner;
        NEW.updated_by := auth.uid();
      END IF;
    END IF;
  ELSE
    NEW.created_by := OLD.created_by;
    NEW.updated_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.events_keep_owner() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS events_keep_owner ON public.events;
CREATE TRIGGER events_keep_owner BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.events_keep_owner();

-- 4: the new business / new event message to Alex (same as before, events part updated)
CREATE OR REPLACE FUNCTION public.notify_admin_new_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender  uuid := '713881fc-2506-490c-8d72-4c6205bd1093';  -- Gabriola Connects
  alex    uuid;
  who     text;
  msg     text;
  url     text;
  conv    uuid;
  details text;
  n_dates int;
  last_on date;
BEGIN
  SELECT u.id INTO alex FROM public.users u
  WHERE lower(u.email) = 'bitcoincashalex@gmail.com' LIMIT 1;
  IF alex IS NULL THEN
    RETURN NEW;
  END IF;

  -- Not for things Alex or the Gabriola Connects account added
  IF NEW.created_by = alex OR NEW.created_by = sender THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(trim(u.full_name), ''), u.email) INTO who
  FROM public.users u WHERE u.id = NEW.created_by;
  who := COALESCE(who, 'someone not signed in');

  IF TG_TABLE_NAME = 'directory_businesses' THEN
    details := concat_ws(', ',
      NULLIF(trim(NEW.category), ''),
      NULLIF(trim(NEW.address), ''));
    msg := 'New business in the Directory: "' || NEW.name || '"'
        || CASE WHEN details <> '' THEN ' (' || details || ')' ELSE '' END
        || ', added by ' || who || '.';
    url := 'https://www.gabriolaconnects.ca/admin/directory';
  ELSE
    -- A repeating event: one message for the whole series, not one per date
    IF (to_jsonb(NEW) ->> 'series_id') IS NOT NULL AND (to_jsonb(NEW) ->> 'series_id')::uuid <> NEW.id THEN
      RETURN NEW;
    END IF;

    details := concat_ws(', ',
      CASE WHEN NEW.start_date IS NOT NULL THEN to_char(NEW.start_date::date, 'Dy Mon FMDD, YYYY') END,
      NULLIF(trim(COALESCE(NEW.venue_name, NEW.location)), ''));
    msg := 'New event: "' || NEW.title || '"'
        || CASE WHEN details <> '' THEN ' (' || details || ')' ELSE '' END
        || ', added by ' || who || '.';

    IF (to_jsonb(NEW) ->> 'series_id') IS NOT NULL THEN
      SELECT count(*), max(e.start_date::date) INTO n_dates, last_on
      FROM public.events e WHERE e.series_id = NEW.id;
      msg := msg || ' It repeats: ' || COALESCE(NULLIF(trim(NEW.recurrence_pattern), ''),
                                                'to ' || to_char(last_on, 'Mon FMDD, YYYY'))
          || ' (' || n_dates || ' dates).';
    END IF;

    msg := msg || CASE WHEN NEW.is_approved IS TRUE THEN ' It is on the calendar.'
                       ELSE ' It is waiting for your approval.' END;
    url := CASE WHEN NEW.is_approved IS TRUE
                THEN 'https://www.gabriolaconnects.ca/admin/events'
                ELSE 'https://www.gabriolaconnects.ca/admin/events/pending' END;
  END IF;

  SELECT c.id INTO conv FROM public.message_conversations c
  WHERE (c.participant_1 = sender AND c.participant_2 = alex)
     OR (c.participant_1 = alex AND c.participant_2 = sender)
  LIMIT 1;

  IF conv IS NULL THEN
    INSERT INTO public.message_conversations (participant_1, participant_2, last_message_at)
    VALUES (sender, alex, now())
    RETURNING id INTO conv;
  ELSE
    UPDATE public.message_conversations SET last_message_at = now() WHERE id = conv;
  END IF;

  INSERT INTO public.private_messages (sender_id, receiver_id, message, conversation_id, read, link_url)
  VALUES (sender, alex, msg, conv, false, url);

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'new item notice not sent: %', SQLERRM;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.notify_admin_new_item() FROM PUBLIC, anon, authenticated;

-- 5: Mens Group back to Kent
DO $$
DECLARE
  kent uuid;
  n    int;
BEGIN
  SELECT count(*) INTO n FROM public.users u WHERE u.full_name ILIKE 'kent%';
  IF n <> 1 THEN
    RAISE NOTICE 'Mens Group NOT changed: % members have a name starting with Kent', n;
    RETURN;
  END IF;
  SELECT u.id INTO kent FROM public.users u WHERE u.full_name ILIKE 'kent%';
  UPDATE public.events SET created_by = kent
  WHERE id = 'c777878f-75f0-4183-aa98-92d4b346d1bb';
END $$;

COMMIT;

-- Check 1: Mens Group should show Kent as the owner
SELECT e.title, e.start_date, u.full_name AS owner
FROM public.events e LEFT JOIN public.users u ON u.id = e.created_by
WHERE e.id = 'c777878f-75f0-4183-aa98-92d4b346d1bb';

-- Check 2: events still waiting for approval (new ones won't wait any more; these are older).
-- If you want them all on the calendar, run:  UPDATE public.events SET is_approved = true WHERE is_approved IS NOT TRUE AND deleted_at IS NULL;
SELECT e.title, e.start_date, u.full_name AS added_by
FROM public.events e LEFT JOIN public.users u ON u.id = e.created_by
WHERE e.is_approved IS NOT TRUE AND e.deleted_at IS NULL
ORDER BY e.start_date;
