-- ============================================================================
-- Buy, Sell, Rent & Free: post without your name - Version 1.0.0 - 2026-10-22
-- Run in Supabase > SQL Editor (Strachan Family Project = Gabriola Connects).
-- RUN THIS BEFORE PUSHING site version 1.3.47 (the new site code needs these changes).
--
-- 1. A listing can be posted "without my name". It then shows "Posted by a neighbour", and
--    the poster's account id is not saved on the listing: who posted it is kept in a private
--    table nobody can read through the site. Only a super admin can look it up
--    (admin_listing_owner).
-- 2. The poster can still edit, renew, mark sold, delete, turn comments off, and delete
--    comments on their listing. They can switch their name on or off later; nobody else can
--    reveal it, admins included.
-- 3. When the poster replies in the comments of an anonymous listing, the reply shows as
--    "A neighbour" marked Seller, with no account id.
-- 4. Buyers message an anonymous poster through marketplace_message_seller: the message is
--    delivered by the Gabriola Connects account with the buyer's name and a link to reply.
--    The poster stays anonymous until they choose to reply.
-- 5. Reply and new-listing notices find the real poster.
-- Existing listings are not changed. Safe to run more than once.
-- ============================================================================

BEGIN;

-- 1. Columns and the private table ---------------------------------------------------------
ALTER TABLE public.marketplace_listings ADD COLUMN IF NOT EXISTS is_anonymous boolean NOT NULL DEFAULT false;
ALTER TABLE public.marketplace_listings ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.marketplace_comments ALTER COLUMN user_id DROP NOT NULL;

-- (No link to the listings table: the row is saved a moment before its listing is.
--  A trigger below removes it when the listing is deleted.)
CREATE TABLE IF NOT EXISTS public.marketplace_anonymous_owners (
  listing_id uuid PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE
);
ALTER TABLE public.marketplace_anonymous_owners ENABLE ROW LEVEL SECURITY;   -- no rules: nobody through the site
REVOKE ALL ON public.marketplace_anonymous_owners FROM anon, authenticated;

-- 2. Helpers --------------------------------------------------------------------------------

-- Who posted a listing, named or not (used only inside the database)
CREATE OR REPLACE FUNCTION public.marketplace_listing_owner(p_listing uuid)
RETURNS uuid
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT l.user_id FROM public.marketplace_listings l WHERE l.id = p_listing),
    (SELECT a.user_id FROM public.marketplace_anonymous_owners a WHERE a.listing_id = p_listing)
  );
$$;
REVOKE ALL ON FUNCTION public.marketplace_listing_owner(uuid) FROM PUBLIC, anon, authenticated;

-- "Is this my listing?" - only ever answers about the person asking.
-- (VOLATILE on purpose: it has to see the private row saved a moment earlier in the same insert)
CREATE OR REPLACE FUNCTION public.marketplace_is_my_listing(p_listing uuid)
RETURNS boolean
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.marketplace_listings l WHERE l.id = p_listing AND l.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.marketplace_anonymous_owners a WHERE a.listing_id = p_listing AND a.user_id = auth.uid())
  );
$$;
REVOKE ALL ON FUNCTION public.marketplace_is_my_listing(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.marketplace_is_my_listing(uuid) TO authenticated;

-- The signed in person's own anonymous listings (for My Listings)
CREATE OR REPLACE FUNCTION public.my_anonymous_listings()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT a.listing_id FROM public.marketplace_anonymous_owners a WHERE a.user_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.my_anonymous_listings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_anonymous_listings() TO authenticated;

-- Super admin only: who posted one listing
CREATE OR REPLACE FUNCTION public.admin_listing_owner(p_listing uuid)
RETURNS TABLE (user_id uuid, full_name text, email text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_super_admin IS TRUE) THEN
    RAISE EXCEPTION 'Only a super admin can see who posted a listing';
  END IF;
  RETURN QUERY
    SELECT u.id, u.full_name, u.email FROM public.users u
    WHERE u.id = public.marketplace_listing_owner(p_listing);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_listing_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_listing_owner(uuid) TO authenticated;

-- 3. The listing guard (version 1.2.0): rentals 60 days, everything else 30, and anonymity
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
  span := CASE WHEN rental THEN interval '60 days' ELSE interval '30 days' END;

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
        NEW.expires_at := now() + span;         -- renewing gives at most 30 days (60 for rentals)
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
  IF NEW.kind = 'free' THEN
    NEW.price := NULL;
  END IF;
  NEW.title := trim(NEW.title);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.marketplace_guard() FROM PUBLIC, anon, authenticated;

-- Remove the private row when its listing is deleted
CREATE OR REPLACE FUNCTION public.marketplace_forget_owner()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  DELETE FROM public.marketplace_anonymous_owners WHERE listing_id = OLD.id;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.marketplace_forget_owner() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS marketplace_forget_owner ON public.marketplace_listings;
CREATE TRIGGER marketplace_forget_owner AFTER DELETE ON public.marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION public.marketplace_forget_owner();

-- 4. Listing rules: the poster is whoever posted it, named or not --------------------------
DROP POLICY IF EXISTS "Sellers and admins see all of theirs" ON public.marketplace_listings;
CREATE POLICY "Sellers and admins see all of theirs" ON public.marketplace_listings FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_marketplace_admin() OR (user_id IS NULL AND public.marketplace_is_my_listing(id)));

