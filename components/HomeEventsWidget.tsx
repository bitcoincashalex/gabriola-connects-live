// components/HomeEventsWidget.tsx
// The two event cards on the front page:
//   TodayEventsWidget     what's still to come today (everything, programs included)
//   ComingUpWidget        the next three special events after today (no weekly programs)
// Both read one shared download of the events from four weeks back to six weeks ahead; the weeks
// back are what lets lib/eventKind.ts tell a weekly program from a one-off.
// Version: 1.3.1 - gabriolaTimeNow(): the time now in Gabriola ("9:39 AM"), for the front page strip
// Previous: 1.3.0 - Today card: something already under way says "On now" and when it ends, not its
//                  start time, and doesn't take one of the two "next" places
// Previous: 1.2.0 - Today card: the next two things by time always come first, special or not, so
//                  what's happening next isn't hidden on a day with several special events
// Previous: 1.1.0 - Today card: special events come first and are marked "Special", so a one-off
//                  (like the Remembrance Day gathering) isn't buried under the day's programs
// Previous: 1.0.0
// Date: 2026-11-15

'use client';

import { useState, useEffect } from 'react';
import { queryWithTimeout, supabase } from '@/lib/supabaseWithTimeout';
import { GABRIOLA_TZ } from '@/lib/gabriolaTime';
import { addDays } from '@/lib/eventSeries';
import { programIds, familyFor } from '@/lib/eventKind';

interface HomeEvent {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  is_all_day: boolean | null;
  location: string | null;
  category: string | null;
  series_id: string | null;
  is_recurring: boolean | null;
}

interface Loaded {
  today: string;        // Gabriola date, YYYY-MM-DD
  now: string;          // Gabriola time, HH:MM:SS
  events: HomeEvent[];
  programs: Set<string>;
}

const DAYS_BACK = 28;
const DAYS_AHEAD = 42;
const PAGE = 1000;

/** Gabriola's date and time right now, whatever the visitor's device is set to */
function gabriolaNow(): { today: string; now: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: GABRIOLA_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (t: string) => parts.find(p => p.type === t)?.value || '00';
  return { today: `${get('year')}-${get('month')}-${get('day')}`, now: `${get('hour')}:${get('minute')}:${get('second')}` };
}

async function download(): Promise<Loaded> {
  const { today, now } = gabriolaNow();
  const from = addDays(today, -DAYS_BACK);
  const to = addDays(today, DAYS_AHEAD);
  const events: HomeEvent[] = [];

  for (let page = 0; page < 5; page++) {
    const { data, error } = await queryWithTimeout(async () =>
      supabase
        .from('events')
        .select('id, title, start_date, end_date, start_time, end_time, is_all_day, location, category, series_id, is_recurring')
        .eq('is_approved', true)
        .is('deleted_at', null)
        .gte('start_date', from)
        .lte('start_date', to)
        .order('start_date', { ascending: true })
        .order('start_time', { ascending: true, nullsFirst: true })
        .order('id', { ascending: true })
        .range(page * PAGE, page * PAGE + PAGE - 1)
    );
    if (error) throw error;
    const rows = (data || []) as HomeEvent[];
    events.push(...rows);
    if (rows.length < PAGE) break;
  }
  return { today, now, events, programs: programIds(events) };
}

// One download shared by both cards, refreshed every five minutes
let shared: { at: number; promise: Promise<Loaded> } | null = null;
function load(): Promise<Loaded> {
  if (!shared || Date.now() - shared.at > 290000) {
    const promise = download();
    shared = { at: Date.now(), promise };
    promise.catch(() => { if (shared && shared.promise === promise) shared = null; });
  }
  return shared.promise;
}

function useHomeEvents() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    const run = () => load()
      .then(l => { if (live) { setLoaded(l); setFailed(false); } })
      .catch(err => { console.error('Error loading front page events:', err); if (live) setFailed(true); });
    run();
    const timer = setInterval(run, 300000);
    return () => { live = false; clearInterval(timer); };
  }, []);
  return { loaded, failed };
}

/** "15:00:00" -> "3:00 PM" ('' when there's no usable time) */
const clock = (t: string | null): string => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h)) return '';
  return `${h % 12 || 12}:${String(m || 0).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

const timeLabel = (e: HomeEvent): string => (e.is_all_day ? '' : clock(e.start_time)) || 'All day';

/** "Sat Nov 14" */
const dayLabel = (d: string): string =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString('en-CA', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' }).replace(/[.,]/g, '');

/** "Tuesday, November 10", in Gabriola time (for the front page) */
export function gabriolaDateLine(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: GABRIOLA_TZ, weekday: 'long', month: 'long', day: 'numeric' });
}

/** "9:39 AM", the time now in Gabriola */
export function gabriolaTimeNow(): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: GABRIOLA_TZ, hour: 'numeric', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const h = Number(parts.find(p => p.type === 'hour')?.value);
  const m = parts.find(p => p.type === 'minute')?.value || '00';
  return `${h % 12 || 12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
}

