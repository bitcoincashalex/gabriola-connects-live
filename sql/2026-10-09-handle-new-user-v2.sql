-- ============================================================================
-- handle_new_user() - Version 2.0.0 - 2026-10-09
-- Run in Supabase > SQL Editor. Replaces the existing function; the
-- on_auth_user_created trigger keeps pointing at it, nothing else changes.
--
-- Changes from previous version:
--   1. Google users get a readable username from their name (e.g. alexstrachan_3f9a)
--      instead of user_3f9a2c1b. Email sign ups still use the username they typed.
--   2. If a username is already taken, a suffix is added instead of the insert
--      failing silently and leaving the person with no profile.
--   3. Saves the Google profile photo to avatar_url.
--   4. full_name falls back to Google's "name" field before 'User'.
--   5. search_path pinned to public (recommended for SECURITY DEFINER functions).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  meta      jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  id_hex    text  := replace(NEW.id::text, '-', '');
  base      text;
  candidate text;
BEGIN
  -- Username: typed one (email sign up) or built from name (Google)
  candidate := NULLIF(trim(meta->>'username'), '');
  IF candidate IS NULL THEN
    base := lower(regexp_replace(COALESCE(meta->>'full_name', meta->>'name', ''), '[^a-zA-Z0-9]', '', 'g'));
    IF length(base) < 3 THEN base := 'user'; END IF;
    candidate := left(base, 14) || '_' || substring(id_hex, 1, 4);
  ELSE
    base := left(candidate, 11);
  END IF;

  -- Never fail on a duplicate username
  IF EXISTS (SELECT 1 FROM public.users WHERE username = candidate) THEN
    candidate := left(base, 11) || '_' || substring(id_hex, 1, 8);
  END IF;

  INSERT INTO public.users (
    id,
    email,
    full_name,
    username,
    avatar_url,
    postal_code,
    is_resident,
    role,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(meta->>'full_name', ''), NULLIF(meta->>'name', ''), 'User'),
    candidate,
    COALESCE(meta->>'avatar_url', meta->>'picture'),
    meta->>'postal_code',
    COALESCE((meta->>'is_resident')::boolean, false),
    'user',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$function$;
