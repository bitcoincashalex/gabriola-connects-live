// lib/eventSeries.ts
// Repeating events: works out the dates of a weekly, every-2-weeks or monthly event.
// Each date is saved as its own event, linked by series_id (the id of the first one).
// Version: 1.0.0
// Date: 2026-11-03

export type Repeat = 'none' | 'weekly' | 'biweekly' | 'monthly';

export const REPEAT_OPTIONS: { value: Repeat; label: string }[] = [
  { value: 'none', label: "Doesn't repeat" },
  { value: 'weekly', label: 'Every week' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Every month (same weekday)' },
];

export const MAX_MONTHS = 6;

const ORDINAL = ['first', 'second', 'third', 'fourth', 'fifth'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// 'YYYY-MM-DD' <-> UTC dates, so phone time zones can't move a date
const toUTC = (d: string) => {
  const [y, m, day] = d.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day));
};
const toISO = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(date: string, days: number): string {
  const d = toUTC(date);
  d.setUTCDate(d.getUTCDate() + days);
  return toISO(d);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUTC(to).getTime() - toUTC(from).getTime()) / 86400000);
}

/** Last date a series may run to: MAX_MONTHS after the start. */
export function latestUntil(start: string): string {
  const d = toUTC(start);
  d.setUTCMonth(d.getUTCMonth() + MAX_MONTHS);
  return toISO(d);
}

/** Every date from start up to and including until (capped at MAX_MONTHS). */
export function seriesDates(start: string, repeat: Repeat, until: string): string[] {
  if (!start) return [];
  if (repeat === 'none' || !until) return [start.slice(0, 10)];
  const last = until > latestUntil(start) ? latestUntil(start) : until;
  const out: string[] = [];

  if (repeat === 'weekly' || repeat === 'biweekly') {
    const step = repeat === 'weekly' ? 7 : 14;
    for (let d = start.slice(0, 10); d <= last; d = addDays(d, step)) out.push(d);
    return out;
  }

  // Monthly: the same weekday in the same week of the month (e.g. first Tuesday).
  // A fifth-weekday start skips months that don't have one.
  const s = toUTC(start);
  const weekday = s.getUTCDay();
  const nth = Math.floor((s.getUTCDate() - 1) / 7);
  for (let i = 0; i <= MAX_MONTHS + 1; i++) {
    const first = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth() + i, 1));
    const offset = (weekday - first.getUTCDay() + 7) % 7;
    const d = new Date(first);
    d.setUTCDate(1 + offset + nth * 7);
    if (d.getUTCMonth() !== first.getUTCMonth()) continue;
    const iso = toISO(d);
    if (iso > last) break;
    out.push(iso);
  }
  return out;
}

/** Words saved with the event, e.g. "Every week" or "First Tuesday of every month". */
export function repeatLabel(start: string, repeat: Repeat): string {
  if (repeat === 'weekly') return 'Every week';
  if (repeat === 'biweekly') return 'Every 2 weeks';
  if (repeat === 'monthly' && start) {
    const s = toUTC(start);
    const nth = ORDINAL[Math.floor((s.getUTCDate() - 1) / 7)];
    return `${nth.charAt(0).toUpperCase()}${nth.slice(1)} ${DAYS[s.getUTCDay()]} of every month`;
  }
  return '';
}

/** "Nov 3, 2026" from 'YYYY-MM-DD', without time zone surprises. */
export function prettyDate(date: string): string {
  return toUTC(date).toLocaleDateString('en-CA', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' });
}
