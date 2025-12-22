// components/NextEventWidget.tsx
// Shows next 2 upcoming events - REDESIGNED
// Version: 4.3.0 - Shows 2 events instead of 1
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
  const [nextEvents, setNextEvents] = useState<EventInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const loadNextEvents = async () => {
      try {
        setHasError(false);
        const now = new Date();
        const today = format(now, 'yyyy-MM-dd');
        const currentTime = format(now, 'HH:mm:ss');

        // Try to get events happening later TODAY (with timeout) - get 2
        let { data, error } = await queryWithTimeout(async () =>
          supabase
            .from('events')
            .select('id, title, start_date, start_time, location')
            .eq('is_approved', true)
            .is('deleted_at', null)
            .eq('start_date', today)
            .gt('start_time', currentTime)
            .order('start_time', { ascending: true })
            .limit(2)
        );

        // If we have less than 2 events today, get more from tomorrow onwards
        if (!data || data.length < 2) {
          const todayEvents = data || [];
          const remaining = 2 - todayEvents.length;
          
          const result = await queryWithTimeout(async () =>
            supabase
              .from('events')
              .select('id, title, start_date, start_time, location')
              .eq('is_approved', true)
              .is('deleted_at', null)
              .gt('start_date', today)
              .order('start_date', { ascending: true })
              .order('start_time', { ascending: true })
              .limit(remaining)
          );
          
          // Combine today's events with future events
          data = [...todayEvents, ...(result.data || [])];
          error = result.error;
        }

        if (error) {
          console.error('Error loading next events:', error);
          setNextEvents([]);
          return;
        }

        setNextEvents(data || []);
      } catch (error) {
        console.error('Error loading next events:', error);
        setHasError(true);
        setNextEvents([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadNextEvents();

    // Refresh every 5 minutes
    const interval = setInterval(loadNextEvents, 300000);
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
        
        <div className="text-sm text-white/90">Upcoming events</div>
        
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

  if (nextEvents.length === 0) {
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
          Upcoming events
        </div>
        
        <div className="text-sm text-white/70">
          No upcoming events
        </div>
      </div>
    );
  }

  // Helper function to format date display
  const formatDateDisplay = (dateString: string): string => {
    const eventDate = parseISO(dateString);
    if (isToday(eventDate)) {
      return 'Today';
    } else if (isTomorrow(eventDate)) {
      return 'Tomorrow';
    } else {
      return format(eventDate, 'MMM d');
    }
  };

  // Helper function to format time display
  const formatTimeDisplay = (timeString: string | null): string => {
    if (!timeString) return 'All day';
    return format(parseISO(`2000-01-01T${timeString}`), 'h:mm a');
  };

  // Get first and second events
  const firstEvent = nextEvents[0];
  const secondEvent = nextEvents[1];

  // Format first event data
  const firstDateDisplay = formatDateDisplay(firstEvent.start_date);
  const firstTimeDisplay = formatTimeDisplay(firstEvent.start_time);
  const firstTitle = firstEvent.title.length > 40 
    ? firstEvent.title.substring(0, 37) + '...'
    : firstEvent.title;
  const firstLocation = firstEvent.location.length > 30
    ? firstEvent.location.substring(0, 27) + '...'
    : firstEvent.location;

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
        Upcoming events
      </div>
      
      {/* FIRST Event - Full Details */}
      <div className="space-y-1">
        {/* Event Title - Readable & Bold */}
        <div className="text-base font-semibold text-white line-clamp-2">
          {firstTitle}
        </div>
        
        {/* Date & Time - Medium & Visible */}
        <div className="text-lg font-medium text-white/90">
          {firstDateDisplay} • {firstTimeDisplay}
        </div>
        
        {/* Location - Supporting Info */}
        {firstEvent.location && (
          <div className="text-sm text-white/80">
            📍 {firstLocation}
          </div>
        )}
      </div>

      {/* SECOND Event (if exists) - Compact */}
      {secondEvent && (
        <>
          <div className="border-t border-white/20 pt-2">
            <div className="text-xs text-white/70 mb-1">Next:</div>
            <div className="text-sm font-medium text-white line-clamp-1">
              {secondEvent.title.length > 35 
                ? secondEvent.title.substring(0, 32) + '...'
                : secondEvent.title}
            </div>
            <div className="text-sm text-white/80">
              {formatDateDisplay(secondEvent.start_date)} • {formatTimeDisplay(secondEvent.start_time)}
            </div>
            {secondEvent.location && (
              <div className="text-xs text-white/70">
                📍 {secondEvent.location.length > 25 
                  ? secondEvent.location.substring(0, 22) + '...'
                  : secondEvent.location}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
