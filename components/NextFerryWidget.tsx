// components/NextFerryWidget.tsx
// Ferry display for landing page - REDESIGNED
// Shows next ferry from both terminals + remaining sailings count
// Version: 5.0.0 - Added timeout handling + remaining sailings count
// Date: 2025-12-22

'use client';

import { useState, useEffect } from 'react';
import { queryWithTimeout, supabase } from '@/lib/supabaseWithTimeout';
import { Anchor, AlertCircle } from 'lucide-react';
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
  const [remainingSailings, setRemainingSailings] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const loadNextFerries = async () => {
      try {
        setHasError(false);
        // Get current time in client's timezone
        const now = new Date();
        const currentTime = now.toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit' 
        }); // Returns "07:08:00" in local time

        // Fetch next ferries (with timeout)
        const [gabriolaResult, nanaimoResult] = await Promise.all([
          queryWithTimeout(async () =>
            supabase.rpc('get_next_ferry', { 
              from_location: 'Gabriola',
              search_time: currentTime 
            })
          ),
          queryWithTimeout(async () =>
            supabase.rpc('get_next_ferry', { 
              from_location: 'Nanaimo',
              search_time: currentTime 
            })
          )
        ]);

        setFromGabriola(gabriolaResult.data);
        setFromNanaimo(nanaimoResult.data);

        // Count remaining sailings from both terminals (with timeout)
        const { count } = await queryWithTimeout(async () =>
          supabase
            .from('ferry_schedule')
            .select('*', { count: 'exact', head: true })
            .gte('departure_time', currentTime)
        );

        setRemainingSailings(count || 0);
      } catch (error) {
        console.error('Error loading ferry times:', error);
        setHasError(true);
        setFromGabriola(null);
        setFromNanaimo(null);
        setRemainingSailings(0);
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

  if (hasError) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-white/20 rounded-full flex-shrink-0">
            <Anchor className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-3xl font-bold text-white">Ferry</h3>
        </div>
        
        <div className="text-sm text-white/90">Schedule & real-time status</div>
        
        {/* Timeout Error State */}
        <div className="text-center py-2">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-white/90" />
          <p className="font-medium text-sm mb-1 text-white">Unable to load ferry times</p>
          <p className="text-xs text-white/70 mb-3">Sign in to see the latest</p>
          <Link
            href="/signin"
            className="inline-block px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
          >
            Sign In
          </Link>
        </div>
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
      
      {/* Remaining Sailings Count */}
      {remainingSailings > 0 && (
        <div className="pt-2 border-t border-white/20">
          <div className="text-xs text-white/70">
            {remainingSailings} more sailing{remainingSailings !== 1 ? 's' : ''} today
          </div>
        </div>
      )}
    </div>
  );
}
