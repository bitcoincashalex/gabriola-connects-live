// components/NextFerryWidget.tsx
// Ferry display for landing page - REDESIGNED
// Shows next ferry from both terminals - NO TIMEOUT (BC Ferries API can be slow)
// Version: 5.1.0 - Removed timeout (BC Ferries needs time) + removed sailing count (not useful)
// Date: 2025-12-22

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadNextFerries = async () => {
      try {
        // Get current time in client's timezone
        const now = new Date();
        const currentTime = now.toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit' 
        }); // Returns "07:08:00" in local time

        // Fetch both in parallel - NO TIMEOUT (BC Ferries API can be slow)
        const [gabriolaResult, nanaimoResult] = await Promise.all([
          supabase.rpc('get_next_ferry', { 
            from_location: 'Gabriola',
            search_time: currentTime 
          }),
          supabase.rpc('get_next_ferry', { 
            from_location: 'Nanaimo',
            search_time: currentTime 
          })
        ]);

        setFromGabriola(gabriolaResult.data);
        setFromNanaimo(nanaimoResult.data);
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
