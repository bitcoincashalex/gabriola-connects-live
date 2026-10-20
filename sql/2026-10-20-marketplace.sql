-- ============================================================================
-- Buy, Sell & Free (marketplace) - Version 1.0.0 - 2026-10-20
-- Run in Supabase > SQL Editor (Strachan Family Project = Gabriola Connects).
-- Goes with site version 1.3.38.
--
-- 1. marketplace_listings: For sale / Wanted / Free listings by signed in members.
--    - Everyone can see live listings. A listing is live for 30 days, then drops off on its
--      own (the seller can renew it for another 30 days with one tap). Sold or hidden
--      listings only show to the seller and admins.
--    - Only the seller's first name is shown (copied from their profile when they post).
--      No phone numbers or email: buyers use site messages.
--    - Sellers can edit, renew, mark sold or delete their own listings. Admins can hide any.
-- 2. A public "marketplace" photo folder. Members can only upload into their own folder.
-- 3. Alex gets a site message from the Gabriola Connects account for each new listing.
--
-- Safe to run more than once.
-- Undo:
--   DROP TABLE IF EXISTS public.marketplace_listings;
--   DROP FUNCTION IF EXISTS public.marketplace_guard(), public.is_marketplace_admin(), public.notify_admin_new_listing();
--   (photos: Storage > marketplace > delete the folder, then delete the bucket)
-- ============================================================================

BEGIN;

-- 1. Listings ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketplace_listings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL DEFAULT auth.uid() REFERENCES public.users(id) ON DELETE CASCADE,
  seller_name  text,
  kind         text NOT NULL DEFAULT 'sale' CHECK (kind IN ('sale', 'wanted', 'free')),
  title        text NOT NULL CHECK (char_length(trim(title)) BETWEEN 3 AND 100),
  description  text CHECK (description IS NULL OR char_length(description) <= 3000),
  price        numeric(10,2) CHECK (price IS NULL OR (price >= 0 AND price <= 1000000)),
  category     text NOT NULL DEFAULT 'other',
  photos       text[] NOT NULL DEFAULT '{}' CHECK (cardinality(photos) <= 4),
  status       text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'hidden')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL DEFAULT now() + interval '30 days'
);
CREATE INDEX IF NOT EXISTS marketplace_listings_live_idx ON public.marketplace_listings (status, expires_at DESC);
CREATE INDEX IF NOT EXISTS marketplace_listings_user_idx ON public.marketplace_listings (user_id);

-- Admins: super admins and site admins
CREATE OR REPLACE FUNCTION public.is_marketplace_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND (u.is_super_admin IS TRUE OR u.role = 'admin')
  );
$$;
REVOKE ALL ON FUNCTION public.is_marketplace_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_marketplace_admin() TO authenticated;

-- Keeps listings honest no matter what the page sends
CREATE OR REPLACE FUNCTION public.marketplace_guard()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  admin boolean := public.is_marketplace_admin();
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NOT NULL THEN
      NEW.user_id := auth.uid();                -- you can only post as yourself
    END IF;
    NEW.created_at := now();
    NEW.expires_at := now() + interval '30 days';
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
      -- Renewing gives at most 30 days from now
      IF NEW.expires_at > now() + interval '30 days' THEN
        NEW.expires_at := now() + interval '30 days';
      END IF;
    END IF;
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

DROP TRIGGER IF EXISTS marketplace_guard ON public.marketplace_listings;
CREATE TRIGGER marketplace_guard BEFORE INSERT OR UPDATE ON public.marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION public.marketplace_guard();

ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.marketplace_listings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_listings TO authenticated;

DROP POLICY IF EXISTS "Live listings are public" ON public.marketplace_listings;
CREATE POLICY "Live listings are public" ON public.marketplace_listings FOR SELECT
  USING (status = 'active' AND expires_at > now());

DROP POLICY IF EXISTS "Sellers and admins see all of theirs" ON public.marketplace_listings;
CREATE POLICY "Sellers and admins see all of theirs" ON public.marketplace_listings FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_marketplace_admin());

DROP POLICY IF EXISTS "Members post as themselves" ON public.marketplace_listings;
CREATE POLICY "Members post as themselves" ON public.marketplace_listings FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Sellers and admins change listings" ON public.marketplace_listings;
CREATE POLICY "Sellers and admins change listings" ON public.marketplace_listings FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_marketplace_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_marketplace_admin());

DROP POLICY IF EXISTS "Sellers and admins delete listings" ON public.marketplace_listings;
CREATE POLICY "Sellers and admins delete listings" ON public.marketplace_listings FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_marketplace_admin());

-- 2. Photos -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('marketplace', 'marketplace', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS "Marketplace photos: members add to their own folder" ON storage.objects;
CREATE POLICY "Marketplace photos: members add to their own folder" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'marketplace' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Marketplace photos: members remove their own" ON storage.objects;
CREATE POLICY "Marketplace photos: members remove their own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'marketplace' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 3. Tell Alex about each new listing ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_admin_new_listing()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  sender uuid := '713881fc-2506-490c-8d72-4c6205bd1093';  -- Gabriola Connects
  alex   uuid;
  who    text;
  what   text;
  conv   uuid;
BEGIN
  SELECT u.id INTO alex FROM public.users u WHERE lower(u.email) = 'bitcoincashalex@gmail.com' LIMIT 1;
  IF alex IS NULL OR NEW.user_id = alex OR NEW.user_id = sender THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(trim(u.full_name), ''), u.email) INTO who FROM public.users u WHERE u.id = NEW.user_id;
  what := CASE NEW.kind
            WHEN 'free'   THEN 'Free'
            WHEN 'wanted' THEN 'Wanted'
            ELSE CASE WHEN NEW.price IS NULL THEN 'For sale' ELSE 'For sale, $' || trim(to_char(NEW.price, 'FM999G999G990D00')) END
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

DROP TRIGGER IF EXISTS new_listing_notice ON public.marketplace_listings;
CREATE TRIGGER new_listing_notice AFTER INSERT ON public.marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_new_listing();

-- 4. The old "Buy, Sell & Free" forum topic now opens the marketplace, so new forum posts
--    can't be filed there (it had no posts). Hidden, not deleted.
UPDATE public.bbs_categories SET is_active = false, updated_at = now() WHERE slug = 'classifieds';

COMMIT;

-- Check: should show the table with security on, the photo folder, and both triggers
SELECT
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.marketplace_listings'::regclass) AS listings_security_on,
  (SELECT public FROM storage.buckets WHERE id = 'marketplace')                           AS photo_folder_public,
  (SELECT count(*) FROM pg_trigger WHERE tgname IN ('marketplace_guard', 'new_listing_notice')) AS triggers_2;
