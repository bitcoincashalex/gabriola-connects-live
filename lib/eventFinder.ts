// lib/eventFinder.ts
// Event finder: reads other Gabriola calendars and works out which of their events aren't on
// Gabriola Connects yet, and which Gabriola Connects events have disappeared from them (often a
// sign they're cancelled). Used by /api/cron/event-finder; Alex reviews the results at
// /admin/event-finder. Nothing is added or removed without his OK.
// Version: 1.0.0
// Date: 2026-11-08
//
// Sources: only ones that publish a calendar feed. The Chamber's events directory is behind
// Cloudflare bot protection, the Rollo Centre's calendar is a photo, and the Recreation Society's
// courses are in a sign-in system, so they aren't here.

import ical from 'node-ical';
import { GABRIOLA_TZ } from '@/lib/gabriolaTime';

export { SOURCES, titleKey } from '@/lib/eventFinderSources';
export type { FinderSource } from '@/lib/eventFinderSources';

export const WINDOW_DAYS = 28;

export interface Occurrence {
  uid: string;
  title: string;
  date: string;            // YYYY-MM-DD, Gabriola time
  startTime: string | null; // HH:MM
  endTime: string | null;
  allDay: boolean;
  room: string | null;     // LOCATION in the feed (e.g. "main hall", "downstairs")
}

// Room bookings that aren't public events
const NOT_EVENTS = /\b(set\s*-?\s*up|setup|take\s*down|tear\s*down|clean\s*up|rehearsal|tuning|memorial|celebration of life|funeral|wedding|private|booked|hold|tentative|maintenance)\b|\?/i;

export const isLikelyPrivate = (title: string) => NOT_EVENTS.test(title);

// Wall-clock date and time of an instant. Times written with a named zone (TZID) are read back in
// that zone, so the hour is what the calendar shows even if this server's zone rules are out of
// date (B.C. stopped changing clocks in 2026). UTC times are shown in Gabriola time (UTC-7).
const zoneFor = (d: Date) => {
  const tz = (d as any)?.tz as string | undefined;
  return tz && !/^(utc|etc\/utc|etc\/gmt|z|gmt)$/i.test(tz) ? tz : GABRIOLA_TZ;
};
const ymdParts = (d: Date) => {
  let zone = zoneFor(d);
  try { new Intl.DateTimeFormat('en-CA', { timeZone: zone }); } catch { zone = GABRIOLA_TZ; }
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(d);
  const get = (t: string) => parts.find(p => p.type === t)?.value || '';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
};

// All-day dates are calendar days, not instants: read them in UTC so the day doesn't shift
const dateOnly = (d: Date) => d.toISOString().slice(0, 10);

/** Every occurrence in the feed between `from` and `from + days`, recurring events expanded. */
export function occurrencesFromIcs(text: string, from: Date, days = WINDOW_DAYS): Occurrence[] {
  const to = new Date(from.getTime() + days * 86400000);
  const data = ical.sync.parseICS(text);
  const out: Occurrence[] = [];

  for (const item of Object.values(data) as any[]) {
    if (!item || item.type !== 'VEVENT') continue;
    if (item.status && String(item.status).toUpperCase() === 'CANCELLED') continue;

    let instances: any[];
    try {
      instances = ical.expandRecurringEvent(item, { from, to, expandOngoing: false });
    } catch {
      continue;
    }

    for (const inst of instances) {
      const title = String(inst.summary ?? item.summary ?? '').trim();
      if (!title || !inst.start) continue;
      const start: Date = inst.start;
      const end: Date | null = inst.end || null;
      const allDay = !!inst.isFullDay || (start as any).dateOnly === true;

      if (allDay) {
        out.push({ uid: String(item.uid), title, date: dateOnly(start), startTime: null, endTime: null, allDay: true, room: item.location ? String(item.location) : null });
      } else {
        const s = ymdParts(start);
        const e = end ? ymdParts(end) : null;
        out.push({
          uid: String(item.uid), title, date: s.date, startTime: s.time,
          endTime: e && e.date === s.date ? e.time : null,
          allDay: false, room: item.location ? String(item.location) : null,
        });
      }
    }
  }
  return out.sort((a, b) => (a.date + (a.startTime || '')).localeCompare(b.date + (b.startTime || '')));
}

// Words that don't tell events apart
const STOP = new Set(['the', 'and', 'at', 'of', 'for', 'with', 'community', 'hall', 'gabriola', 'island',
  'centre', 'center', 'rollo', 'library', 'church', 'only', 'women', 'men', 'ladies', 'drop', 'in', 'drop-in',
  'night', 'day', 'meeting', 'program', 'session', 'class', 'classes', 'event', 'main', 'downstairs']);

export function titleWords(title: string): string[] {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ')
    .filter(w => w.length >= 3 && !STOP.has(w));
}

/** Same thing? Shares a meaningful word, or both titles have none and the times match. */
export function sameEvent(a: string, b: string): boolean {
  const wa = new Set(titleWords(a));
  const wb = titleWords(b);
  if (wa.size === 0 || wb.length === 0) return a.trim().toLowerCase() === b.trim().toLowerCase();
  return wb.some(w => wa.has(w) || Array.from(wa).some(x => (x.length >= 5 && w.length >= 5) && (x.startsWith(w) || w.startsWith(x))));
}


const toMin = (t: string | null) => {
  if (!t) return null;
  const [h, m] = t.slice(0, 5).split(':').map(Number);
  return h * 60 + m;
};

export interface OurEvent {
  id: string;
  title: string;
  start_date: string;
  start_time: string | null;
  venue_name: string | null;
  location: string | null;
}

/** Does one of our events on that day look like this occurrence? */
export function findMatch(occ: Occurrence, ours: OurEvent[]): OurEvent | null {
  const sameDay = ours.filter(e => String(e.start_date).slice(0, 10) === occ.date);
  return sameDay.find(e => {
    if (!sameEvent(e.title, occ.title)) return false;
    // Same words: also allow a time difference of up to 90 minutes (bookings include setup)
    const a = toMin(e.start_time);
    const b = toMin(occ.startTime);
    return a === null || b === null || Math.abs(a - b) <= 90;
  }) || null;
}
