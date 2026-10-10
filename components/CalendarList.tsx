// components/CalendarList.tsx
// Day-by-day list of events for the Calendar page (the default view on phones)
// Version: 1.1.0 - Adds realDescription(): hides stand-in descriptions such as
//                  "See the original listing for details." (shared with the Events page and pop-up)
// Previous: 1.0.0 - Day-by-day list
// Date: 2026-10-10

'use client';

import { useMemo, useState } from 'react';
import { format, isToday, isTomorrow, addDays, startOfDay } from 'date-fns';
import { Event } from '@/lib/types';

const DAYS_PER_PAGE = 14;

function toDate(v: Date | string | undefined | null): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

export function formatEventTime(time?: string | null, allDay?: boolean): string {
  if (allDay || !time) return 'All day';
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  if (isNaN(hour)) return time;
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

// Stand-in text saved when an event had no description; shown as no description
const PLACEHOLDER_DESCRIPTIONS = new Set([
  'see the original listing for details.',
  'no description provided.',
]);

export function realDescription(d?: string | null): string {
  const t = (d || '').trim();
  return PLACEHOLDER_DESCRIPTIONS.has(t.toLowerCase()) ? '' : t;
}

export function eventPlace(e: Event): string {
  return (e.venue_name || e.location || '').trim();
}

function dayHeading(d: Date): string {
  if (isToday(d)) return `Today · ${format(d, 'EEE MMM d')}`;
  if (isTomorrow(d)) return `Tomorrow · ${format(d, 'EEE MMM d')}`;
  return format(d, 'EEEE, MMMM d');
}

export default function CalendarList({ events, onSelect }: { events: Event[]; onSelect: (e: Event) => void }) {
  const [days, setDays] = useState(DAYS_PER_PAGE);
  const today = startOfDay(new Date());
  const lastDay = addDays(today, days);

  const { groups, more } = useMemo(() => {
    const byDay = new Map<string, { date: Date; items: Event[] }>();
    let later = 0;
    for (const e of events) {
      const d = toDate(e.start_date);
      if (!d || d < today) continue;
      if (d >= lastDay) { later++; continue; }
      const key = format(d, 'yyyy-MM-dd');
      if (!byDay.has(key)) byDay.set(key, { date: startOfDay(d), items: [] });
      byDay.get(key)!.items.push(e);
    }
    const groups = Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, g]) => ({
        key,
        date: g.date,
        items: g.items.sort((a, b) => (a.is_all_day ? '00:00' : a.start_time || '00:00').localeCompare(b.is_all_day ? '00:00' : b.start_time || '00:00')),
      }));
    return { groups, more: later };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, days]);

  return (
    <div className="px-4 pb-6">
      {groups.length === 0 && (
        <p className="text-[#5B6660] py-6 text-center">No events in the next {days} days.</p>
      )}

      {groups.map(g => (
        <section key={g.key} className="mt-5 first:mt-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gabriola-green-dark mb-2">{dayHeading(g.date)}</h2>
          <div className="bg-white border border-[#E3DCCF] rounded-2xl divide-y divide-[#EEE8DD] overflow-hidden">
            {g.items.map(e => (
              <button
                key={e.id}
                onClick={() => onSelect(e)}
                className="w-full text-left flex gap-3 px-4 py-3 min-h-[56px] hover:bg-[#F6F2EA] transition-colors"
              >
                <span className="w-[72px] flex-shrink-0 text-sm font-semibold text-gabriola-green pt-0.5">
                  {formatEventTime(e.start_time, e.is_all_day)}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[15px] font-semibold text-[#1F2A24] leading-snug">{e.title}</span>
                  {eventPlace(e) && <span className="block text-[13px] text-[#5B6660] truncate">{eventPlace(e)}</span>}
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}

      {more > 0 && (
        <div className="text-center mt-6">
          <button
            onClick={() => setDays(d => d + DAYS_PER_PAGE)}
            className="px-6 py-3 min-h-[48px] rounded-full border-2 border-gabriola-green text-gabriola-green font-semibold hover:bg-gabriola-green hover:text-white transition-colors"
          >
            Show the next {DAYS_PER_PAGE} days
          </button>
        </div>
      )}
    </div>
  );
}
