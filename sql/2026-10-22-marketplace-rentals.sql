-- ============================================================================
-- Buy, Sell & Free: rentals - Version 1.0.0 - 2026-10-22
-- Run in Supabase > SQL Editor (Strachan Family Project = Gabriola Connects).
-- Goes with site version 1.3.43.
--
-- 1. A fourth kind of listing, "For rent", for monthly-and-up rentals: home, suite or cabin,
--    room, trailer / RV, RV pad / space. New fields: kind of place, available from,
--    furnished, pets OK, utilities included. The price is the rent per month.
--    "Looking for a rental" is a Wanted listing in the Housing & rentals category.
-- 2. Rentals (and people looking for one) stay up 60 days and renew for 60; everything
--    else stays 30.
-- 3. Alex's new-listing notice says "For rent, $750/mo" for rentals.
-- Existing listings are not changed. Safe to run more than once.
-- ============================================================================

BEGIN;

-- 1. New kind and fields
ALTER TABLE public.marketplace_listings DROP CONSTRAINT IF EXISTS marketplace_listings_kind_check;
ALTER TABLE public.marketplace_listings
  ADD CONSTRAINT marketplace_listings_kind_check CHECK (kind IN ('sale', 'rent', 'wanted', 'free'));

ALTER TABLE public.marketplace_listings
  ADD COLUMN IF NOT EXISTS rental_type        text,
  ADD COLUMN IF NOT EXISTS available_from     date,
  ADD COLUMN IF NOT EXISTS furnished          boolean,
  ADD COLUMN IF NOT EXISTS pets_ok            boolean,
  ADD COLUMN IF NOT EXISTS utilities_included boolean;

ALTER TABLE public.marketplace_listings DROP CONSTRAINT IF EXISTS marketplace_listings_rental_type_check;
ALTER TABLE public.marketplace_listings
  ADD CONSTRAINT marketplace_listings_rental_type_check
  CHECK (rental_type IS NULL OR rental_type IN ('home', 'suite', 'room', 'trailer', 'rv_pad'));

-- 2. The listing guard (version 1.1.0): rentals get 60 days, everything else 30
CREATE OR REPLACE FUNCTION public.marketplace_guard()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  admin  boolean := public.is_marketplace_admin();
  rental boolean;
  span   interval;
BEGIN
  -- A "For rent" listing is always in Housing & rentals
  IF NEW.kind = 'rent' THEN
    NEW.category := 'housing';
  END IF;
  rental := NEW.kind = 'rent' OR (NEW.kind = 'wanted' AND NEW.category = 'housing');
  span := CASE WHEN rental THEN interval '60 days' ELSE interval '30 days' END;

  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NOT NULL THEN
      NEW.user_id := auth.uid();                -- you can only post as yourself
    END IF;
    NEW.created_at := now();
    NEW.expires_at := now() + span;
    IF NOT admin THEN
      NEW.status := 'active';
    END IF;
    -- First name only
    SELECT COALESCE(NULLIF(trim(u.first_name), ''), NULLIF(split_part(trim(u.full_name), ' ', 1), ''), 'A neighbour')
    INTO NEW.seller_name
    FROM public.users u WHERE u.id = NEW.user_id;
  ELSE
    NEW.user_id := OLD.user_id;                 -- a listing can't change owner
    NEW.seller_name := OLD.seller_name;
    NEW.created_at := OLD.created_at;
    IF NOT admin THEN
      -- Only admins hide or un-hide
      IF NEW.status = 'hidden' OR OLD.status = 'hidden' THEN
        NEW.status := OLD.status;
      END IF;
      -- Renewing gives at most 30 days from now (60 for rentals)
      IF NEW.expires_at > now() + span THEN
        NEW.expires_at := now() + span;
      END IF;
    END IF;
  END IF;

  -- Rental details only on rentals
  IF NOT rental THEN
    NEW.rental_type := NULL;
  END IF;
  IF NEW.kind <> 'rent' THEN
    NEW.available_from := NULL;
    NEW.furnished := NULL;
    NEW.pets_ok := NULL;
    NEW.utilities_included := NULL;
  END IF;

  IF NEW.kind = 'free' THEN
    NEW.price := NULL;
  END IF;
  NEW.title := trim(NEW.title);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.marketplace_guard() FROM PUBLIC, anon, authenticated;

-- 3. Alex's new-listing notice (version 1.1.0): knows about rentals
CREATE OR REPLACE FUNCTION public.notify_admin_new_listing()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  sender uuid := '713881fc-2506-490c-8d72-4c6205bd1093';  -- Gabriola Connects
  alex   uuid;
  who    text;
  what   text;
  amount text;
  conv   uuid;
BEGIN
  SELECT u.id INTO alex FROM public.users u WHERE lower(u.email) = 'bitcoincashalex@gmail.com' LIMIT 1;
  IF alex IS NULL OR NEW.user_id = alex OR NEW.user_id = sender THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(trim(u.full_name), ''), u.email) INTO who FROM public.users u WHERE u.id = NEW.user_id;
  amount := CASE WHEN NEW.price IS NULL THEN NULL ELSE '$' || trim(to_char(NEW.price, 'FM999G999G990D00')) END;
  what := CASE NEW.kind
            WHEN 'free'   THEN 'Free'
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
          'New in Buy, Sell & Free: "' || NEW.title || '" (' || what || '), posted by ' || COALESCE(who, 'a member') || '.',
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

-- Check: should list the five new columns
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'marketplace_listings'
  AND column_name IN ('rental_type', 'available_from', 'furnished', 'pets_ok', 'utilities_included')
ORDER BY column_name;
