// components/NextFerryWidget.tsx
// Next ferry from both terminals (body of the front page Ferry card)
// Version: 6.1.1 - Gabriola time is fixed UTC-7 (lib/gabriolaTime.ts): B.C. no longer falls back, but many devices think it does
// Previous: 6.1.0 - Running late: shows the expected departure with the scheduled time under it,
//                  and keeps showing a sailing until it has actually gone (same rules as the
//                  Ferry page, lib/ferryEstimate.ts). On time it says "Scheduled".
// Previous: 6.0.0 - Front page redesign: the card (icon, title) is now drawn by the front page.
//                  Each next sailing shows how long until it leaves ("in 15 min"), counted from
//                  the current Gabriola time and updated every 30 seconds.
// Previous: 5.4.0 - Live line only when it matters: Nanaimo sailings 10+ min late, or a
//                  cancellation. One short line, no "on time" line, no "Live" tag.
// Previous: 5.3.0 - Live line always shows (on time / late from 2 min / cancelled)
// Previous: 5.2.0 - Uses the public widget connection (no login wait), lets the database use
//                  Gabriola time instead of the visitor's clock, and shows a live delay or
//                  cancellation line from BC Ferries when Nanaimo sailings are running late
// Previous: 5.1.0 - Removed timeout (BC Ferries needs time) + removed sailing count (not useful)
// Date: 2026-11-01

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseWithTimeout';
import { AlertCircle } from 'lucide-react';
import { currentDelay, upcomingSailings, minutesToDisplay, SHOW_LATE_FROM, LiveRow, SailingView } from '@/lib/ferryEstimate';
import { GABRIOLA_TZ } from '@/lib/gabriolaTime';

interface Sailing {
  time: string;
  arrivalTime: string;
}

// Minutes since midnight, Gabriola time
function pacificNowMinutes(): number {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: GABRIOLA_TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  return Number(parts.find(p => p.type === 'hour')?.value) * 60 + Number(parts.find(p => p.type === 'minute')?.value);
}

function untilText(dep: number, nowMin: number): string {
  const diff = dep - nowMin;
  if (diff <= 0) return 'leaving now';
  if (diff < 60) return `in ${diff} min`;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m === 0 ? `in ${h} hr` : `in ${h} hr ${m} min`;
}

