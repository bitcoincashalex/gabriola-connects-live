-- ============================================================================
-- Tell Alex when someone adds a business or an event - Version 1.0.0 - 2026-10-20
-- Run in Supabase > SQL Editor (Strachan Family Project = Gabriola Connects).
--
-- When anyone except Alex (or the Gabriola Connects account itself) adds a business to the
-- Directory or an event to the calendar, the Gabriola Connects account sends Alex a site
-- message, the same way forum reply notices arrive. It says what was added, by whom, and
-- links to the admin page. Events waiting for approval say so and link to Pending Events.
--
-- A notice that fails never stops the business or event from being saved.
-- Undo:
--   DROP TRIGGER IF EXISTS new_business_notice ON public.directory_businesses;
--   DROP TRIGGER IF EXISTS new_event_notice ON public.events;
--   DROP FUNCTION IF EXISTS public.notify_admin_new_item();
-- ============================================================================

BEGIN;

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
    details := concat_ws(', ',
      CASE WHEN NEW.start_date IS NOT NULL THEN to_char(NEW.start_date::date, 'Dy Mon FMDD, YYYY') END,
      NULLIF(trim(COALESCE(NEW.venue_name, NEW.location)), ''));
    msg := 'New event: "' || NEW.title || '"'
        || CASE WHEN details <> '' THEN ' (' || details || ')' ELSE '' END
        || ', added by ' || who || '.'
        || CASE WHEN NEW.is_approved IS TRUE THEN ' It is already on the calendar.'
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

DROP TRIGGER IF EXISTS new_business_notice ON public.directory_businesses;
CREATE TRIGGER new_business_notice
  AFTER INSERT ON public.directory_businesses
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_new_item();

DROP TRIGGER IF EXISTS new_event_notice ON public.events;
CREATE TRIGGER new_event_notice
  AFTER INSERT ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_new_item();

COMMIT;

-- Check: both should be listed
SELECT tgname, tgrelid::regclass AS on_table
FROM pg_trigger WHERE tgname IN ('new_business_notice', 'new_event_notice');
