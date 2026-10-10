// Path: components/Ferry.tsx
// Version: 4.0.0 - Ferry page redesign: one "Next sailing" card for each direction with the live
//                  BC Ferries status built in (was shown three times: top card, live box and list);
//                  "in 15 min" countdown; the next two sailings after it; past sailings folded away
//                  behind "Show earlier sailings"; times worked out in Gabriola time (was the
//                  visitor's own clock); white cards to match the front page; no emoji.
// Previous: 3.0.0 - Real live status from BC Ferries (Nanaimo Harbour departures) replaces the
//                  made-up "Current Status" box (it showed random delays). Nanaimo schedule rows
//                  show actual departure times, delays and cancellations. If the schedule fails to
//                  load it now says so, instead of "No more sailings today".
// Earlier: 2.3.0 - Added "Refresh Status" label to refresh button for clarity
// Date: 2026-10-10

'use client';

import { useState, useEffect } from 'react';
import { Anchor, RefreshCw, AlertTriangle, Radio, ChevronDown, ChevronUp, Video, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabaseWithTimeout';
import { pacificNowMinutes, displayToMinutes, sqlTimeToMinutes, sqlTimeToDisplay, untilText } from '@/lib/ferryTime';

// Live status older than this is treated as unavailable
const LIVE_STALE_MINUTES = 20;
// A late line shows when the last Nanaimo sailing left this many minutes late or more
const LATE_MINUTES = 10;

interface LiveSailing {
  scheduled_time: string;        // "07:35:00"
  actual_departure: string | null;
  delay_minutes: number | null;
  status: 'departed' | 'upcoming' | 'cancelled' | 'other';
  status_text: string | null;
  reason: string | null;
  vessel: string | null;
}

interface LiveMeta {
  last_success_at: string | null;
  bc_last_updated: string | null;
  notices: { code: string; title: string; url: string }[];
}

interface Sailing {
  time: string;
  departureTime: string;
  arrivalTime: string;
  vesselName?: string;
  isCancelled?: boolean;
}

interface FerrySchedule {
  fromGabriola: Sailing[];
  fromNanaimo: Sailing[];
}

function gabriolaToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Vancouver', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

const mins = (s: Sailing) => displayToMinutes(s.time) ?? -1;

export default function Ferry() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [liveSailings, setLiveSailings] = useState<LiveSailing[]>([]);
  const [liveMeta, setLiveMeta] = useState<LiveMeta | null>(null);
  const [activeTab, setActiveTab] = useState<'from-gabriola' | 'from-nanaimo'>('from-gabriola');
  const [showEarlier, setShowEarlier] = useState(false);
  const [nowMin, setNowMin] = useState<number>(() => pacificNowMinutes());

  const [schedule, setSchedule] = useState<FerrySchedule | null>(null);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(true);
  const [scheduleError, setScheduleError] = useState(false);

  useEffect(() => {
    const loadSchedule = async () => {
      try {
        const { data, error } = await supabase.rpc('get_ferry_schedule');
        if (error) throw error;
        setSchedule({ fromGabriola: data?.fromGabriola || [], fromNanaimo: data?.fromNanaimo || [] });
      } catch (error) {
        console.error('Error loading ferry schedule:', error);
        setScheduleError(true);
        setSchedule({ fromGabriola: [], fromNanaimo: [] });
      } finally {
        setIsLoadingSchedule(false);
      }
    };
    loadSchedule();
    loadLive();
    const interval = setInterval(loadLive, 60000);
    const tick = setInterval(() => setNowMin(pacificNowMinutes()), 30000);
    return () => { clearInterval(interval); clearInterval(tick); };
  }, []);

  const loadLive = async () => {
    try {
      const [sailingsRes, metaRes] = await Promise.all([
        supabase
          .from('ferry_live_sailings')
          .select('scheduled_time, actual_departure, delay_minutes, status, status_text, reason, vessel')
          .eq('route', 'NAH-GAB')
          .eq('sailing_date', gabriolaToday())
          .order('scheduled_time'),
        supabase
          .from('ferry_live_meta')
          .select('last_success_at, bc_last_updated, notices')
          .eq('route', 'NAH-GAB')
          .maybeSingle(),
      ]);
      setLiveSailings((sailingsRes.data as LiveSailing[]) || []);
      setLiveMeta((metaRes.data as LiveMeta) || null);
    } catch (error) {
      console.error('Error loading live ferry status:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setNowMin(pacificNowMinutes());
    await loadLive();
    setIsRefreshing(false);
  };

  const titleBar = (
    <div className="bg-white border-b border-[#E3DCCF]">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#E3E8F4] text-[#002774] flex items-center justify-center flex-shrink-0">
            <Anchor className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-gabriola-green-dark leading-tight">Ferry</h1>
            <p className="text-sm text-[#5B6660]">Gabriola (Descanso Bay) and Nanaimo Harbour</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing || isLoadingSchedule}
          aria-label="Refresh live status"
          className="flex items-center gap-2 min-h-[44px] px-3 md:px-4 rounded-lg border border-[#002774] text-[#002774] bg-white hover:bg-[#E3E8F4] transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
          <span className="font-semibold text-sm hidden sm:inline">{isRefreshing ? 'Updating...' : 'Refresh'}</span>
        </button>
      </div>
    </div>
  );

  if (isLoadingSchedule || !schedule) {
    return (
      <div className="min-h-screen bg-[#F6F2EA] text-[#1F2A24]">
        {titleBar}
        <div className="py-20 text-center text-[#5B6660]" role="status">Loading schedule...</div>
      </div>
    );
  }

  // Live status (Nanaimo Harbour departures only - BC Ferries publishes nothing live for Gabriola)
  const liveFresh = !!liveMeta?.last_success_at &&
    (Date.now() - new Date(liveMeta.last_success_at).getTime()) < LIVE_STALE_MINUTES * 60 * 1000;
  const liveByMinutes = new Map(liveSailings.map(l => [sqlTimeToMinutes(l.scheduled_time), l]));
  const lastDeparted = [...liveSailings].reverse().find(l => l.status === 'departed');
  const cancelledToday = liveFresh ? liveSailings.filter(l => l.status === 'cancelled') : [];
  const runningLate = liveFresh && lastDeparted && (lastDeparted.delay_minutes || 0) >= LATE_MINUTES ? lastDeparted : null;

  const upcoming = (list: Sailing[]) => list.filter(s => mins(s) > nowMin);
  const nextG = upcoming(schedule.fromGabriola);
  const nextN = upcoming(schedule.fromNanaimo);

  const NextCard = ({ from, to, list, live }: { from: string; to: string; list: Sailing[]; live: boolean }) => {
    const next = list[0];
    const then = list.slice(1, 3);
    const nextLive = live && next ? liveByMinutes.get(mins(next)) : undefined;
    const nextCancelled = liveFresh && nextLive?.status === 'cancelled';
    return (
      <div className="bg-white border border-[#E3DCCF] rounded-2xl p-5">
        <div className="text-sm font-semibold text-[#5B6660]">Next from {from}</div>
        {next ? (
          <>
            <div className="flex items-baseline gap-3 flex-wrap mt-1">
              <span className={`text-4xl font-bold leading-none ${nextCancelled ? 'text-[#B42318] line-through' : 'text-[#002774]'}`}>{next.time}</span>
              <span className="text-base font-semibold text-[#1F2A24]">
                {nextCancelled ? 'Cancelled' : untilText(mins(next), nowMin)}
              </span>
            </div>
            <div className="text-sm text-[#5B6660] mt-1.5">Arrives {next.arrivalTime} in {to}</div>
            {then.length > 0 && (
              <div className="text-sm text-[#3A4640] mt-1">Then {then.map(s => s.time).join(' · ')}</div>
            )}
          </>
        ) : (
          <div className="text-lg font-semibold text-[#5B6660] mt-1">
            {scheduleError ? 'Schedule unavailable' : 'No more sailings today'}
          </div>
        )}

        {live ? (
          liveFresh ? (
            <>
              {runningLate && (
                <div className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2 bg-[#FDF0E1] text-[#8A3E00] text-sm font-semibold">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  Running {runningLate.delay_minutes} min late
                </div>
              )}
              {lastDeparted && lastDeparted.actual_departure && (
                <div className="mt-2 text-[13px] text-[#5B6660] flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                  Last sailing ({sqlTimeToDisplay(lastDeparted.scheduled_time)}) left at {sqlTimeToDisplay(lastDeparted.actual_departure)}
                  {(lastDeparted.delay_minutes || 0) > 0 ? `, ${lastDeparted.delay_minutes} min late` : ', on time'}
                </div>
              )}
              {lastDeparted?.reason && <div className="text-[13px] text-[#5B6660] mt-0.5">{lastDeparted.reason}</div>}
            </>
          ) : (
            <div className="mt-3 text-[13px] text-[#5B6660]">
              Live status isn&apos;t available right now.{' '}
              <a href="https://www.bcferries.com/current-conditions/NAH-GAB" target="_blank" rel="noopener noreferrer" className="text-[#002774] font-semibold underline">
                Check BC Ferries
              </a>
            </div>
          )
        ) : (
          <div className="mt-3 text-[13px] text-[#5B6660]">BC Ferries doesn&apos;t publish live times for sailings leaving Gabriola.</div>
        )}
      </div>
    );
  };

  const scheduleToUse = activeTab === 'from-gabriola' ? schedule.fromGabriola : schedule.fromNanaimo;
  const nextIndex = scheduleToUse.findIndex(s => mins(s) > nowMin);
  const pastCount = nextIndex === -1 ? scheduleToUse.length : nextIndex;
  const visible = scheduleToUse
    .map((s, i) => ({ s, i }))
    .filter(({ i }) => showEarlier || i >= pastCount);

  return (
    <div className="min-h-screen bg-[#F6F2EA] text-[#1F2A24]">
      {titleBar}

      <div className="max-w-5xl mx-auto px-4 py-5 space-y-4">
        {/* Cancellations today */}
        {cancelledToday.length > 0 && (
          <div className="flex items-start gap-2 bg-[#B42318] text-white px-4 py-3 rounded-2xl" role="alert">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span className="font-semibold">
              Cancelled today: {cancelledToday.map(c => sqlTimeToDisplay(c.scheduled_time)).join(', ')} from Nanaimo
              {cancelledToday[0].reason ? ` (${cancelledToday[0].reason})` : ''}
            </span>
          </div>
        )}

        {/* Next sailing each way */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NextCard from="Gabriola" to="Nanaimo" list={nextG} live={false} />
          <NextCard from="Nanaimo" to="Gabriola" list={nextN} live={true} />
        </div>

        <p className="text-[13px] text-[#5B6660] px-1">
          Crossing takes about 20 minutes. Check-in closes 10 minutes before departure from Gabriola, 3 minutes from Nanaimo.
        </p>

        {/* Service notices */}
        {liveFresh && liveMeta?.notices && liveMeta.notices.length > 0 && (
          <div className="bg-white border border-[#E3DCCF] rounded-2xl p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-[#5B6660] mb-1.5">Service notices</div>
            {liveMeta.notices.map(n => (
              <a key={n.code} href={n.url} target="_blank" rel="noopener noreferrer" className="block text-sm text-[#002774] underline py-1">
                {n.title}
              </a>
            ))}
          </div>
        )}

        {/* Today's schedule */}
        <div className="bg-white border border-[#E3DCCF] rounded-2xl overflow-hidden">
          <div className="flex border-b border-[#E3DCCF]" role="tablist">
            {(['from-gabriola', 'from-nanaimo'] as const).map(tab => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => { setActiveTab(tab); setShowEarlier(false); }}
                className={`flex-1 min-h-[48px] px-4 font-semibold transition-colors ${activeTab === tab ? 'text-[#002774] border-b-[3px] border-[#002774] bg-[#F3F5FA]' : 'text-[#5B6660] hover:bg-[#F6F2EA]'}`}
              >
                {tab === 'from-gabriola' ? 'From Gabriola' : 'From Nanaimo'}
              </button>
            ))}
          </div>

          {scheduleToUse.length === 0 ? (
            <p className="text-[#5B6660] text-center py-8 px-4">
              {scheduleError ? (
                <>
                  The schedule couldn&apos;t be loaded. Please refresh, or{' '}
                  <a href="https://www.bcferries.com/current-conditions/NAH-GAB" target="_blank" rel="noopener noreferrer" className="text-[#002774] underline">check BC Ferries</a>.
                </>
              ) : 'No sailings scheduled'}
            </p>
          ) : (
            <>
              {pastCount > 0 && (
                <button
                  onClick={() => setShowEarlier(v => !v)}
                  className="w-full flex items-center justify-center gap-1.5 min-h-[44px] text-sm font-semibold text-[#5B6660] hover:bg-[#F6F2EA] border-b border-[#EEE8DD]"
                >
                  {showEarlier ? <ChevronUp className="w-4 h-4" aria-hidden="true" /> : <ChevronDown className="w-4 h-4" aria-hidden="true" />}
                  {showEarlier ? 'Hide earlier sailings' : `Show earlier sailings (${pastCount})`}
                </button>
              )}

              {nextIndex === -1 && !showEarlier && (
                <p className="text-[#5B6660] text-center py-6">No more sailings today</p>
              )}

              <ul className="divide-y divide-[#EEE8DD]">
                {visible.map(({ s, i }) => {
                  const isNext = i === nextIndex;
                  const isPast = i < pastCount;
                  const live = activeTab === 'from-nanaimo' && liveFresh ? liveByMinutes.get(mins(s)) : undefined;
                  let liveLine: { text: string; tone: string } | null = null;
                  if (live?.status === 'cancelled') {
                    liveLine = { text: `Cancelled${live.reason ? `: ${live.reason}` : ''}`, tone: 'text-[#B42318] font-semibold' };
                  } else if (live?.status === 'departed' && live.actual_departure) {
                    const late = live.delay_minutes || 0;
                    liveLine = {
                      text: `Left ${sqlTimeToDisplay(live.actual_departure)}${late > 0 ? ` (${late} min late)` : ''}`,
                      tone: late >= LATE_MINUTES ? 'text-[#8A3E00] font-semibold' : 'text-[#5B6660]',
                    };
                  }
                  return (
                    <li
                      key={i}
                      className={`flex items-center justify-between gap-3 px-4 py-3 ${isNext ? 'bg-[#F3F5FA]' : ''} ${isPast ? 'opacity-60' : ''}`}
                    >
                      <div>
                        <span className={`text-xl font-bold ${isNext ? 'text-[#002774]' : 'text-[#1F2A24]'}`}>{s.time}</span>
                        <span className="text-sm text-[#5B6660] ml-2">arrives {s.arrivalTime}</span>
                        {liveLine && <div className={`text-[13px] mt-0.5 ${liveLine.tone}`}>{liveLine.text}</div>}
                      </div>
                      {isNext && (
                        <span className="bg-[#002774] text-white px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
                          Next · {untilText(mins(s), nowMin)}
                        </span>
                      )}
                      {isPast && !liveLine && <span className="text-xs text-[#5B6660]">Departed</span>}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        {/* Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            href="https://ferrycam.clayrose.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 min-h-[48px] bg-[#002774] text-white font-semibold text-sm rounded-xl px-4 hover:bg-[#001d57] transition-colors"
          >
            <Video className="w-4 h-4" aria-hidden="true" />
            View Live Ferry Cam - Current Traffic Conditions
          </a>
          <a
            href="https://www.bcferries.com/current-conditions/GAB-NAH"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 min-h-[48px] bg-white border border-[#002774] text-[#002774] font-semibold text-sm rounded-xl px-4 hover:bg-[#E3E8F4] transition-colors text-center"
          >
            BC Ferries Current Conditions
            <ExternalLink className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          </a>
        </div>

        {liveFresh && (
          <p className="text-xs text-[#5B6660] text-center">
            BC Ferries last updated {liveMeta?.bc_last_updated || 'unknown'}, checked here every 5 minutes.
          </p>
        )}
      </div>
    </div>
  );
}
