// components/NextEventWidget.tsx
// Shows next 2 upcoming events (body of the front page Calendar card)
// Version: 5.0.0 - Front page redesign: the card (icon, title) is now drawn by the front page;
//                  this shows only the events, in dark text for the white card. No emoji.
// Previous: 4.3.2 - Error state: removed nested Sign In link (link inside the card link is invalid HTML)
// Date: 2026-10-10

'use client';

import { useState, useEffect } from 'react';
import { queryWithTimeout, supabase } from '@/lib/supabaseWithTimeout';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';

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
    return <div className="text-sm text-[#5B6660] pt-3 border-t border-[#EEE8DD]">Loading...</div>;
  }

  if (hasError) {
    return (
      <div className="text-sm text-[#5B6660] pt-3 border-t border-[#EEE8DD]">
        Unable to load events. Please refresh the page to try again.
      </div>
    );
  }

  if (nextEvents.length === 0) {
    return <div className="text-sm text-[#5B6660] pt-3 border-t border-[#EEE8DD]">No upcoming events</div>;
  }

  const formatDateDisplay = (dateString: string): string => {
    const eventDate = parseISO(dateString);
    if (isToday(eventDate)) return 'Today';
    if (isTomorrow(eventDate)) return 'Tomorrow';
    return format(eventDate, 'EEE MMM d');
  };

  const formatTimeDisplay = (timeString: string | null): string => {
    if (!timeString) return 'All day';
    return format(parseISO(`2000-01-01T${timeString}`), 'h:mm a');
  };

  return (
    <div className="flex flex-col">
      {nextEvents.map(event => (
        <div key={event.id} className="pt-3 mt-0 border-t border-[#EEE8DD] pb-3 last:pb-0 space-y-1">
          <div className="text-base font-semibold leading-snug line-clamp-2">{event.title}</div>
          <div className="text-sm font-semibold text-gabriola-green">
            {formatDateDisplay(event.start_date)} · {formatTimeDisplay(event.start_time)}
          </div>
          {event.location && (
            <div className="text-[13px] text-[#5B6660] truncate">{event.location}</div>
          )}
        </div>
      ))}
    </div>
  );
}
