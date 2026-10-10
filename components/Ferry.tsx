// Path: components/Ferry.tsx
// Version: 3.0.0 - Real live status from BC Ferries (Nanaimo Harbour departures) replaces the
//                  made-up "Current Status" box (it showed random delays). Nanaimo schedule rows
//                  show actual departure times, delays and cancellations. If the schedule fails to
//                  load it now says so, instead of "No more sailings today".
// Previous: 2.3.0 - Added "Refresh Status" label to refresh button for clarity
// Date: 2026-10-10

'use client';

import { useState, useEffect } from 'react';
import { Anchor, RefreshCw, Clock, AlertTriangle, Radio } from 'lucide-react';
import { supabase } from '@/lib/supabaseWithTimeout';

// Live status older than this is treated as unavailable
const LIVE_STALE_MINUTES = 20;

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

function gabriolaToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Vancouver', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function sqlTimeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function sqlTimeToDisplay(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
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

export default function Ferry() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [liveSailings, setLiveSailings] = useState<LiveSailing[]>([]);
  const [liveMeta, setLiveMeta] = useState<LiveMeta | null>(null);
  const [activeTab, setActiveTab] = useState<'from-gabriola' | 'from-nanaimo'>('from-gabriola');
  
  // NEW: Load schedule from database
  const [schedule, setSchedule] = useState<FerrySchedule | null>(null);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(true);
  const [scheduleError, setScheduleError] = useState(false);

  // Load schedule from database on mount
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
    return () => clearInterval(interval);
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
    await loadLive();
    setIsRefreshing(false);
  };

  // Show loading state while schedule loads
  if (isLoadingSchedule || !schedule) {
    return (
      <div className="flex flex-col min-h-screen bg-gabriola-ocean/5 pb-20">
        <div className="bg-white/80 backdrop-blur-sm border-b-4 border-gabriola-ocean/30 py-6">
          <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Anchor className="w-12 h-12 text-gabriola-ocean" />
              <div>
                <h1 className="text-4xl font-bold text-gabriola-ocean">Ferry Status</h1>
                <p className="text-lg text-gabriola-ocean/80">Loading schedule...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const scheduleToUse = activeTab === 'from-gabriola' ? schedule.fromGabriola : schedule.fromNanaimo;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const parseTimeToMinutes = (timeStr: string): number => {
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const nextSailingIndex = scheduleToUse.findIndex(s => parseTimeToMinutes(s.time) > currentMinutes);

  // Calculate next sailing from EACH side independently (for current status display)
  const nextFromGabriola = schedule.fromGabriola.find(s => parseTimeToMinutes(s.time) > currentMinutes);
  const nextFromNanaimo = schedule.fromNanaimo.find(s => parseTimeToMinutes(s.time) > currentMinutes);

  // Live status (Nanaimo Harbour departures only - BC Ferries publishes nothing live for Gabriola)
  const liveFresh = !!liveMeta?.last_success_at &&
    (Date.now() - new Date(liveMeta.last_success_at).getTime()) < LIVE_STALE_MINUTES * 60 * 1000;
  const liveByMinutes = new Map(liveSailings.map(l => [sqlTimeToMinutes(l.scheduled_time), l]));
  const lastDeparted = [...liveSailings].reverse().find(l => l.status === 'departed');
  const nextLive = liveSailings.find(l => l.status !== 'departed' && sqlTimeToMinutes(l.scheduled_time) >= currentMinutes - 5);
  const cancelledToday = liveSailings.filter(l => l.status === 'cancelled');

  return (
    <div className="flex flex-col min-h-screen bg-gabriola-ocean/5 pb-20">
      {/* Clean, beautiful page title – NOT a duplicate header */}
      <div className="bg-white/80 backdrop-blur-sm border-b-4 border-gabriola-ocean/30 py-6">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Anchor className="w-12 h-12 text-gabriola-ocean" />
            <div>
              <h1 className="text-4xl font-bold text-gabriola-ocean">Ferry Status</h1>
              <p className="text-lg text-gabriola-ocean/80">Nanaimo to Gabriola Route</p>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg bg-gabriola-ocean text-white hover:bg-gabriola-ocean/90 transition-all shadow-lg ${
              isRefreshing ? 'opacity-75' : ''
            }`}
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="font-semibold text-sm hidden sm:inline">
              {isRefreshing ? 'Updating...' : 'Refresh Status'}
            </span>
          </button>
        </div>
      </div>

      {/* Next sailings (from the schedule) */}
      <div className="p-4">
        <div className="rounded-xl p-6 shadow-lg bg-white border-2 border-gabriola-ocean/20">
          {/* Next Sailings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-white/70 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gabriola-ocean mb-2">
                <Clock className="w-5 h-5" />
                <span className="text-sm font-medium">From Gabriola</span>
              </div>
              {nextFromGabriola ? (
                <>
                  <div className="text-3xl font-bold text-gray-800">{nextFromGabriola.time}</div>
                  <div className="text-sm text-gray-600">Arrives {nextFromGabriola.arrivalTime} in Nanaimo</div>
                </>
              ) : (
                <div className="text-lg font-semibold text-gray-500">{scheduleError ? 'Schedule unavailable' : 'No more sailings today'}</div>
              )}
            </div>

            <div className="bg-white/70 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gabriola-ocean mb-2">
                <Clock className="w-5 h-5" />
                <span className="text-sm font-medium">From Nanaimo</span>
              </div>
              {nextFromNanaimo ? (
                <>
                  <div className="text-3xl font-bold text-gray-800">{nextFromNanaimo.time}</div>
                  <div className="text-sm text-gray-600">Arrives {nextFromNanaimo.arrivalTime} in Gabriola</div>
                </>
              ) : (
                <div className="text-lg font-semibold text-gray-500">{scheduleError ? 'Schedule unavailable' : 'No more sailings today'}</div>
              )}
            </div>
          </div>


          <div className="mt-2 pt-4 border-t border-gray-300">
            <p className="text-sm text-gray-700">
              <strong>Travel time:</strong> Approximately 20 minutes
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Check-in closes 10 minutes before departure from Gabriola, 3 minutes from Nanaimo
            </p>
          </div>
        </div>
      </div>

      {/* Live status from BC Ferries */}
      <div className="px-4 pb-4">
        <div className="rounded-xl p-6 shadow-lg bg-white border-2 border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <Radio className="w-5 h-5 text-gabriola-ocean" />
            <h2 className="text-lg font-bold text-gray-800">Live from BC Ferries</h2>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Departures from Nanaimo Harbour. BC Ferries does not publish live times for sailings leaving Gabriola.
          </p>

          {!liveFresh ? (
            <div className="text-sm text-gray-700">
              Live status isn&apos;t available right now.{' '}
              <a href="https://www.bcferries.com/current-conditions/NAH-GAB" target="_blank" rel="noopener noreferrer" className="text-gabriola-ocean font-semibold underline">
                Check BC Ferries directly
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {cancelledToday.length > 0 && (
                <div className="flex items-start gap-2 bg-red-100 text-red-900 px-4 py-3 rounded-lg">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span className="font-medium">
                    Cancelled today: {cancelledToday.map(c => sqlTimeToDisplay(c.scheduled_time)).join(', ')} from Nanaimo
                    {cancelledToday[0].reason ? ` (${cancelledToday[0].reason})` : ''}
                  </span>
                </div>
              )}

              {lastDeparted && (
                <div className={`px-4 py-3 rounded-lg ${(lastDeparted.delay_minutes || 0) >= 15 ? 'bg-amber-100 text-amber-900' : 'bg-green-50 text-green-900'}`}>
                  <div className="font-semibold">
                    Last sailing: {sqlTimeToDisplay(lastDeparted.scheduled_time)} left at {sqlTimeToDisplay(lastDeparted.actual_departure!)}
                    {(lastDeparted.delay_minutes || 0) > 0 ? `, ${lastDeparted.delay_minutes} min late` : ', on time'}
                  </div>
                  {lastDeparted.reason && <div className="text-sm mt-1">{lastDeparted.reason}</div>}
                </div>
              )}

              {nextLive && (
                <div className="text-sm text-gray-700">
                  Next from Nanaimo: <strong>{sqlTimeToDisplay(nextLive.scheduled_time)}</strong>
                  {nextLive.status_text ? ` (${nextLive.status_text})` : ''}
                </div>
              )}

              {liveMeta?.notices && liveMeta.notices.length > 0 && (
                <div className="pt-3 border-t border-gray-200">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Service notices</div>
                  {liveMeta.notices.map(n => (
                    <a key={n.code} href={n.url} target="_blank" rel="noopener noreferrer" className="block text-sm text-gabriola-ocean underline">
                      {n.title}
                    </a>
                  ))}
                </div>
              )}

              <div className="text-xs text-gray-500">
                BC Ferries last updated {liveMeta?.bc_last_updated || 'unknown'}, checked here every 5 minutes.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Schedule Section */}
      <div className="w-full px-4 pb-20">
        <div className="bg-white rounded-xl shadow-lg">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('from-gabriola')}
              className={`flex-1 px-6 py-4 font-semibold transition-all ${activeTab === 'from-gabriola' ? 'text-gabriola-ocean border-b-4 border-gabriola-ocean bg-gabriola-ocean/5' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            >
              From Gabriola
            </button>
            <button
              onClick={() => setActiveTab('from-nanaimo')}
              className={`flex-1 px-6 py-4 font-semibold transition-all ${activeTab === 'from-nanaimo' ? 'text-gabriola-ocean border-b-4 border-gabriola-ocean bg-gabriola-ocean/5' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            >
              From Nanaimo
            </button>
          </div>

          <div className="p-4">
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-gray-800 mb-3">
                {activeTab === 'from-gabriola' ? 'Departures from Gabriola' : 'Departures from Nanaimo'}
              </h3>

              {scheduleToUse.length === 0 ? (
                <p className="text-gray-600 text-center py-8">
                  {scheduleError ? (
                    <>
                      The schedule couldn&apos;t be loaded. Please refresh, or{' '}
                      <a href="https://www.bcferries.com/current-conditions/NAH-GAB" target="_blank" rel="noopener noreferrer" className="text-gabriola-ocean underline">check BC Ferries</a>.
                    </>
                  ) : 'No sailings scheduled'}
                </p>
              ) : (
                scheduleToUse.map((sailing, index) => {
                  const isNext = nextSailingIndex >= 0 && index === nextSailingIndex;
                  const isPast = nextSailingIndex === -1 || index < nextSailingIndex;

                  return (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        isNext
                          ? 'bg-gabriola-ocean/10 border-gabriola-ocean shadow-md'
                          : isPast
                          ? 'bg-gray-50 border-gray-200 opacity-50'
                          : 'bg-white border-gray-200 hover:border-gabriola-ocean/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <Clock className={`w-5 h-5 ${isNext ? 'text-gabriola-ocean' : 'text-gray-600'}`} />
                              <span className={`text-2xl font-bold ${isNext ? 'text-gabriola-ocean' : 'text-gray-800'}`}>
                                {sailing.time}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              Arrives: {sailing.arrivalTime}
                            </div>
                            {activeTab === 'from-nanaimo' && liveFresh && (() => {
                              const live = liveByMinutes.get(parseTimeToMinutes(sailing.time));
                              if (!live) return null;
                              if (live.status === 'cancelled') {
                                return <div className="text-sm font-semibold text-red-700 mt-1">Cancelled{live.reason ? `: ${live.reason}` : ''}</div>;
                              }
                              if (live.status === 'departed' && live.actual_departure) {
                                const late = live.delay_minutes || 0;
                                return (
                                  <div className={`text-sm mt-1 ${late >= 15 ? 'font-semibold text-amber-700' : 'text-green-700'}`}>
                                    Left {sqlTimeToDisplay(live.actual_departure)}{late > 0 ? ` (${late} min late)` : ''}
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </div>

                        {isNext && (
                          <div className="bg-gabriola-ocean text-white px-3 py-1 rounded-full text-sm font-semibold">
                            Next
                          </div>
                        )}

                        {isPast && nextSailingIndex !== -1 && (
                          <div className="text-gray-400 text-sm font-medium">
                            Departed
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="p-4 bg-gray-50 border-t border-gray-200 space-y-3">
            <a
              href="https://ferrycam.clayrose.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center bg-gabriola-ocean text-white hover:bg-gabriola-ocean/90 font-semibold text-sm py-3 rounded-lg transition-all shadow-md"
            >
              🔹 View Live Ferry Cam - Current Traffic Conditions
            </a>
            
            <a
              href="https://www.bcferries.com/current-conditions/GAB-NAH"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-gabriola-ocean hover:text-gabriola-ocean/80 font-medium text-sm py-2"
            >
              BC Ferries Current Conditions - Descanso Bay to Nanaimo Harbour →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}