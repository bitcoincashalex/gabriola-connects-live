// app/api/cron/news-digest/route.ts
// Twice a week (Mon and Thu, Supabase pg_cron timer 'news-digest'): reads the Gabriola Sounder's
// feed, drafts a short summary of each new story with the AI, and saves the drafts for Alex to
// check at /admin/news. NOTHING is posted to the forum from here.
// Version: 1.0.0
// Date: 2026-10-27
//
// Needs these Vercel environment variables (already set):
//   CRON_SECRET, ANTHROPIC_API_KEY, SUPABASE_SERVICE_ROLE_KEY
// Optional:
//   NEWS_DIGEST=off - stop drafting

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SOUNDER_FEED, parseFeed, htmlToText, draftNewsPost, newsFooter } from '@/lib/newsDigest';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_PER_RUN = 6;           // stories sent to the AI per run (all at once, so a run stays short)
const MAX_AGE_DAYS = 21;         // older stories in the feed are ignored
const USER_AGENT = 'GabriolaConnects/1.0 (+https://www.gabriolaconnects.ca; Island News summaries with links back, twice a week)';

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (process.env.NEWS_DIGEST === 'off') {
    return NextResponse.json({ drafted: 0, note: 'NEWS_DIGEST is off' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  let xml: string;
  try {
    const res = await fetch(SOUNDER_FEED, { headers: { 'User-Agent': USER_AGENT }, cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    xml = await res.text();
  } catch (e: any) {
    console.error('[news-digest] could not read the Sounder feed:', e?.message || e);
    return NextResponse.json({ error: 'Could not read the feed' }, { status: 502 });
  }

  const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  const items = parseFeed(xml).filter(i => !i.pubDate || i.pubDate.getTime() >= cutoff);
  if (items.length === 0) return NextResponse.json({ drafted: 0, note: 'No recent stories' });

  // Leave out everything already looked at (drafted, posted, rejected or skipped)
  const { data: seen, error: seenError } = await supabase
    .from('news_drafts')
    .select('source_url')
    .in('source_url', items.map(i => i.link));
  if (seenError) {
    console.error('[news-digest] could not read drafts:', seenError.message);
    return NextResponse.json({ error: 'Could not read drafts' }, { status: 500 });
  }
  const seenUrls = new Set((seen || []).map(s => s.source_url));
  const fresh = items.filter(i => !seenUrls.has(i.link));

  let drafted = 0;
  let skipped = 0;
  const results: { title: string; status: string }[] = [];

  // Obituaries are never summarized, and don't need the AI to tell
  const obituaries = fresh.filter(i => i.categories.some(c => /obituar/i.test(c)));
  for (const item of obituaries) {
    await supabase.from('news_drafts').insert({
      source_url: item.link, source_title: item.title,
      source_date: item.pubDate ? item.pubDate.toISOString() : null,
      status: 'skipped', skip_reason: 'Obituary',
    });
    skipped++;
    results.push({ title: item.title, status: 'skipped: obituary' });
  }

  // The rest go to the AI together; anything over MAX_PER_RUN waits for the next run
  const stories = fresh.filter(i => !obituaries.includes(i)).slice(0, MAX_PER_RUN);
  const outcomes = await Promise.allSettled(stories.map(item =>
    draftNewsPost({ title: item.title, url: item.link, date: item.pubDate, text: htmlToText(item.html) })
  ));

  for (let n = 0; n < stories.length; n++) {
    const item = stories[n];
    const outcome = outcomes[n];
    const base = {
      source_url: item.link,
      source_title: item.title,
      source_date: item.pubDate ? item.pubDate.toISOString() : null,
    };
    if (outcome.status === 'rejected') {
      // Not saved, so it's tried again next run
      console.error('[news-digest] draft failed for', item.link, outcome.reason?.message || outcome.reason);
      results.push({ title: item.title, status: 'failed, will retry' });
      continue;
    }
    const draft = outcome.value;
    if (draft.skip) {
      await supabase.from('news_drafts').insert({ ...base, source_author: draft.reporter, status: 'skipped', skip_reason: draft.skip_reason });
      skipped++;
      results.push({ title: item.title, status: `skipped: ${draft.skip_reason}` });
      continue;
    }
    const body = draft.body.trim() + newsFooter({ title: item.title, url: item.link, date: item.pubDate }, draft.reporter);
    const { error } = await supabase.from('news_drafts').insert({
      ...base,
      source_author: draft.reporter,
      title: draft.title.trim(),
      body,
      topic_slug: draft.topic_slug,
      status: 'pending',
    });
    if (error) {
      console.error('[news-digest] could not save draft for', item.link, error.message);
      results.push({ title: item.title, status: 'failed, will retry' });
      continue;
    }
    drafted++;
    results.push({ title: item.title, status: 'drafted' });
  }

  if (drafted > 0) {
    const { error } = await supabase.rpc('notify_news_drafts', { p_count: drafted });
    if (error) console.error('[news-digest] notice failed:', error.message);
  }

  return NextResponse.json({ drafted, skipped, results });
}