export function NextFerryWidget() {
  const [schedule, setSchedule] = useState<{ fromGabriola: Sailing[]; fromNanaimo: Sailing[] } | null>(null);
  const [live, setLive] = useState<LiveRow[]>([]);
  const [liveFresh, setLiveFresh] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [liveNote, setLiveNote] = useState<{ text: string; kind: 'cancelled' | 'late' } | null>(null);
  const [nowMin, setNowMin] = useState<number>(() => pacificNowMinutes());

  useEffect(() => {
    const loadNextFerries = async () => {
      try {
        // No time passed: the database uses the current Gabriola time
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: GABRIOLA_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
        const [scheduleResult, liveResult, metaResult] = await Promise.all([
          supabase.rpc('get_ferry_schedule'),
          supabase
            .from('ferry_live_sailings')
            .select('scheduled_time, actual_departure, delay_minutes, status, updated_at')
            .eq('route', 'NAH-GAB')
            .eq('sailing_date', today)
            .order('scheduled_time'),
          supabase.from('ferry_live_meta').select('last_success_at').eq('route', 'NAH-GAB').maybeSingle(),
        ]);

        if (scheduleResult.data) {
          setSchedule({ fromGabriola: scheduleResult.data.fromGabriola || [], fromNanaimo: scheduleResult.data.fromNanaimo || [] });
        }
        setNowMin(pacificNowMinutes());

        // Live note from BC Ferries (only if checked in the last 20 minutes)
        const fresh = !!metaResult.data?.last_success_at &&
          Date.now() - new Date(metaResult.data.last_success_at).getTime() < 20 * 60 * 1000;
        const live = (liveResult.data || []) as LiveRow[];
        setLive(live);
        setLiveFresh(fresh);
        const toDisplay = (t: string) => {
          const [h, m] = t.split(':').map(Number);
          return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
        };
        let note: { text: string; kind: 'cancelled' | 'late' } | null = null;
        if (fresh) {
          // Cancellations still relevant: upcoming, or within the last hour
          const current = pacificNowMinutes();
          const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
          const cancelled = live.filter(l => l.status === 'cancelled' && toMin(l.scheduled_time) >= current - 60);
          if (cancelled.length > 0) {
            note = { kind: 'cancelled', text: `Cancelled: ${cancelled.map(c => toDisplay(c.scheduled_time)).join(', ')} from Nanaimo` };
          }
        }
        setLiveNote(note);
      } catch (error) {
        console.error('Error loading ferry times:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadNextFerries();

    // Refresh sailings every 60 seconds; countdown every 30 seconds
    const interval = setInterval(loadNextFerries, 60000);
    const tick = setInterval(() => setNowMin(pacificNowMinutes()), 30000);
    return () => { clearInterval(interval); clearInterval(tick); };
  }, []);

  if (isLoading) {
    return <div className="text-sm text-[#5B6660]">Loading...</div>;
  }

  if (!schedule) {
    return <div className="text-base text-[#5B6660]">Ferry times unavailable right now</div>;
  }

  const delay = currentDelay(live, liveFresh, nowMin);
  const liveByMinutes = new Map(live.map(l => {
    const [h, m] = l.scheduled_time.split(':').map(Number);
    return [h * 60 + m, l] as [number, LiveRow];
  }));
  const nextG = upcomingSailings(schedule.fromGabriola.map(s => s.time), delay, nowMin, null, liveFresh)[0];
  const nextN = upcomingSailings(schedule.fromNanaimo.map(s => s.time), delay, nowMin, liveByMinutes, liveFresh)[0];

  if (!nextG && !nextN) {
    return <div className="text-base text-[#5B6660]">Service ended for today</div>;
  }

  const Box = ({ label, list, v }: { label: string; list: Sailing[]; v: SailingView | undefined }) => {
    const late = v && !v.cancelled && v.late >= SHOW_LATE_FROM ? v.late : 0;
    return (
      <div className={`rounded-xl p-3 ${late ? 'bg-[#FDF0E1]' : 'bg-[#F3F5FA]'}`}>
        <div className="text-[13px] text-[#5B6660]">{label}</div>
        {v ? (
          v.cancelled ? (
            <>
              <div className="text-2xl font-bold text-[#B42318] leading-tight line-through">{list[v.index].time}</div>
              <div className="text-[13px] font-semibold text-[#B42318]">Cancelled</div>
            </>
          ) : late ? (
            <>
              <div className="text-[12px] font-bold text-[#8A3E00]">Expected about</div>
              <div className="text-2xl font-bold text-[#8A3E00] leading-tight">{minutesToDisplay(v.expectedMin)}</div>
              <div className="text-[13px] font-semibold text-[#1F2A24]">{untilText(v.expectedMin, nowMin)}</div>
              <div className="text-[12px] text-[#8A3E00]">Scheduled {list[v.index].time}</div>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold text-[#002774] leading-tight">{list[v.index].time}</div>
              <div className="text-[13px] font-semibold text-[#1F2A24]">{untilText(v.scheduledMin, nowMin)}</div>
              <div className="text-[12px] text-[#5B6660]">Scheduled</div>
            </>
          )
        ) : (
          <div className="text-base text-[#5B6660] mt-1">Done for today</div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2.5">
        <Box label="From Gabriola" list={schedule.fromGabriola} v={nextG} />
        <Box label="From Nanaimo" list={schedule.fromNanaimo} v={nextN} />
      </div>

      {delay && (
        <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold bg-[#FDF0E1] text-[#8A3E00]">
          <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span>Running about {delay.minutes} min late</span>
        </div>
      )}

      {/* Live delay / cancellation from BC Ferries */}
      {liveNote && (
        <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${liveNote.kind === 'cancelled' ? 'bg-[#B42318] text-white' : 'bg-[#FDF0E1] text-[#8A3E00]'}`}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span>{liveNote.text}</span>
        </div>
      )}
    </div>
  );
}
