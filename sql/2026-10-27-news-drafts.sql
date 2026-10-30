-- ============================================================================
-- Island News drafts from the Gabriola Sounder - Version 1.0.0 - 2026-10-27
-- Run in Supabase > SQL Editor (Strachan Family Project = Gabriola Connects).
-- Goes with site version 1.3.55. RUN THIS BEFORE PUSHING.
--
-- What this does:
--   1. news_drafts: every Sounder story the site has looked at, with the AI's draft summary.
--      Only super admins can see it. Status: pending (waiting for Alex), published, rejected,
--      or skipped (obituaries, letters and anything the AI judged not to summarize).
--   2. publish_news_draft(): Alex's Publish button. Posts the (edited) draft to the forum
--      from the Gabriola Connects account. reject_news_draft(): the Reject button.
--   3. notify_news_drafts(): the site sends Alex an inbox message when new drafts are waiting.
--   4. The stories already posted by hand are marked as done, so they aren't drafted again.
--   5. A timer calls /api/cron/news-digest on Mondays and Thursdays at 14:05 UTC
--      (7:05 a.m. Pacific in summer, 6:05 a.m. in winter). It copies the secret from the
--      ferry timer. If it can't find it, nothing in this file is changed.
-- Nothing is ever posted without Alex pressing Publish. Safe to run more than once.
--
-- Undo: SELECT cron.unschedule('news-digest');
--       DROP TABLE IF EXISTS public.news_drafts;
--       DROP FUNCTION IF EXISTS public.publish_news_draft(uuid, text, text, text),
--         public.reject_news_draft(uuid), public.notify_news_drafts(integer);
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.news_drafts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source         text NOT NULL DEFAULT 'Gabriola Sounder',
  source_url     text NOT NULL UNIQUE,
  source_title   text NOT NULL,
  source_author  text,
  source_date    timestamptz,
  title          text,
  body           text,
  topic_slug     text,
  status         text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'rejected', 'skipped')),
  skip_reason    text,
  post_id        uuid,
  created_at     timestamptz NOT NULL DEFAULT now(),
  reviewed_at    timestamptz
);
CREATE INDEX IF NOT EXISTS news_drafts_status_idx ON public.news_drafts (status, created_at DESC);

ALTER TABLE public.news_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.news_drafts FROM anon, authenticated;
GRANT SELECT ON public.news_drafts TO authenticated;
DROP POLICY IF EXISTS "Super admins see news drafts" ON public.news_drafts;
CREATE POLICY "Super admins see news drafts" ON public.news_drafts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_super_admin IS TRUE));

-- Publish (with Alex's edits) -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.publish_news_draft(p_draft uuid, p_title text, p_body text, p_topic text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  sender uuid := '713881fc-2506-490c-8d72-4c6205bd1093';  -- Gabriola Connects
  d      record;
  cat    record;
  new_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_super_admin IS TRUE) THEN
    RAISE EXCEPTION 'Super admins only.';
  END IF;
  SELECT * INTO d FROM public.news_drafts WHERE id = p_draft FOR UPDATE;
  IF d.id IS NULL THEN
    RAISE EXCEPTION 'That draft no longer exists.';
  END IF;
  IF d.status = 'published' THEN
    RETURN d.post_id;
  END IF;
  IF COALESCE(trim(p_title), '') = '' OR COALESCE(trim(p_body), '') = '' THEN
    RAISE EXCEPTION 'The title and the text can''t be empty.';
  END IF;
  SELECT c.id, c.slug INTO cat FROM public.bbs_categories c WHERE c.slug = p_topic;
  IF cat.id IS NULL THEN
    RAISE EXCEPTION 'Pick a forum topic.';
  END IF;

  INSERT INTO public.bbs_posts (category_id, category, title, body, user_id, display_name, is_anonymous, view_count, reply_count, is_pinned, is_active)
  VALUES (cat.id, cat.slug, left(trim(p_title), 200), trim(p_body), sender, 'Gabriola Connects', false, 0, 0, false, true)
  RETURNING id INTO new_id;

  UPDATE public.news_drafts
  SET status = 'published', post_id = new_id, title = trim(p_title), body = trim(p_body), topic_slug = cat.slug, reviewed_at = now()
  WHERE id = d.id;
  RETURN new_id;
