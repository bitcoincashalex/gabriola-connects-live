-- ============================================================================
-- Buy, Sell, Rent & Free: Lost and Found - Version 1.0.0 - 2026-11-02
-- Run in Supabase > SQL Editor (Strachan Family Project = Gabriola Connects).
-- Goes with site version 1.3.61. RUN THIS BEFORE PUSHING.
--
-- What this does:
--   1. Two more kinds of listing: 'lost' and 'found' (pets, keys, wallets, anything).
--   2. Listing guard (version 1.3.0): lost and found listings have no price and stay up
--      14 days (renewable), instead of 30. Everything else works as before (photos, comments,
--      messages, posting without your name).
--   3. New listing notice (version 1.3.0): says "Lost" or "Found".
-- Safe to run more than once.
-- ============================================================================

BEGIN;

ALTER TABLE public.marketplace_listings DROP CONSTRAINT IF EXISTS marketplace_listings_kind_check;
ALTER TABLE public.marketplace_listings
  ADD CONSTRAINT marketplace_listings_kind_check CHECK (kind IN ('sale', 'rent', 'wanted', 'free', 'lost', 'found'));

-- Listing guard (version 1.3.0)
CREATE OR REPLACE FUNCTION public.marketplace_guard()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  admin  boolean := public.is_marketplace_admin();
  rental boolean;
  span   interval;
  owner  uuid;
BEGIN
  IF NEW.kind = 'rent' THEN
    NEW.category := 'housing';
  END IF;
  rental := NEW.kind = 'rent' OR (NEW.kind = 'wanted' AND NEW.category = 'housing');
  span := CASE WHEN rental THEN interval '60 days'
               WHEN NEW.kind IN ('lost', 'found') THEN interval '14 days'
               ELSE interval '30 days' END;

  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NOT NULL THEN
      NEW.user_id := auth.uid();                -- you can only post as yourself
    END IF;
    owner := NEW.user_id;
    NEW.created_at := now();
    NEW.expires_at := now() + span;
    IF NOT admin THEN
      NEW.status := 'active';
    END IF;
  ELSE
    owner := COALESCE(OLD.user_id,
      (SELECT a.user_id FROM public.marketplace_anonymous_owners a WHERE a.listing_id = OLD.id));
    NEW.created_at := OLD.created_at;
    -- Only the poster can show their name again (admins can't reveal it)
    IF OLD.is_anonymous AND NOT NEW.is_anonymous AND auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM owner THEN
      NEW.is_anonymous := true;
    END IF;
    IF NOT admin THEN
      IF NEW.status = 'hidden' OR OLD.status = 'hidden' THEN
        NEW.status := OLD.status;               -- only admins hide or un-hide
      END IF;
      IF NEW.expires_at > now() + span THEN
        NEW.expires_at := now() + span;         -- renewing gives at most 30 days (60 for rentals, 14 for lost & found)
      END IF;
    END IF;
  END IF;

  -- Name on the listing: none (private table) or the poster's first name
  IF NEW.is_anonymous THEN
    IF owner IS NOT NULL THEN
      INSERT INTO public.marketplace_anonymous_owners (listing_id, user_id) VALUES (NEW.id, owner)
      ON CONFLICT (listing_id) DO UPDATE SET user_id = EXCLUDED.user_id;
    END IF;
    NEW.user_id := NULL;
    NEW.seller_name := 'A neighbour';
  ELSE
    NEW.user_id := owner;                       -- a listing can't change owner
    DELETE FROM public.marketplace_anonymous_owners WHERE listing_id = NEW.id;
    SELECT COALESCE(NULLIF(trim(u.first_name), ''), NULLIF(split_part(trim(u.full_name), ' ', 1), ''), 'A neighbour')
    INTO NEW.seller_name
    FROM public.users u WHERE u.id = owner;
  END IF;

  IF NOT rental THEN
    NEW.rental_type := NULL;
  END IF;
  IF NEW.kind <> 'rent' THEN
    NEW.available_from := NULL;
    NEW.furnished := NULL;
    NEW.pets_ok := NULL;
    NEW.utilities_included := NULL;
  END IF;
  IF NEW.kind IN ('free', 'lost', 'found') THEN
    NEW.price := NULL;
  END IF;
  NEW.title := trim(NEW.title);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.marketplace_guard() FROM PUBLIC, anon, authenticated;

-- New listing notice (version 1.3.0)
CREATE OR REPLACE FUNCTION public.notify_admin_new_listing()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  sender uuid := '713881fc-2506-490c-8d72-4c6205bd1093';  -- Gabriola Connects
  alex   uuid;
  owner  uuid := public.marketplace_listing_owner(NEW.id);
  who    text;
  what   text;
  amount text;
  conv   uuid;
BEGIN
  SELECT u.id INTO alex FROM public.users u WHERE lower(u.email) = 'bitcoincashalex@gmail.com' LIMIT 1;
  IF alex IS NULL OR owner = alex OR owner = sender THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(trim(u.full_name), ''), u.email) INTO who FROM public.users u WHERE u.id = owner;
  amount := CASE WHEN NEW.price IS NULL THEN NULL ELSE '$' || trim(to_char(NEW.price, 'FM999G999G990D00')) END;
  what := CASE NEW.kind
            WHEN 'free'   THEN 'Free'
            WHEN 'lost'   THEN 'Lost'
            WHEN 'found'  THEN 'Found'
            WHEN 'rent'   THEN 'For rent' || COALESCE(', ' || amount || '/mo', '')
            WHEN 'wanted' THEN CASE WHEN NEW.category = 'housing' THEN 'Looking to rent' ELSE 'Wanted' END
            ELSE 'For sale' || COALESCE(', ' || amount, '')
          END;

  SELECT c.id INTO conv FROM public.message_conversations c
  WHERE (c.participant_1 = sender AND c.participant_2 = alex) OR (c.participant_1 = alex AND c.participant_2 = sender)
  LIMIT 1;
  IF conv IS NULL THEN
    INSERT INTO public.message_conversations (participant_1, participant_2, last_message_at)
    VALUES (sender, alex, now()) RETURNING id INTO conv;
  ELSE
    UPDATE public.message_conversations SET last_message_at = now() WHERE id = conv;
  END IF;

  INSERT INTO public.private_messages (sender_id, receiver_id, message, conversation_id, read, link_url)
  VALUES (sender, alex,
          'New in Buy, Sell, Rent & Free: "' || NEW.title || '" (' || what || '), posted by ' || COALESCE(who, 'a member')
            || CASE WHEN NEW.is_anonymous THEN ' without their name showing.' ELSE '.' END,
          conv, false,
          'https://www.gabriolaconnects.ca/marketplace/' || NEW.id);
  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'new listing notice not sent: %', SQLERRM;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.notify_admin_new_listing() FROM PUBLIC, anon, authenticated;

COMMIT;

-- Check: should list all six kinds
SELECT pg_get_constraintdef(oid) AS kinds_allowed
FROM pg_constraint WHERE conname = 'marketplace_listings_kind_check';