const Note = ({ children }: { children: React.ReactNode }) => (
  <div className="text-sm text-[#5B6660] pt-3 border-t border-[#EEE8DD]">{children}</div>
);

const Dot = ({ category }: { category: string | null }) => (
  <span
    aria-hidden="true"
    className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
    style={{ backgroundColor: familyFor(category).color }}
  />
);

const TODAY_ROWS = 4;
const NEXT_UP = 2;

export function TodayEventsWidget() {
  const { loaded, failed } = useHomeEvents();
  if (failed && !loaded) return <Note>Unable to load events. Please refresh the page to try again.</Note>;
  if (!loaded) return <Note>Loading...</Note>;

  const { today, now, events, programs } = loaded;
  const day = (d: string | null) => (d ? String(d).slice(0, 10) : '');
  const left = events.filter(e => {
    const start = day(e.start_date);
    const end = day(e.end_date) || start;
    if (start > today || end < today) return false;          // not on today
    if (start < today) return true;                           // a longer event still running
    if (e.is_all_day || !e.start_time) return true;           // all day
    return (e.end_time || e.start_time) > now;                // not over yet
  });
  // Timed events first, in order; all-day ones after
  const timed = left.filter(e => !e.is_all_day && e.start_time && day(e.start_date) === today);
  const allDay = left.filter(e => !timed.includes(e));
  // What's next first (the two soonest by time, special or not), then the rest of the day's
  // special events, then the regular programs; each in time order
  // Already under way (started, not over): at most one leads the card, marked "On now"
  const started = (e: HomeEvent) => timed.includes(e) && (e.start_time as string) <= now;
  const onNow = timed.filter(started);
  const upcoming = timed.filter(e => !started(e));
  const nextUp = [...onNow.slice(0, 1), ...upcoming.slice(0, NEXT_UP)];
  const later = [...upcoming.slice(NEXT_UP), ...onNow.slice(1), ...allDay];
  const rows = [...nextUp, ...later.filter(e => !programs.has(e.id)), ...later.filter(e => programs.has(e.id))];

  if (rows.length === 0) return <Note>Nothing more today.</Note>;

  return (
    <div className="flex flex-col">
      {rows.slice(0, TODAY_ROWS).map(e => (
        <div key={e.id} className="flex gap-3 pt-2.5 pb-2.5 border-t border-[#EEE8DD] last:pb-0">
          <span className="w-[76px] flex-shrink-0 whitespace-nowrap text-sm font-semibold text-gabriola-green pt-0.5">
            {started(e) ? 'On now' : timeLabel(e)}
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[15px] font-semibold leading-snug line-clamp-2"><Dot category={e.category} />{e.title}</span>
            {!programs.has(e.id) && (
              <span className="inline-block mt-0.5 mr-1.5 px-1.5 py-0.5 rounded-full bg-[#FBEFD5] text-[#7A4A00] text-[11px] font-bold uppercase tracking-wide">Special</span>
            )}
            {started(e) && (
              <span className="block text-[13px] text-[#5B6660]">
                Started {clock(e.start_time)}{e.end_time && clock(e.end_time) ? `, until ${clock(e.end_time)}` : ''}
              </span>
            )}
            {e.location && <span className="block text-[13px] text-[#5B6660] truncate">{e.location}</span>}
          </span>
        </div>
      ))}
      {rows.length > TODAY_ROWS && (
        <div className="text-sm font-semibold text-gabriola-green pt-2.5 border-t border-[#EEE8DD]">
          + {rows.length - TODAY_ROWS} more today
        </div>
      )}
    </div>
  );
}

export function ComingUpWidget() {
  const { loaded, failed } = useHomeEvents();
  if (failed && !loaded) return <Note>Unable to load events. Please refresh the page to try again.</Note>;
  if (!loaded) return <Note>Loading...</Note>;

  const { today, events, programs } = loaded;
  const tomorrow = addDays(today, 1);
  const next = events
    .filter(e => String(e.start_date).slice(0, 10) > today && !programs.has(e.id))
    .slice(0, 3);

  if (next.length === 0) return <Note>No special events listed for the next six weeks.</Note>;

  return (
    <div className="flex flex-col">
      {next.map(e => {
        const d = String(e.start_date).slice(0, 10);
        return (
          <div key={e.id} className="pt-2.5 pb-2.5 border-t border-[#EEE8DD] last:pb-0 space-y-0.5">
            <div className="text-[15px] font-semibold leading-snug line-clamp-2"><Dot category={e.category} />{e.title}</div>
            <div className="text-sm font-semibold text-gabriola-green">
              {d === tomorrow ? 'Tomorrow' : dayLabel(d)} · {timeLabel(e)}
            </div>
            {e.location && <div className="text-[13px] text-[#5B6660] truncate">{e.location}</div>}
          </div>
        );
      })}
    </div>
  );
}
