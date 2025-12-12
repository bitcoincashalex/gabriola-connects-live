// components/NextEventWidget.tsx
// Shows next upcoming event for landing page calendar card
// Version: 1.0.0
// Date: 2025-12-11

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';

interface EventInfo {
  id: string;
  title: string;
  start_date: string;
  start_time: string | null;
  location: string;
}

export function NextEventWidget() {
  const [nextEvent, setNextEvent] = useState<EventInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadNextEvent = async () => {
      try {
        const now = new Date();
        const today = format(now, 'yyyy-MM-dd');
        const currentTime = format(now, 'HH:mm:ss');

        // Try to get events happening later TODAY
        let { data, error } = await supabase
          .from('events')
          .select('id, title, start_date, start_time, location')
          .eq('is_approved', true)
          .is('deleted_at', null)
          .eq('start_date', today)
          .gt('start_time', currentTime)
          .order('start_time', { ascending: true })
          .limit(1);

        // If no events later today, get first event from tomorrow onwards
        if (!data || data.length === 0) {
          const result = await supabase
            .from('events')
            .select('id, title, start_date, start_time, location')
            .eq('is_approved', true)
            .is('deleted_at', null)
            .gt('start_date', today)
            .order('start_date', { ascending: true })
            .order('start_time', { ascending: true })
            .limit(1);
          
          data = result.data;
          error = result.error;
        }

        if (error) {
          console.error('Error loading next event:', error);
          setNextEvent(null);
          return;
        }

        setNextEvent(data && data.length > 0 ? data[0] : null);
      } catch (error) {
        console.error('Error loading next event:', error);
        setNextEvent(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadNextEvent();

    // Refresh every 5 minutes
    const interval = setInterval(loadNextEvent, 300000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="text-xs text-white/70">
        Loading...
      </div>
    );
  }

  if (!nextEvent) {
    return (
      <div className="text-xs text-white/70">
        No upcoming events
      </div>
    );
  }

  // Format the date
  const eventDate = parseISO(nextEvent.start_date);
  let dateDisplay: string;
  
  if (isToday(eventDate)) {
    dateDisplay = 'Today';
  } else if (isTomorrow(eventDate)) {
    dateDisplay = 'Tomorrow';
  } else {
    dateDisplay = format(eventDate, 'MMM d');
  }

  // Format the time
  const timeDisplay = nextEvent.start_time 
    ? format(parseISO(`2000-01-01T${nextEvent.start_time}`), 'h:mm a')
    : 'All day';

  // Truncate title if too long
  const displayTitle = nextEvent.title.length > 35 
    ? nextEvent.title.substring(0, 32) + '...'
    : nextEvent.title;

  // Truncate location if too long
  const displayLocation = nextEvent.location.length > 25
    ? nextEvent.location.substring(0, 22) + '...'
    : nextEvent.location;

  return (
    <div className="text-xs space-y-1">
      <div className="text-white font-semibold">
        {displayTitle}
      </div>
      <div className="text-white/90">
        {dateDisplay} • {timeDisplay}
      </div>
      {nextEvent.location && (
        <div className="text-white/80 text-[10px]">
          📍 {displayLocation}
        </div>
      )}
    </div>
  );
}
