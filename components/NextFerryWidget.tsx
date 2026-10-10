// components/NextFerryWidget.tsx
// Ferry display for landing page - REDESIGNED
// Shows next ferry from both terminals - NO TIMEOUT (BC Ferries API can be slow)
// Version: 5.3.0 - Live line always shows when BC Ferries data is fresh: last Nanaimo sailing
//                  "on time" or "X min late" (from 2 minutes), or a cancellation
// Previous: 5.2.0 - Uses the public widget connection (no login wait), lets the database use
//                  Gabriola time instead of the visitor's clock, and shows a live delay or
//                  cancellation line from BC Ferries when Nanaimo sailings are running late
// Previous: 5.1.0 - Removed timeout (BC Ferries needs time) + removed sailing count (not useful)
// Date: 2026-10-10

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseWithTimeout';
import { Anchor, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface FerryInfo {
  time: string;
  departureTime: string;
  arrivalTime: string;
  departureTerminal: string;
  arrivalTerminal: string;
}

export function NextFerryWidget() {
  const [fromGabriola, setFromGabriola] = useState<FerryInfo | null>(null);
  const [fromNanaimo, setFromNanaimo] = useState<FerryInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [liveNote, setLiveNote] = useState<{ text: string; kind: 'cancelled' | 'late' | 'ontime' } | null>(null);

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

        // Live note from BC Ferries (only if checked in the last 20 minutes)
        const fresh = metaResult.data?.last_success_at &&
          Date.now() - new Date(metaResult.data.last_success_at).getTime() < 20 * 60 * 1000;
        const live = (liveResult.data || []) as { scheduled_time: string; actual_departure: string | null; delay_minutes: number | null; status: string }[];
        const toDisplay = (t: string) => {
          const [h, m] = t.split(':').map(Number);
          return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
        };
        let note: { text: string; kind: 'cancelled' | 'late' | 'ontime' } | null = null;
        if (fresh) {
          // Cancellations still relevant: upcoming, or within the last hour
          const nowParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Vancouver', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
          const nowMin = Number(nowParts.find(p => p.type === 'hour')?.value) * 60 + Number(nowParts.find(p => p.type === 'minute')?.value);
          const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
          const cancelled = live.filter(l => l.status === 'cancelled' && toMin(l.scheduled_time) >= nowMin - 60);
          const lastDeparted = [...live].reverse().find(l => l.status === 'departed');
          if (cancelled.length > 0) {
            note = { kind: 'cancelled', text: `Cancelled from Nanaimo: ${cancelled.map(c => toDisplay(c.scheduled_time)).join(', ')}` };
          } else if (lastDeparted && lastDeparted.actual_departure) {
            const late = lastDeparted.delay_minutes || 0;
            note = late >= 2
              ? { kind: 'late', text: `Last from Nanaimo: ${toDisplay(lastDeparted.scheduled_time)} left ${toDisplay(lastDeparted.actual_departure)}, ${late} min late` }
              : { kind: 'ontime', text: `Last from Nanaimo: ${toDisplay(lastDeparted.scheduled_time)}, on time` };
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

    // Refresh every 60 seconds
    const interval = setInterval(loadNextFerries, 60000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="text-white/70 text-sm">
        Loading...
      </div>
    );
  }

  // Handle case where both are done for the day
  if (!fromGabriola && !fromNanaimo) {
    return (
      <div className="space-y-3">
        {/* Big Icon LEFT + Big Title RIGHT - Like Alerts */}
        <div className="flex items-center gap-4">
          {/* Big Icon in Circle */}
          <div className="p-4 bg-white/20 rounded-full flex-shrink-0">
            <Anchor className="w-10 h-10 text-white" />
          </div>
          
          {/* Big Title */}
          <h3 className="text-3xl font-bold text-white">
            Ferry
          </h3>
        </div>
        
        {/* Description */}
        <div className="text-sm text-white/90">
          Schedule & real-time status
        </div>
        
        <div className="text-base text-white/80">
          Service ended for today
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Big Icon LEFT + Big Title RIGHT - Like Alerts */}
      <div className="flex items-center gap-4">
        {/* Big Icon in Circle */}
        <div className="p-4 bg-white/20 rounded-full flex-shrink-0">
          <Anchor className="w-10 h-10 text-white" />
        </div>
        
        {/* Big Title */}
        <h3 className="text-3xl font-bold text-white">
          Ferry
        </h3>
      </div>
      
      {/* Description */}
      <div className="text-sm text-white/90">
        Schedule & real-time status
      </div>
      
      {/* Live delay / cancellation from BC Ferries */}
      {liveNote && (
        <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white ${liveNote.kind === 'cancelled' ? 'bg-red-600/80' : liveNote.kind === 'late' ? 'bg-white/25' : 'bg-white/15'}`}>
          {liveNote.kind === 'ontime'
            ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
            : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          <span>{liveNote.text}</span>
          <span className="ml-auto text-[10px] font-normal opacity-75 whitespace-nowrap">Live</span>
        </div>
      )}

      {/* From Gabriola */}
      {fromGabriola ? (
        <div>
          <div className="text-sm text-white/80 mb-1">
            Next from Gabriola
          </div>
          <div className="text-2xl font-bold text-white">
            {fromGabriola.time}
          </div>
        </div>
      ) : (
        <div>
          <div className="text-sm text-white/70 mb-1">
            From Gabriola
          </div>
          <div className="text-base text-white/60">
            Done for today
          </div>
        </div>
      )}
      
      {/* From Nanaimo */}
      {fromNanaimo ? (
        <div>
          <div className="text-sm text-white/80 mb-1">
            Next from Nanaimo
          </div>
          <div className="text-2xl font-bold text-white">
            {fromNanaimo.time}
          </div>
        </div>
      ) : (
        <div>
          <div className="text-sm text-white/70 mb-1">
            From Nanaimo
          </div>
          <div className="text-base text-white/60">
            Done for today
          </div>
        </div>
      )}
    </div>
  );
}