DROP POLICY IF EXISTS "Members post as themselves" ON public.marketplace_listings;
CREATE POLICY "Members post as themselves" ON public.marketplace_listings FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR (user_id IS NULL AND is_anonymous AND public.marketplace_is_my_listing(id)));

DROP POLICY IF EXISTS "Sellers and admins change listings" ON public.marketplace_listings;
CREATE POLICY "Sellers and admins change listings" ON public.marketplace_listings FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_marketplace_admin() OR (user_id IS NULL AND public.marketplace_is_my_listing(id)))
  WITH CHECK (user_id = auth.uid() OR public.is_marketplace_admin() OR (user_id IS NULL AND public.marketplace_is_my_listing(id)));

DROP POLICY IF EXISTS "Sellers and admins delete listings" ON public.marketplace_listings;
CREATE POLICY "Sellers and admins delete listings" ON public.marketplace_listings FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_marketplace_admin() OR (user_id IS NULL AND public.marketplace_is_my_listing(id)));

-- 5. Comments: the anonymous poster's replies carry no name or account id ------------------
CREATE OR REPLACE FUNCTION public.marketplace_comment_guard()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  owner uuid := public.marketplace_listing_owner(NEW.listing_id);
  anon  boolean := COALESCE((SELECT l.is_anonymous FROM public.marketplace_listings l WHERE l.id = NEW.listing_id), false);
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  NEW.body := trim(NEW.body);
  NEW.created_at := now();
  NEW.is_seller := NEW.user_id IS NOT NULL AND NEW.user_id = owner;
  IF NEW.is_seller AND anon THEN
    NEW.author_name := 'A neighbour';
    NEW.user_id := NULL;
  ELSE
    SELECT COALESCE(NULLIF(trim(u.first_name), ''), NULLIF(split_part(trim(u.full_name), ' ', 1), ''), 'A neighbour')
    INTO NEW.author_name
    FROM public.users u WHERE u.id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.marketplace_comment_guard() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Members comment on live listings" ON public.marketplace_comments;
CREATE POLICY "Members comment on live listings" ON public.marketplace_comments FOR INSERT TO authenticated
  WITH CHECK (
    public.marketplace_listing_open(listing_id)
    AND (user_id = auth.uid() OR (user_id IS NULL AND is_seller AND public.marketplace_is_my_listing(listing_id)))
  );

DROP POLICY IF EXISTS "Authors, sellers and admins remove comments" ON public.marketplace_comments;
CREATE POLICY "Authors, sellers and admins remove comments" ON public.marketplace_comments FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_marketplace_admin()
    OR public.marketplace_is_my_listing(listing_id)
  );

-- Comment notices (version 1.1.0): find the poster even when the listing has no name
CREATE OR REPLACE FUNCTION public.notify_marketplace_comment()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  sender    uuid := '713881fc-2506-490c-8d72-4c6205bd1093';  -- Gabriola Connects
  listing   record;
  owner     uuid;
  recipient uuid;
  conv      uuid;
  excerpt   text;
  msg       text;
  url       text;
