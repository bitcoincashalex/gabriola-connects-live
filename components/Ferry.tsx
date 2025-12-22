// Path: components/Ferry.tsx
// Version: 2.2.1 - Changed timestamp format to readable date/time (December 21st 2025, 3:50:00 pm)
// Date: 2025-12-21

'use client';

import { useState, useEffect } from 'react';
import { getMockFerryStatus } from '@/lib/data';
import { Anchor, RefreshCw, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

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
  const [status, setStatus] = useState(getMockFerryStatus());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'from-gabriola' | 'from-nanaimo'>('from-gabriola');
  
  // NEW: Load schedule from database
  const [schedule, setSchedule] = useState<FerrySchedule | null>(null);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(true);

  // Load schedule from database on mount
  useEffect(() => {
    const loadSchedule = async () => {
      try {
        const { data, error } = await supabase.rpc('get_ferry_schedule');
        if (error) throw error;
        setSchedule(data);
      } catch (error) {
        console.error('Error loading ferry schedule:', error);
        // Fallback to empty schedule if error
        setSchedule({ fromGabriola: [], fromNanaimo: [] });
      } finally {
        setIsLoadingSchedule(false);
      }
    };
    loadSchedule();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const newStatus = getMockFerryStatus();
    setStatus(newStatus);
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
            className={`p-4 rounded-full bg-gabriola-ocean text-white hover:bg-gabriola-ocean/90 transition-all shadow-lg ${
              isRefreshing ? 'animate-spin' : ''
            }`}
          >
            <RefreshCw className="w-7 h-7" />
          </button>
        </div>
      </div>

      {/* Current Status Card */}
      <div className="p-4">
        <div className={`rounded-xl p-6 shadow-lg ${status.status === 'On Time' ? 'bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200' : 'bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">Current Status</h2>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${status.status === 'On Time' ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'}`}>
              <div className={`w-2 h-2 rounded-full ${status.status === 'On Time' ? 'bg-white' : 'bg-white animate-pulse'}`} />
              <span className="font-semibold">{status.status}</span>
            </div>
          </div>

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
                <div className="text-lg font-semibold text-gray-500">No more sailings today</div>
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
                <div className="text-lg font-semibold text-gray-500">No more sailings today</div>
              )}
            </div>
          </div>

          {status.delayMinutes && (
            <div className="flex items-center gap-2 bg-amber-200 text-amber-900 px-4 py-2 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Delayed by {status.delayMinutes} minutes</span>
            </div>
          )}

          <div className="text-xs text-gray-500 mt-3">
            Last updated: {format(status.lastUpdated, 'MMMM do yyyy, h:mm:ss a')}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-300">
            <p className="text-sm text-gray-700">
              <strong>Travel time:</strong> Approximately 20 minutes
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Check-in closes 10 minutes before departure from Gabriola, 3 minutes from Nanaimo
            </p>
          </div>
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
                <p className="text-gray-600 text-center py-8">No sailings scheduled</p>
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
