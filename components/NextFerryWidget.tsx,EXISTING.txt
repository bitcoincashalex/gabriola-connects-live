// components/NextFerryWidget.tsx
// Ferry display for landing page - REDESIGNED
// Shows next ferry from both terminals with icon + title layout
// Version: 3.0.0 - Icon and title on same line
// Date: 2025-12-11

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Anchor } from 'lucide-react';

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

    // Refresh every 60 seconds
    const interval = setInterval(loadNextFerries, 60000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="text-sm text-white/70">
        Loading...
      </div>
    );
  }

  // Handle case where both are done for the day
  if (!fromGabriola && !fromNanaimo) {
    return (
      <div className="space-y-2">
        {/* Icon + Title on same line */}
        <div className="flex items-center gap-2">
          <Anchor className="w-5 h-5 text-white" />
          <h3 className="text-lg font-bold text-white">Ferry</h3>
        </div>
        
        {/* Description */}
        <div className="text-sm text-white/90">
          Schedule & real-time status
        </div>
        
        {/* Divider */}
        <div className="border-t border-white/20 pt-2">
          <div className="text-base text-white/80">
            Service ended for today
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Icon + Title on same line */}
      <div className="flex items-center gap-2">
        <Anchor className="w-5 h-5 text-white" />
        <h3 className="text-lg font-bold text-white">Ferry</h3>
      </div>
      
      {/* Description */}
      <div className="text-sm text-white/90">
        Schedule & real-time status
      </div>
      
      {/* Divider */}
      <div className="border-t border-white/20 pt-2 space-y-3">
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
    </div>
  );
}
