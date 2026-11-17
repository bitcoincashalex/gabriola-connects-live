// lib/ferryEstimate.ts
// Works out when the next ferry is actually expected to leave when the boats are running late.
// Version: 1.1.0 - Sailings cancelled or at risk in a BC Ferries service notice (lib/ferryNotices.ts)
//                  count as cancelled / at risk, both directions; nextRunning() skips cancelled ones
// Previous: 1.0.0
// Date: 2026-11-17
//
// BC Ferries only publishes actual departure times for sailings leaving Nanaimo Harbour, and
// never an expected time for sailings still to come. So the estimate is: the delay of the most
// recent Nanaimo departure carries forward to the sailings in the next 90 minutes, both ways
// (the same boats run both directions). Once a delay is more than 90 minutes old it is dropped
// and the schedule is used as normal.

import { displayToMinutes, sqlTimeToMinutes } from '@/lib/ferryTime';
import type { NoticeStatus } from '@/lib/ferryNotices';

export const SHOW_LATE_FROM = 5;       // delays under this many minutes are treated as on time
const DELAY_STILL_VALID = 90;          // a departure older than this no longer predicts anything
const CARRY_FORWARD = 90;              // only sailings scheduled within this many minutes get the delay
const NOT_YET_LEFT_GRACE = 15;         // Nanaimo: keep "leaving now" this long after the expected time
                                       // if BC Ferries hasn't shown it as departed yet (updates every 5 min)

export interface LiveRow {
  scheduled_time: string;              // "13:10:00"
  actual_departure: string | null;
  delay_minutes: number | null;
  status: string;                      // departed | upcoming | cancelled | other
  reason?: string | null;
}

export interface Delay {
  minutes: number;                     // how late the last Nanaimo sailing left
  fromScheduled: string;               // "13:10:00" (that sailing)
  leftAt: string;                      // "13:25:00"
}

// The delay to carry forward right now, or null if the boats are on time (or no fresh live data)
export function currentDelay(live: LiveRow[], liveFresh: boolean, nowMin: number): Delay | null {
  if (!liveFresh) return null;
  const last = [...live].reverse().find(l => l.status === 'departed' && l.actual_departure);
  if (!last || !last.actual_departure) return null;
  const late = last.delay_minutes || 0;
  if (late < SHOW_LATE_FROM) return null;
  if (nowMin - sqlTimeToMinutes(last.actual_departure) > DELAY_STILL_VALID) return null;
  return { minutes: late, fromScheduled: last.scheduled_time, leftAt: last.actual_departure };
}

// Expected departure (minutes after midnight) for a sailing scheduled at schedMin
export function expectedMinutes(schedMin: number, delay: Delay | null, nowMin: number): number {
  if (!delay) return schedMin;
  if (schedMin > nowMin + CARRY_FORWARD) return schedMin;
  return schedMin + delay.minutes;
}

export interface SailingView {
  index: number;
  scheduledMin: number;
  expectedMin: number;                 // same as scheduledMin when on time
  late: number;                        // expectedMin - scheduledMin
  cancelled: boolean;
  atRisk?: boolean;                    // BC Ferries' notice says it may be cancelled
}

// Has this sailing not left yet? Uses BC Ferries' departed flag for Nanaimo when there is one.
export function stillToLeave(
  time: string, index: number, delay: Delay | null, nowMin: number,
  liveRow: LiveRow | undefined, liveFresh: boolean, notice?: NoticeStatus,
): SailingView | null {
  const sched = displayToMinutes(time);
  if (sched === null) return null;
  const cancelled = liveFresh && (liveRow?.status === 'cancelled' || (notice === 'cancelled' && liveRow?.status !== 'departed'));
  if (cancelled) return sched > nowMin ? { index, scheduledMin: sched, expectedMin: sched, late: 0, cancelled: true } : null;
  if (liveFresh && liveRow?.status === 'departed') return null;
  const expected = expectedMinutes(sched, delay, nowMin);
  const view: SailingView = { index, scheduledMin: sched, expectedMin: expected, late: expected - sched, cancelled: false };
  if (liveFresh && notice === 'at_risk') view.atRisk = true;
  if (expected >= nowMin) return view;
  // Nanaimo only: BC Ferries hasn't shown it leaving yet, so it's probably leaving now
  if (liveFresh && liveRow && delay && nowMin - expected <= NOT_YET_LEFT_GRACE) return view;
  return null;
}

// The sailings still to come, in order, with their expected times
export function upcomingSailings(
  times: string[], delay: Delay | null, nowMin: number,
  liveByMinutes: Map<number, LiveRow> | null, liveFresh: boolean,
  noticeByMinutes?: Map<number, NoticeStatus>,
): SailingView[] {
  const out: SailingView[] = [];
  times.forEach((t, i) => {
    const sched = displayToMinutes(t);
    const row = sched !== null && liveByMinutes ? liveByMinutes.get(sched) : undefined;
    const notice = sched !== null && noticeByMinutes ? noticeByMinutes.get(sched) : undefined;
    const v = stillToLeave(t, i, delay, nowMin, row, liveFresh, notice);
    if (v) out.push(v);
  });
  return out;
}

// The next sailing that is actually running, and the cancelled ones skipped to get to it
export function nextRunning(views: SailingView[]): { next: SailingView | undefined; skipped: SailingView[]; after: SailingView[] } {
  const i = views.findIndex(v => !v.cancelled);
  if (i === -1) return { next: undefined, skipped: views, after: [] };
  return { next: views[i], skipped: views.slice(0, i), after: views.slice(i + 1).filter(v => !v.cancelled) };
}

// 805 -> "1:25 PM"
export function minutesToDisplay(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m % 60).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
