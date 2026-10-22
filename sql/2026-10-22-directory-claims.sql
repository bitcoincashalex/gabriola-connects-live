-- ============================================================================
-- Directory: "Is this your business?" claims - Version 1.0.0 - 2026-10-22
-- Run in Supabase > SQL Editor (Strachan Family Project = Gabriola Connects).
-- Goes with site version 1.3.53. RUN THIS BEFORE PUSHING.
--
-- What this does:
--   1. On a business with no owner yet, a signed-in member sees "Is this your business?"
--      and can ask to be connected to it, with a short note (who they are, how to reach them).
--   2. Alex gets a message in his site inbox with a link to /admin/directory/claims.
--   3. A directory admin approves or declines there. Approving makes the member the owner, so
--      they get the Edit button on that business. The member gets a message either way.
--   4. Nobody becomes an owner without an admin approving it, so a stranger can't take over
--      someone else's listing.
-- Businesses that already have an owner don't show the button (an admin can still reassign).
-- Businesses added by an admin or the Gabriola Connects account count as having no owner.
-- Safe to run more than once.
--
-- Undo: DROP TABLE IF EXISTS public.directory_claims;
--       DROP FUNCTION IF EXISTS public.directory_real_owner(uuid), public.directory_claim_status(uuid), public.claim_directory_business(uuid, text),
--         public.review_directory_claim(uuid, boolean), public.admin_directory_claims();
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.directory_claims (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.directory_businesses(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  note        text CHECK (note IS NULL OR char_length(note) <= 500),
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS directory_claims_one_pending
  ON public.directory_claims (business_id, user_id) WHERE status = 'pending';

-- Everything goes through the functions below
ALTER TABLE public.directory_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.directory_claims FROM anon, authenticated;

-- Site inbox message from the Gabriola Connects account
CREATE OR REPLACE FUNCTION public.directory_claim_notice(p_to uuid, p_msg text, p_url text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  sender uuid := '713881fc-2506-490c-8d72-4c6205bd1093';  -- Gabriola Connects
  conv   uuid;
BEGIN
  IF p_to IS NULL OR p_to = sender THEN
    RETURN;
  END IF;
  SELECT c.id INTO conv FROM public.message_conversations c
  WHERE (c.participant_1 = sender AND c.participant_2 = p_to)
     OR (c.participant_1 = p_to AND c.participant_2 = sender)
  LIMIT 1;
  IF conv IS NULL THEN
    INSERT INTO public.message_conversations (participant_1, participant_2, last_message_at)
    VALUES (sender, p_to, now()) RETURNING id INTO conv;
  ELSE
    UPDATE public.message_conversations SET last_message_at = now() WHERE id = conv;
  END IF;
  INSERT INTO public.private_messages (sender_id, receiver_id, message, conversation_id, read, link_url)
  VALUES (sender, p_to, p_msg, conv, false, p_url);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'directory claim notice not sent: %', SQLERRM;
END;
$$;
REVOKE ALL ON FUNCTION public.directory_claim_notice(uuid, text, text) FROM PUBLIC, anon, authenticated;

-- Who really owns a business: the person in created_by, unless that's an admin or the
-- Gabriola Connects account (the original 134 were added by admins, so they count as unowned)
CREATE OR REPLACE FUNCTION public.directory_real_owner(p_business uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT b.created_by
  FROM public.directory_businesses b
  JOIN public.users u ON u.id = b.created_by
  WHERE b.id = p_business
    AND u.id <> '713881fc-2506-490c-8d72-4c6205bd1093'
    AND u.is_super_admin IS NOT TRUE
    AND (to_jsonb(u) ->> 'admin_directory')::boolean IS NOT TRUE;
$$;
REVOKE ALL ON FUNCTION public.directory_real_owner(uuid) FROM PUBLIC, anon, authenticated;

-- What the business page should show the signed-in person:
-- 'signed_out' | 'owner' (it's yours) | 'owned' (someone else's) | 'pending' (you asked) | 'none' (can ask)
CREATE OR REPLACE FUNCTION public.directory_claim_status(p_business uuid)
RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  owner uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 'signed_out';
  END IF;
  owner := public.directory_real_owner(p_business);
  IF EXISTS (SELECT 1 FROM public.directory_businesses b WHERE b.id = p_business AND b.created_by = auth.uid())
     AND owner IS NOT NULL THEN
    RETURN 'owner';
  ELSIF owner IS NOT NULL THEN
    RETURN 'owned';
  ELSIF EXISTS (SELECT 1 FROM public.directory_claims c
                WHERE c.business_id = p_business AND c.user_id = auth.uid() AND c.status = 'pending') THEN
    RETURN 'pending';
  END IF;
  RETURN 'none';
END;
$$;
REVOKE ALL ON FUNCTION public.directory_claim_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.directory_claim_status(uuid) TO anon, authenticated;

-- A member asks to be connected to a business
CREATE OR REPLACE FUNCTION public.claim_directory_business(p_business uuid, p_note text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  me    uuid := auth.uid();
  biz   record;
  who   text;
  alex  uuid;
  note  text := NULLIF(left(trim(COALESCE(p_note, '')), 500), '');
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Please sign in first.';
  END IF;
  SELECT b.id, b.name, b.created_by INTO biz FROM public.directory_businesses b WHERE b.id = p_business;
  IF biz.id IS NULL THEN
    RAISE EXCEPTION 'That business is not in the directory.';
  END IF;
  IF biz.created_by = me AND public.directory_real_owner(p_business) IS NOT NULL THEN
    RETURN 'owner';
  END IF;
  IF public.directory_real_owner(p_business) IS NOT NULL THEN
    RETURN 'owned';
  END IF;
  IF EXISTS (SELECT 1 FROM public.directory_claims c
             WHERE c.business_id = p_business AND c.user_id = me AND c.status = 'pending') THEN
    RETURN 'pending';
  END IF;

  INSERT INTO public.directory_claims (business_id, user_id, note) VALUES (p_business, me, note);

  SELECT COALESCE(NULLIF(trim(u.full_name), ''), u.email) INTO who FROM public.users u WHERE u.id = me;
  SELECT u.id INTO alex FROM public.users u WHERE lower(u.email) = 'bitcoincashalex@gmail.com' LIMIT 1;
  PERFORM public.directory_claim_notice(
    alex,
    COALESCE(who, 'A member') || ' says they own "' || biz.name || '" and wants to be able to edit it.'
      || CASE WHEN note IS NOT NULL THEN ' Their note: "' || note || '"' ELSE '' END,
    'https://www.gabriolaconnects.ca/admin/directory/claims'
  );
  RETURN 'pending';
END;
$$;
REVOKE ALL ON FUNCTION public.claim_directory_business(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_directory_business(uuid, text) TO authenticated;

-- Directory admins: the list of claims (pending first, then the last 30 days)
CREATE OR REPLACE FUNCTION public.admin_directory_claims()
RETURNS TABLE (
  id uuid, business_id uuid, business_name text, current_owner text,
  user_id uuid, member_name text, member_email text, member_joined timestamptz,
  note text, status text, created_at timestamptz, reviewed_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_directory_admin() THEN
    RAISE EXCEPTION 'Directory admins only.';
  END IF;
  RETURN QUERY
  SELECT c.id, b.id, b.name, ow.full_name,
         u.id, u.full_name, u.email, u.created_at,
         c.note, c.status, c.created_at, c.reviewed_at
  FROM public.directory_claims c
  JOIN public.directory_businesses b ON b.id = c.business_id
  JOIN public.users u ON u.id = c.user_id
  LEFT JOIN public.users ow ON ow.id = b.created_by
  WHERE c.status = 'pending' OR c.created_at > now() - interval '30 days'
  ORDER BY (c.status = 'pending') DESC, c.created_at DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_directory_claims() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_directory_claims() TO authenticated;

-- Directory admins: approve or decline
CREATE OR REPLACE FUNCTION public.review_directory_claim(p_claim uuid, p_approve boolean)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  c   record;
  biz record;
  other record;
BEGIN
  IF NOT public.is_directory_admin() THEN
    RAISE EXCEPTION 'Directory admins only.';
  END IF;
  SELECT * INTO c FROM public.directory_claims WHERE id = p_claim FOR UPDATE;
  IF c.id IS NULL THEN
    RAISE EXCEPTION 'That request no longer exists.';
  END IF;
  IF c.status <> 'pending' THEN
    RETURN c.status;
  END IF;
  SELECT b.id, b.name INTO biz FROM public.directory_businesses b WHERE b.id = c.business_id;

  IF p_approve THEN
    -- The owner guard lets directory admins set the owner
    UPDATE public.directory_businesses SET created_by = c.user_id WHERE id = c.business_id;
    UPDATE public.directory_claims SET status = 'approved', reviewed_at = now(), reviewed_by = auth.uid() WHERE id = c.id;
    PERFORM public.directory_claim_notice(
      c.user_id,
      'You''re now connected to "' || biz.name || '" in the Directory. Open the Directory and tap the pencil next to it to update your listing any time.',
      'https://www.gabriolaconnects.ca/directory'
    );
    -- Anyone else waiting on the same business is told it's been connected to its owner
    FOR other IN
      SELECT * FROM public.directory_claims
      WHERE business_id = c.business_id AND status = 'pending' AND id <> c.id
    LOOP
      UPDATE public.directory_claims SET status = 'declined', reviewed_at = now(), reviewed_by = auth.uid() WHERE id = other.id;
      PERFORM public.directory_claim_notice(
        other.user_id,
        '"' || biz.name || '" has been connected to its owner, so your request wasn''t approved. If you think that''s wrong, email connects@gabriolaconnects.ca.',
        'https://www.gabriolaconnects.ca/directory'
      );
    END LOOP;
    RETURN 'approved';
  END IF;

  UPDATE public.directory_claims SET status = 'declined', reviewed_at = now(), reviewed_by = auth.uid() WHERE id = c.id;
  PERFORM public.directory_claim_notice(
    c.user_id,
    'Your request to edit "' || biz.name || '" in the Directory wasn''t approved. If you do own it, email connects@gabriolaconnects.ca and we''ll sort it out.',
    'https://www.gabriolaconnects.ca/directory'
  );
  RETURN 'declined';
END;
$$;
REVOKE ALL ON FUNCTION public.review_directory_claim(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_directory_claim(uuid, boolean) TO authenticated;

COMMIT;

-- Check: how many businesses have an owner, and how many are waiting for one
SELECT count(*) FILTER (WHERE public.directory_real_owner(id) IS NOT NULL) AS with_owner,
       count(*) FILTER (WHERE public.directory_real_owner(id) IS NULL)     AS can_be_claimed
FROM public.directory_businesses;
