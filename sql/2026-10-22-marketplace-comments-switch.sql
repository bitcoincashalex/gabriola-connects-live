-- ============================================================================
-- Buy, Sell, Rent & Free: the poster can turn public comments off - Version 1.0.0 - 2026-10-22
-- Run in Supabase > SQL Editor (Strachan Family Project = Gabriola Connects).
-- Goes with site version 1.3.45.
--
-- 1. comments_enabled on each listing, on by default (every existing listing stays on).
--    The poster (or an admin) can switch it on the listing or in the form.
-- 2. While it's off, nobody can add a comment. Existing comments stay visible, and the
--    poster can still delete them. Private messages are not affected.
-- Safe to run more than once.
-- ============================================================================

BEGIN;

ALTER TABLE public.marketplace_listings
  ADD COLUMN IF NOT EXISTS comments_enabled boolean NOT NULL DEFAULT true;

-- Taking comments = live (active, not expired) AND the poster hasn't turned comments off
CREATE OR REPLACE FUNCTION public.marketplace_listing_open(p_listing uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.marketplace_listings l
    WHERE l.id = p_listing AND l.status = 'active' AND l.expires_at > now() AND l.comments_enabled
  );
$$;
REVOKE ALL ON FUNCTION public.marketplace_listing_open(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.marketplace_listing_open(uuid) TO authenticated;

COMMIT;

-- Check: every listing should show comments_enabled = true for now
SELECT comments_enabled, count(*) FROM public.marketplace_listings GROUP BY comments_enabled;