BEGIN
  SELECT l.id, l.title INTO listing FROM public.marketplace_listings l WHERE l.id = NEW.listing_id;
  IF listing.id IS NULL THEN
    RETURN NEW;
  END IF;
  owner := public.marketplace_listing_owner(listing.id);

  excerpt := CASE WHEN char_length(NEW.body) > 140 THEN left(NEW.body, 137) || '...' ELSE NEW.body END;
  url := 'https://www.gabriolaconnects.ca/marketplace/' || listing.id || '#comment-' || NEW.id;

  FOR recipient IN
    SELECT owner WHERE NOT NEW.is_seller
    UNION
    SELECT DISTINCT c.user_id FROM public.marketplace_comments c
    WHERE NEW.is_seller AND c.listing_id = listing.id AND c.id <> NEW.id
      AND c.user_id IS NOT NULL AND c.user_id IS DISTINCT FROM owner
  LOOP
    CONTINUE WHEN recipient IS NULL OR recipient = sender OR recipient IS NOT DISTINCT FROM NEW.user_id;
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM public.message_settings s
      WHERE s.user_id = recipient AND s.allow_messages_from = 'nobody'
    );

    msg := CASE WHEN NEW.is_seller
      THEN NEW.author_name || ' (the seller) replied on "' || listing.title || '": ' || excerpt
      ELSE NEW.author_name || ' commented on your listing "' || listing.title || '": ' || excerpt
    END;

    conv := NULL;
    SELECT c.id INTO conv FROM public.message_conversations c
    WHERE (c.participant_1 = sender AND c.participant_2 = recipient)
       OR (c.participant_1 = recipient AND c.participant_2 = sender)
    LIMIT 1;
    IF conv IS NULL THEN
      INSERT INTO public.message_conversations (participant_1, participant_2, last_message_at)
      VALUES (sender, recipient, now()) RETURNING id INTO conv;
    ELSE
      UPDATE public.message_conversations SET last_message_at = now() WHERE id = conv;
    END IF;

    INSERT INTO public.private_messages (sender_id, receiver_id, message, conversation_id, read, link_url)
    VALUES (sender, recipient, msg, conv, false, url);
  END LOOP;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'marketplace comment notice not sent: %', SQLERRM;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.notify_marketplace_comment() FROM PUBLIC, anon, authenticated;

-- 6. Messaging an anonymous poster -----------------------------------------------------------
-- Delivered by the Gabriola Connects account, with the sender's name and a link to reply.
-- The sender never learns who the poster is unless the poster replies.
CREATE OR REPLACE FUNCTION public.marketplace_message_seller(p_listing uuid, p_message text)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  gc      uuid := '713881fc-2506-490c-8d72-4c6205bd1093';  -- Gabriola Connects
  me      uuid := auth.uid();
  owner   uuid;
  title   text;
  who     text;
  body    text := trim(COALESCE(p_message, ''));
  conv    uuid;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Please sign in to send a message';
  END IF;
  IF char_length(body) < 1 OR char_length(body) > 2000 THEN
    RAISE EXCEPTION 'Your message needs to be between 1 and 2000 characters';
  END IF;

  SELECT l.title INTO title FROM public.marketplace_listings l
  WHERE l.id = p_listing AND l.status <> 'hidden';
  IF title IS NULL THEN
    RAISE EXCEPTION 'That listing is not available';
  END IF;

  owner := public.marketplace_listing_owner(p_listing);
  IF owner IS NULL OR owner = me THEN
    RAISE EXCEPTION 'You can''t message yourself';
  END IF;
  IF EXISTS (SELECT 1 FROM public.message_settings s WHERE s.user_id = owner AND s.allow_messages_from = 'nobody') THEN
    RAISE EXCEPTION 'The poster isn''t taking messages';
  END IF;

  SELECT COALESCE(NULLIF(trim(u.full_name), ''), 'A member') INTO who FROM public.users u WHERE u.id = me;

  SELECT c.id INTO conv FROM public.message_conversations c
  WHERE (c.participant_1 = gc AND c.participant_2 = owner) OR (c.participant_1 = owner AND c.participant_2 = gc)
  LIMIT 1;
  IF conv IS NULL THEN
    INSERT INTO public.message_conversations (participant_1, participant_2, last_message_at)
    VALUES (gc, owner, now()) RETURNING id INTO conv;
  ELSE
    UPDATE public.message_conversations SET last_message_at = now() WHERE id = conv;
  END IF;

  INSERT INTO public.private_messages (sender_id, receiver_id, message, conversation_id, read, link_url)
  VALUES (gc, owner,
          COALESCE(who, 'A member') || ' sent a message about your listing "' || title || '":' || E'\n\n' || body
            || E'\n\n' || 'Your listing doesn''t show your name. If you reply, they will see who you are.',
          conv, false,
          'https://www.gabriolaconnects.ca/messages/' || me);
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.marketplace_message_seller(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.marketplace_message_seller(uuid, text) TO authenticated;

-- 7. Alex's new-listing notice (version 1.2.0): finds the poster, says when it has no name --
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

-- Check: is_anonymous column, the private table with security on, and the message function
SELECT
  (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'marketplace_listings' AND column_name = 'is_anonymous') AS anonymous_column,
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.marketplace_anonymous_owners'::regclass) AS private_table_security_on,
  (SELECT count(*) FROM pg_proc WHERE proname = 'marketplace_message_seller') AS message_function;
