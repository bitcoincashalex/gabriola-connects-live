// components/NextEventWidget.tsx
// Shows next upcoming event - REDESIGNED
// Version: 4.2.0 - Added timeout error state + changed subtitle to "Next upcoming event"
// Date: 2025-12-22

'use client';

import { useState, useEffect } from 'react';
import { queryWithTimeout, supabase } from '@/lib/supabaseWithTimeout';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { Calendar, AlertCircle } from 'lucide-react';
import Link from 'next/link';

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
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const loadNextEvent = async () => {
      try {
        setHasError(false);
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
        setHasError(true);
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

  if (hasError) {
    return (
      <div className="space-y-3">
        {/* Big Icon LEFT + Big Title RIGHT */}
        <div className="flex items-center gap-4">
          <div className="p-4 bg-white/20 rounded-full flex-shrink-0">
            <Calendar className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-3xl font-bold text-white">Calendar</h3>
        </div>
        
        <div className="text-sm text-white/90">Next upcoming event</div>
        
        {/* Timeout Error State */}
        <div className="text-center py-2">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-white/90" />
          <p className="font-medium text-sm mb-1 text-white">Unable to load events</p>
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
        
        {/* Description - CHANGED */}
        <div className="text-sm text-white/90">
          Next upcoming event
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
      
      {/* Description - CHANGED */}
      <div className="text-sm text-white/90">
        Next upcoming event
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
