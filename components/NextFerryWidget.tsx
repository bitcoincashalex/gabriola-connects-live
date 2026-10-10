// components/NextFerryWidget.tsx
// Next ferry from both terminals (body of the front page Ferry card)
// Version: 6.0.0 - Front page redesign: the card (icon, title) is now drawn by the front page.
//                  Each next sailing shows how long until it leaves ("in 15 min"), counted from
//                  the current Gabriola time and updated every 30 seconds.
// Previous: 5.4.0 - Live line only when it matters: Nanaimo sailings 10+ min late, or a
//                  cancellation. One short line, no "on time" line, no "Live" tag.
// Previous: 5.3.0 - Live line always shows (on time / late from 2 min / cancelled)
// Previous: 5.2.0 - Uses the public widget connection (no login wait), lets the database use
//                  Gabriola time instead of the visitor's clock, and shows a live delay or
//                  cancellation line from BC Ferries when Nanaimo sailings are running late
// Previous: 5.1.0 - Removed timeout (BC Ferries needs time) + removed sailing count (not useful)
// Date: 2026-10-10

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseWithTimeout';
import { AlertCircle } from 'lucide-react';

interface FerryInfo {
  time: string;
  departureTime: string;
  arrivalTime: string;
  departureTerminal: string;
  arrivalTerminal: string;
}

// Minutes since midnight, Gabriola time
function pacificNowMinutes(): number {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Vancouver', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  return Number(parts.find(p => p.type === 'hour')?.value) * 60 + Number(parts.find(p => p.type === 'minute')?.value);
}

// "1:10 PM" -> minutes since midnight
function displayToMinutes(t: string): number | null {
  const m = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === 'PM') h += 12;
  return h * 60 + Number(m[2]);
}

function untilText(t: string, nowMin: number): string | null {
  const dep = displayToMinutes(t);
  if (dep === null) return null;
  const diff = dep - nowMin;
  if (diff <= 0) return 'leaving now';
  if (diff < 60) return `in ${diff} min`;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m === 0 ? `in ${h} hr` : `in ${h} hr ${m} min`;
}

export function NextFerryWidget() {
  const [fromGabriola, setFromGabriola] = useState<FerryInfo | null>(null);
  const [fromNanaimo, setFromNanaimo] = useState<FerryInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [liveNote, setLiveNote] = useState<{ text: string; kind: 'cancelled' | 'late' } | null>(null);
  const [nowMin, setNowMin] = useState<number>(() => pacificNowMinutes());

  useEffect(() => {
    const loadNextFerries = async () => {
      try {
        // No time passed: the database uses the current Gabriola time
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Vancouver', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
        const [gabriolaResult, nanaimoResult, liveResult, metaResult] = await Promise.all([
          supabase.rpc('get_next_ferry', { from_location: 'Gabriola' }),
          supabase.rpc('get_next_ferry', { from_location: 'Nanaimo' }),
          supabase
            .from('ferry_live_sailings')
            .select('scheduled_time, actual_departure, delay_minutes, status, updated_at')
            .eq('route', 'NAH-GAB')
            .eq('sailing_date', today)
            .order('scheduled_time'),
          supabase.from('ferry_live_meta').select('last_success_at').eq('route', 'NAH-GAB').maybeSingle(),
        ]);

        setFromGabriola(gabriolaResult.data);
        setFromNanaimo(nanaimoResult.data);
        setNowMin(pacificNowMinutes());

        // Live note from BC Ferries (only if checked in the last 20 minutes)
        const fresh = metaResult.data?.last_success_at &&
          Date.now() - new Date(metaResult.data.last_success_at).getTime() < 20 * 60 * 1000;
        const live = (liveResult.data || []) as { scheduled_time: string; actual_departure: string | null; delay_minutes: number | null; status: string }[];
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
          const lastDeparted = [...live].reverse().find(l => l.status === 'departed');
          if (cancelled.length > 0) {
            note = { kind: 'cancelled', text: `Cancelled: ${cancelled.map(c => toDisplay(c.scheduled_time)).join(', ')} from Nanaimo` };
          } else if (lastDeparted && (lastDeparted.delay_minutes || 0) >= 10) {
            note = { kind: 'late', text: `Running ${lastDeparted.delay_minutes} min late from Nanaimo` };
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

  if (!fromGabriola && !fromNanaimo) {
    return <div className="text-base text-[#5B6660]">Service ended for today</div>;
  }

  const Box = ({ label, ferry }: { label: string; ferry: FerryInfo | null }) => (
    <div className="bg-[#F3F5FA] rounded-xl p-3">
      <div className="text-[13px] text-[#5B6660]">{label}</div>
      {ferry ? (
        <>
          <div className="text-2xl font-bold text-[#002774] leading-tight">{ferry.time}</div>
          {untilText(ferry.time, nowMin) && (
            <div className="text-[13px] font-semibold text-[#1F2A24]">{untilText(ferry.time, nowMin)}</div>
          )}
        </>
      ) : (
        <div className="text-base text-[#5B6660] mt-1">Done for today</div>
      )}
    </div>
  );

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2.5">
        <Box label="From Gabriola" ferry={fromGabriola} />
        <Box label="From Nanaimo" ferry={fromNanaimo} />
      </div>

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
