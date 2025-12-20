// app/calendar/page.tsx
// Version: 1.0.0 - Dedicated Calendar page (eliminates flash navigation)
// Date: 2025-12-20
// Loads Calendar component directly - no redirect through home page
'use client';

import { useState, useEffect } from 'react';
import Calendar from '@/components/Calendar';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/supabase';
import { Event } from '@/lib/types';

export default function CalendarPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('is_approved', true)
        .order('start_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;

      // Convert database rows to Event objects
      // Same logic as app/page.tsx - parse dates in local timezone
      const formattedEvents: Event[] = (data || []).map(event => {
        const parseLocalDate = (dateStr: string) => {
          if (!dateStr) return new Date();
          const [year, month, day] = dateStr.split('-').map(Number);
          return new Date(year, month - 1, day);
        };

        return {
          // Core
          id: event.id,
          title: event.title,
          description: event.description || '',
          category: event.category,
          
          // Date/Time - Parse in local timezone
          start_date: parseLocalDate(event.start_date),
          end_date: event.end_date ? parseLocalDate(event.end_date) : parseLocalDate(event.start_date),
          start_time: event.start_time || undefined,
          end_time: event.end_time || undefined,
          is_all_day: event.is_all_day || false,
          
          // Recurrence
          is_recurring: event.is_recurring || false,
          recurrence_pattern: event.recurrence_pattern,
          
          // Location
          location: event.location || '',
          venue_name: event.venue_name,
          venue_address: event.venue_address,
          venue_city: event.venue_city,
          venue_postal_code: event.venue_postal_code,
          venue_map_url: event.venue_map_url,
          parking_info: event.parking_info,
          
          // Cost & Registration
          fees: event.fees,
          registration_url: event.registration_url,
          registration_required: event.registration_required,
          registration_deadline: event.registration_deadline,
          
          // Capacity
          max_attendees: event.max_attendees,
          min_attendees: event.min_attendees,
          rsvp_count: event.rsvp_count,
          waitlist_enabled: event.waitlist_enabled,
          waitlist_count: event.waitlist_count,
          
          // Organizer
          organizer_name: event.organizer_name,
          organizer_organization: event.organizer_organization,
          organizer_website: event.organizer_website,
          contact_email: event.contact_email,
          contact_phone: event.contact_phone,
          
          // Additional Info
          additional_info: event.additional_info,
          age_restrictions: event.age_restrictions,
          accessibility_info: event.accessibility_info,
          what_to_bring: event.what_to_bring,
          dress_code: event.dress_code,
          
          // Media
          image_url: event.image_url,
          
          // Metadata
          created_at: event.created_at || new Date().toISOString(),
          updated_at: event.updated_at || new Date().toISOString(),
          is_approved: event.is_approved,
          is_featured: event.is_featured || false,
          tags: event.tags || [],
        };
      });

      setEvents(formattedEvents);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gabriola-sand/10">
      <main className="flex-1 overflow-auto">
        <Calendar events={events} loading={loading} />
      </main>
      <Footer activeTab="calendar" />
    </div>
  );
}
