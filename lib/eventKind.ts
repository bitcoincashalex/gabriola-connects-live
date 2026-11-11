// lib/eventKind.ts
// Two things the calendar and the front page share:
//   1. Special event or regular program? A program is part of a repeating series, or has the same
//      title three or more times within about five weeks (Line Dancing, AA meetings, Gym Jam).
//      Everything else is a special event (a concert, a craft fair, an AGM). Worked out from the
//      events themselves, so nobody has to tag anything.
//   2. The colour family for a category: seven colours for the fifteen categories, because fifteen
//      can't be told apart in a small calendar entry.
// Version: 1.1.0 - The place on the end of a title is ignored when matching ("Drop-In Indoor Soccer @
//                  Gabriola Elementary" is the same program as "Drop-in Indoor Soccer")
// Previous: 1.0.0
// Date: 2026-11-11

import { ymd, daysBetween } from '@/lib/eventSeries';

const WINDOW_DAYS = 35;
const MIN_REPEATS = 3;

// Same program, typed differently from week to week: ignore capitals, punctuation, and a place on
// the end ("... @ Gabriola Elementary", "... at the Community Hall")
const titleKey = (t: string) => {
  const whole = String(t || '').toLowerCase();
  const noPlace = whole.replace(/\s+(@|at)\s+.*$/, '');
  return (noPlace.trim() || whole).replace(/[^a-z0-9]+/g, ' ').trim();
};

/** Ids of the events that are regular programs. Pass every event you have, not just one day's. */
export function programIds(events: any[]): Set<string> {
  const out = new Set<string>();
  const byTitle = new Map<string, { id: string; day: string }[]>();

  for (const e of events || []) {
    if (!e || !e.start_date) continue;
    if (e.series_id || e.is_recurring === true) out.add(e.id);
    const key = titleKey(e.title);
    if (!key) continue;
    if (!byTitle.has(key)) byTitle.set(key, []);
    byTitle.get(key)!.push({ id: e.id, day: ymd(e.start_date) });
  }

  byTitle.forEach(list => {
    if (list.length < MIN_REPEATS) return;
    list.sort((a, b) => a.day.localeCompare(b.day));
    // Any run of MIN_REPEATS dates inside the window makes all of them programs
    for (let i = 0; i + MIN_REPEATS - 1 < list.length; i++) {
      const last = i + MIN_REPEATS - 1;
      if (daysBetween(list[i].day, list[last].day) <= WINDOW_DAYS) {
        for (let k = i; k <= last; k++) out.add(list[k].id);
      }
    }
  });
  return out;
}

export interface Family {
  key: string;
  label: string;
  color: string;   // dot
  tint: string;    // entry background
  edge: string;    // entry border
}

export const FAMILIES: Family[] = [
  { key: 'music',     label: 'Music, arts & culture',              color: '#7A3E72', tint: '#F1E7F0', edge: '#C9A9C4' },
  { key: 'market',    label: 'Markets, fairs & fundraisers',       color: '#A8650A', tint: '#F7EDDD', edge: '#DDBE8E' },
  { key: 'community', label: 'Community & meetings',               color: '#2F5D8A', tint: '#E4ECF4', edge: '#A6BDD4' },
  { key: 'health',    label: 'Health, wellness & seniors',         color: '#1F7A78', tint: '#E1F0EF', edge: '#9CCBC9' },
  { key: 'sport',     label: 'Sports, recreation & environment',   color: '#2D5F3F', tint: '#E4EEE7', edge: '#A5C2AF' },
  { key: 'kids',      label: 'Kids & family',                      color: '#C4532F', tint: '#FAE9E3', edge: '#E7B4A3' },
  { key: 'learn',     label: 'Education & workshops',              color: '#4B4A9C', tint: '#E9E9F5', edge: '#B3B2D9' },
];

const BY_CATEGORY: Record<string, string> = {
  'music': 'music', 'arts & culture': 'music', 'arts': 'music', 'festival': 'music',
  'market': 'market', 'markets & fairs': 'market', 'fundraiser': 'market', 'food & drink': 'market',
  'community': 'community', 'meeting': 'community', 'other': 'community',
  'health & wellness': 'health', 'health': 'health', 'seniors': 'health',
  'sports & recreation': 'sport', 'recreation': 'sport', 'environment': 'sport',
  'kids & family': 'kids', 'family & kids': 'kids',
  'education & workshops': 'learn', 'education': 'learn',
};

/** Colour family for an event's category (Community when the category is missing or unknown). */
export function familyFor(category: string | null | undefined): Family {
  const key = BY_CATEGORY[String(category || '').trim().toLowerCase()] || 'community';
  return FAMILIES.find(f => f.key === key)!;
}
