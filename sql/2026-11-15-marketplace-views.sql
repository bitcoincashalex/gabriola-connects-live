-- ============================================================================
-- Buy, Sell, Rent & Free: how many people have seen a listing - Version 1.0.0 - 2026-11-15
-- Run in Supabase > SQL Editor (Strachan Family Project = Gabriola Connects).
-- Goes with site version 1.3.88. RUN THIS BEFORE PUSHING.
--
-- What this does:
--   1. marketplace_listing_views: one row per listing per viewer. A signed-in member is counted by
--      their account; a visitor who isn't signed in is counted by a random number kept in their
--      browser (no name, no IP address, nothing that says who they are). Nobody can read this table
--      directly, not even the listing's owner.
--   2. record_listing_view(listing, device): the listing page calls it when someone opens a
--      listing. The owner looking at their own listing is never counted. Opening the same listing
--      again within 30 minutes doesn't add a view.
--   3. my_listing_views(): for the signed-in member, each of their listings (including ones posted
--      without a name) with how many people have seen it and how many views in total.
--   Counting starts when you run this; there are no numbers for before today.
--   "People" is close, not exact: someone who looks on their phone and their computer without
--   signing in counts as two.
-- Safe to run more than once.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.marketplace_listing_views (
  listing_id uuid NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  viewer     text NOT NULL,                 -- 'u:<member id>' or 'd:<random browser number>'
  first_at   timestamptz NOT NULL DEFAULT now(),
  last_at    timestamptz NOT NULL DEFAULT now(),
  views      integer NOT NULL DEFAULT 1,
  PRIMARY KEY (listing_id, viewer)
);
ALTER TABLE public.marketplace_listing_views ENABLE ROW LEVEL SECURITY;
-- No policies on purpose: only the two functions below touch it.
REVOKE ALL ON public.marketplace_listing_views FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_listing_view(p_listing uuid, p_device text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me     uuid := auth.uid();
  who    text;
BEGIN
  IF p_listing IS NULL OR NOT EXISTS (SELECT 1 FROM public.marketplace_listings l WHERE l.id = p_listing) THEN
    RETURN;
  END IF;
  IF me IS NOT NULL THEN
    IF public.marketplace_listing_owner(p_listing) = me THEN
      RETURN;                                -- your own listing doesn't count
    END IF;
    who := 'u:' || me::text;
  ELSIF p_device ~ '^[A-Za-z0-9-]{8,64}$' THEN
    who := 'd:' || p_device;
  ELSE
    RETURN;
  END IF;

  INSERT INTO public.marketplace_listing_views AS v (listing_id, viewer)
  VALUES (p_listing, who)
  ON CONFLICT (listing_id, viewer) DO UPDATE
    SET views = v.views + 1, last_at = now()
    WHERE v.last_at < now() - interval '30 minutes';
END;
$$;
REVOKE ALL ON FUNCTION public.record_listing_view(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_listing_view(uuid, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.my_listing_views()
RETURNS TABLE (listing_id uuid, people integer, views integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.listing_id, count(*)::integer, COALESCE(sum(v.views), 0)::integer
  FROM public.marketplace_listing_views v
  WHERE auth.uid() IS NOT NULL
    AND public.marketplace_listing_owner(v.listing_id) = auth.uid()
  GROUP BY v.listing_id;
$$;
REVOKE ALL ON FUNCTION public.my_listing_views() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_listing_views() TO authenticated;

COMMIT;

-- Check: should show 2 rows, both functions
SELECT proname FROM pg_proc WHERE proname IN ('record_listing_view', 'my_listing_views') ORDER BY 1;
