// components/NextFerryWidget.tsx
// Minimal ferry display for landing page
// Shows next ferry from both terminals
// Version: 1.0.0
// Date: 2025-12-11

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

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

        // Fetch both in parallel, passing client's current time
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

    // Refresh every 60 seconds (ferry times don't change that fast)
    const interval = setInterval(loadNextFerries, 60000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="text-xs text-gray-500">
        Loading...
      </div>
    );
  }

  // Handle case where both are done for the day
  if (!fromGabriola && !fromNanaimo) {
    return (
      <div className="text-xs text-gray-600">
        Service ended for today
      </div>
    );
  }

  return (
    <div className="text-xs space-y-1">
      {fromGabriola ? (
        <div className="text-white">
          <span className="font-semibold">Departs Gabriola:</span> {fromGabriola.time}
        </div>
      ) : (
        <div className="text-white/70">
          <span className="font-semibold">From Gabriola:</span> Done for today
        </div>
      )}
      
      {fromNanaimo ? (
        <div className="text-white">
          <span className="font-semibold">Departs Nanaimo:</span> {fromNanaimo.time}
        </div>
      ) : (
        <div className="text-white/70">
          <span className="font-semibold">From Nanaimo:</span> Done for today
        </div>
      )}
    </div>
  );
}
