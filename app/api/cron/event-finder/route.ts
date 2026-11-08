// app/api/cron/event-finder/route.ts
// Twice a week (Tue and Fri, Supabase pg_cron timer 'event-finder'): reads the calendars in
// lib/eventFinder.ts (the Community Hall's Google Calendar for now) for the next 4 weeks and saves
// two kinds of suggestions for Alex to review at /admin/event-finder:
//   new          on their calendar, not on ours
//   not_listed   on ours at that venue, gone from theirs (often cancelled)
// NOTHING is added to or removed from the calendar here.
// Version: 1.0.0
// Date: 2026-11-08
//
// Needs these Vercel environment variables (already set): CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY
// Optional: EVENT_FINDER=off - stop checking

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  SOURCES, WINDOW_DAYS, occurrencesFromIcs, findMatch, isLikelyPrivate, sameEvent, titleKey, OurEvent,
} from '@/lib/eventFinder';
import { GABRIOLA_TZ } from '@/lib/gabriolaTime';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const USER_AGENT = 'GabriolaConnects/1.0 (+https://www.gabriolaconnects.ca; community calendar, checks public event calendars twice a week)';
const ALEX_EMAIL = 'bitcoincashalex@gmail.com';
const SENDER = '713881fc-2506-490c-8d72-4c6205bd1093';   // Gabriola Connects account

const todayGabriola = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: GABRIOLA_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (process.env.EVENT_FINDER === 'off') {
    return NextResponse.json({ found: 0, note: 'EVENT_FINDER is off' });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const today = todayGabriola();
  const from = new Date(`${today}T07:00:00Z`);               // midnight Gabriola time
  const lastDay = new Date(from.getTime() + WINDOW_DAYS * 86400000).toISOString().slice(0, 10);

  // Our events in the window, and what Alex has already decided or told us to ignore
  const [{ data: ours, error: oursError }, { data: ignores }, { data: known }] = await Promise.all([
    supabase.from('events')
      .select('id, title, start_date, start_time, venue_name, location')
      .eq('is_approved', true).is('deleted_at', null)
      .gte('start_date', today).lt('start_date', lastDay)
      .limit(5000),
    supabase.from('event_finder_ignores').select('source, title_key'),
    supabase.from('event_suggestions').select('source_key').gte('start_date', today),
  ]);
  if (oursError) {
    return NextResponse.json({ error: `Could not read our events: ${oursError.message}` }, { status: 500 });
  }
  const ignored = new Set((ignores || []).map((i: any) => `${i.source}|${i.title_key}`));
  const already = new Set((known || []).map((k: any) => k.source_key));
  const ourEvents = (ours || []) as OurEvent[];

  const report: any[] = [];
  const rows: any[] = [];

  for (const src of SOURCES) {
    let text: string;
    try {
      const res = await fetch(src.feedUrl, { headers: { 'User-Agent': USER_AGENT }, cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      text = await res.text();
      if (!text.includes('BEGIN:VCALENDAR')) throw new Error('not a calendar feed');
    } catch (e: any) {
      report.push({ source: src.name, error: `Could not read the feed: ${e?.message || e}` });
      continue;
    }

    let occ;
    try {
      occ = occurrencesFromIcs(text, from, WINDOW_DAYS);
    } catch (e: any) {
      report.push({ source: src.name, error: `Could not read the events in the feed: ${e?.message || e}` });
      continue;
    }

    let newCount = 0, matched = 0, skipped = 0, gone = 0;

    // 1. On their calendar, not on ours
    for (const o of occ) {
      if (isLikelyPrivate(o.title) || ignored.has(`${src.name}|${titleKey(o.title)}`)) { skipped++; continue; }
      if (findMatch(o, ourEvents)) { matched++; continue; }
      const key = `${src.name}|new|${o.uid}|${o.date}|${o.startTime || 'allday'}`;
      if (already.has(key)) continue;
      newCount++;
      rows.push({
        kind: 'new', source: src.name, source_key: key, title: o.title.slice(0, 200),
        start_date: o.date, start_time: o.startTime, end_time: o.endTime, is_all_day: o.allDay,
        location: o.room ? `${src.venueName} (${o.room})` : src.venueName,
      });
    }

    // 2. On ours at that venue, nowhere on their calendar that day (possibly cancelled)
    for (const e of ourEvents) {
      const atVenue = src.venueMatch.test(`${e.venue_name || ''} ${e.location || ''} ${e.title}`);
      if (!atVenue) continue;
      const day = String(e.start_date).slice(0, 10);
      const listed = occ.some(o => o.date === day && sameEvent(o.title, e.title));
      if (listed) continue;
      const key = `${src.name}|gone|${e.id}`;
      if (already.has(key)) continue;
      gone++;
      rows.push({
        kind: 'not_listed', source: src.name, source_key: key, title: e.title.slice(0, 200),
        start_date: day, start_time: e.start_time, event_id: e.id,
      });
    }

    report.push({ source: src.name, inFeed: occ.length, alreadyOnCalendar: matched, skipped, newSuggestions: newCount, notListed: gone });
  }

  let saved = 0;
  if (rows.length > 0) {
    const { data, error } = await supabase.from('event_suggestions')
      .upsert(rows, { onConflict: 'source_key', ignoreDuplicates: true })
      .select('id');
    if (error) {
      return NextResponse.json({ error: `Could not save suggestions: ${error.message}`, report }, { status: 500 });
    }
    saved = data?.length || 0;
  }

  const failures = report.filter(r => r.error);
  if (saved > 0 || failures.length > 0) {
    const parts: string[] = [];
    if (saved > 0) parts.push(`Event finder: ${saved} new suggestion${saved === 1 ? '' : 's'} to review (events on other calendars that aren't on ours, or ours that have gone from theirs).`);
    for (const f of failures) parts.push(`Event finder could not check ${f.source}: ${f.error}`);
    await tellAlex(supabase, parts.join(' '));
  }

  return NextResponse.json({ saved, window: `${today} to ${lastDay}`, report });
}

// Inbox message to Alex from the Gabriola Connects account
async function tellAlex(supabase: any, message: string) {
  try {
    const { data: alex } = await supabase.from('users').select('id').ilike('email', ALEX_EMAIL).maybeSingle();
    if (!alex) return;
    const { data: convs } = await supabase.from('message_conversations').select('id')
      .or(`and(participant_1.eq.${SENDER},participant_2.eq.${alex.id}),and(participant_1.eq.${alex.id},participant_2.eq.${SENDER})`)
      .limit(1);
    let conv = convs?.[0]?.id;
    if (!conv) {
      const { data: made } = await supabase.from('message_conversations')
        .insert({ participant_1: SENDER, participant_2: alex.id, last_message_at: new Date().toISOString() })
        .select('id').single();
      conv = made?.id;
    } else {
      await supabase.from('message_conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conv);
    }
    if (!conv) return;
    await supabase.from('private_messages').insert({
      sender_id: SENDER, receiver_id: alex.id, message, conversation_id: conv, read: false,
      link_url: 'https://www.gabriolaconnects.ca/admin/event-finder',
    });
  } catch (e: any) {
    console.error('[event-finder] could not message Alex:', e?.message || e);
  }
}
