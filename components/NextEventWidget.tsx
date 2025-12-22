// components/NextEventWidget.tsx
// Shows next upcoming event - REDESIGNED
// Version: 4.1.0 - Added query timeout to prevent infinite loading on stale auth
// Date: 2025-12-22

'use client';

import { useState, useEffect } from 'react';
import { queryWithTimeout, supabase } from '@/lib/supabaseWithTimeout';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { Calendar } from 'lucide-react';

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

        // Try to get events happening later TODAY (with timeout)
        let { data, error } = await queryWithTimeout(async () =>
          supabase
            .from('events')
            .select('id, title, start_date, start_time, location')
            .eq('is_approved', true)
            .is('deleted_at', null)
            .eq('start_date', today)
            .gt('start_time', currentTime)
            .order('start_time', { ascending: true })
            .limit(1)
        );

        // If no events later today, get first event from tomorrow onwards
        if (!data || data.length === 0) {
          const result = await queryWithTimeout(async () =>
            supabase
              .from('events')
              .select('id, title, start_date, start_time, location')
              .eq('is_approved', true)
              .is('deleted_at', null)
              .gt('start_date', today)
              .order('start_date', { ascending: true })
              .order('start_time', { ascending: true })
              .limit(1)
          );
          
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
      <div className="text-white/70 text-sm">
        Loading...
      </div>
    );
  }

  if (!nextEvent) {
    return (
      <div className="space-y-3">
        {/* Big Icon LEFT + Big Title RIGHT - Like Alerts */}
        <div className="flex items-center gap-4">
          {/* Big Icon in Circle */}
          <div className="p-4 bg-white/20 rounded-full flex-shrink-0">
            <Calendar className="w-10 h-10 text-white" />
          </div>
          
          {/* Big Title */}
          <h3 className="text-3xl font-bold text-white">
            Calendar
          </h3>
        </div>
        
        {/* Description */}
        <div className="text-sm text-white/90">
          Island events & activities
        </div>
        
        <div className="text-sm text-white/70">
          No upcoming events
        </div>
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
  const displayTitle = nextEvent.title.length > 40 
    ? nextEvent.title.substring(0, 37) + '...'
    : nextEvent.title;

  // Truncate location if too long
  const displayLocation = nextEvent.location.length > 30
    ? nextEvent.location.substring(0, 27) + '...'
    : nextEvent.location;

  return (
    <div className="space-y-3">
      {/* Big Icon LEFT + Big Title RIGHT - Like Alerts */}
      <div className="flex items-center gap-4">
        {/* Big Icon in Circle */}
        <div className="p-4 bg-white/20 rounded-full flex-shrink-0">
          <Calendar className="w-10 h-10 text-white" />
        </div>
        
        {/* Big Title */}
        <h3 className="text-3xl font-bold text-white">
          Calendar
        </h3>
      </div>
      
      {/* Description */}
      <div className="text-sm text-white/90">
        Island events & activities
      </div>
      
      {/* Event Title - Readable & Bold */}
      <div className="text-base font-semibold text-white line-clamp-2">
        {displayTitle}
      </div>
      
      {/* Date & Time - Medium & Visible */}
      <div className="text-lg font-medium text-white/90">
        {dateDisplay} • {timeDisplay}
      </div>
      
      {/* Location - Supporting Info */}
      {nextEvent.location && (
        <div className="text-sm text-white/80">
          📍 {displayLocation}
        </div>
      )}
    </div>
  );
}