END;
$$;
REVOKE ALL ON FUNCTION public.publish_news_draft(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_news_draft(uuid, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.reject_news_draft(p_draft uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_super_admin IS TRUE) THEN
    RAISE EXCEPTION 'Super admins only.';
  END IF;
  UPDATE public.news_drafts SET status = 'rejected', reviewed_at = now()
  WHERE id = p_draft AND status = 'pending';
END;
$$;
REVOKE ALL ON FUNCTION public.reject_news_draft(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_news_draft(uuid) TO authenticated;

-- Tell Alex drafts are waiting (called by the site's server) -----------------------------------
CREATE OR REPLACE FUNCTION public.notify_news_drafts(p_count integer)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  sender uuid := '713881fc-2506-490c-8d72-4c6205bd1093';  -- Gabriola Connects
  alex   uuid;
  conv   uuid;
BEGIN
  IF p_count IS NULL OR p_count < 1 THEN
    RETURN;
  END IF;
  SELECT u.id INTO alex FROM public.users u WHERE lower(u.email) = 'bitcoincashalex@gmail.com' LIMIT 1;
  IF alex IS NULL THEN
    RETURN;
  END IF;
  SELECT c.id INTO conv FROM public.message_conversations c
  WHERE (c.participant_1 = sender AND c.participant_2 = alex)
     OR (c.participant_1 = alex AND c.participant_2 = sender)
  LIMIT 1;
  IF conv IS NULL THEN
    INSERT INTO public.message_conversations (participant_1, participant_2, last_message_at)
    VALUES (sender, alex, now()) RETURNING id INTO conv;
  ELSE
    UPDATE public.message_conversations SET last_message_at = now() WHERE id = conv;
  END IF;
  INSERT INTO public.private_messages (sender_id, receiver_id, message, conversation_id, read, link_url)
  VALUES (sender, alex,
          p_count || CASE WHEN p_count = 1 THEN ' Island News draft is' ELSE ' Island News drafts are' END
            || ' ready for you to check from the Gabriola Sounder. Nothing goes up until you press Publish.',
          conv, false, 'https://www.gabriolaconnects.ca/admin/news');
END;
$$;
REVOKE ALL ON FUNCTION public.notify_news_drafts(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_news_drafts(integer) TO service_role;

-- Stories already covered by hand: don't draft them again ------------------------------------
INSERT INTO public.news_drafts (source_url, source_title, status, skip_reason) VALUES
  ('https://soundernews.com/malcolmson-retains-seat-in-nanaimo-gabriola-island-as-b-c-conservatives-win-majority-government/', 'Malcolmson retains seat in Nanaimo–Gabriola Island as B.C. Conservatives win majority government', 'skipped', 'Already posted by hand'),
  ('https://soundernews.com/garden-club-for-october-2026/', 'Garden Club for October 2026', 'skipped', 'Already posted by hand'),
  ('https://soundernews.com/fire-prevention-month-with-gvfd/', 'Fire Prevention Month with GVFD', 'skipped', 'Left out by hand (event already over)'),
  ('https://soundernews.com/results-in-for-rdn-islands-trust-sd68-in-b-c-general-local-elections/', 'Results in for RDN, Islands Trust, SD68 in B.C. General Local Elections', 'skipped', 'Already posted by hand'),
  ('https://soundernews.com/ndp-and-greens-make-their-pitch-to-gabriolans-at-agi-hall/', 'NDP and Greens make their pitch to Gabriolans at Agi Hall', 'skipped', 'Already posted by hand'),
  ('https://soundernews.com/parks-committee-update-on-sportsfield-ferry-hill-green-burial-and-more/', 'Parks committee update on sportsfield, ferry hill, green burial and more', 'skipped', 'Already posted by hand'),
  ('https://soundernews.com/fire-board-votes-down-5-5-increase-in-budget-for-2027/', 'Fire Board votes down 5.5% increase in budget for 2027', 'skipped', 'Already posted by hand'),
  ('https://soundernews.com/gabriola-island-land-stewards-society-purchases-properties-on-church-for-affordable-housing/', 'Gabriola Island Land Stewards Society purchases properties on Church for affordable housing', 'skipped', 'Already posted by hand')
ON CONFLICT (source_url) DO NOTHING;

-- Timer: Mondays and Thursdays ------------------------------------------------------------------
DO $$
DECLARE
  secret text;
BEGIN
  SELECT substring(command from 'Bearer ([^''"]+)') INTO secret
  FROM cron.job
  WHERE command ILIKE '%/api/cron/ferry%' AND command LIKE '%Bearer %'
  ORDER BY jobid
  LIMIT 1;

  IF secret IS NULL OR secret = 'PASTE_CRON_SECRET_HERE' THEN
    RAISE EXCEPTION 'Could not find the secret in the ferry timer. Nothing was changed.';
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'news-digest') THEN
    PERFORM cron.unschedule('news-digest');
  END IF;

  PERFORM cron.schedule(
    'news-digest',
    '5 14 * * 1,4',
    format($cmd$
      SELECT net.http_get(
        url := 'https://www.gabriolaconnects.ca/api/cron/news-digest',
        headers := jsonb_build_object('Authorization', %L),
        timeout_milliseconds := 120000
      );
    $cmd$, 'Bearer ' || secret)
  );
END $$;

COMMIT;

-- Check 1: stories marked as already done (should be 8)
SELECT status, count(*) FROM public.news_drafts GROUP BY status;

-- Check 2: the new timer should show the same fingerprint as the ferry timer
SELECT jobname, schedule, active, md5(substring(command from 'Bearer ([^''"]+)')) AS secret_fingerprint
FROM cron.job
WHERE jobname = 'news-digest' OR command ILIKE '%/api/cron/ferry%';
