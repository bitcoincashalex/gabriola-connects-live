// app/page.tsx
// v3.6.0 - Fixed timezone bug in date parsing (prevented day-shift display)
// Date: 2025-12-11
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LandingPage from '@/components/LandingPage';
import Calendar from '@/components/Calendar';
import BBS from '@/components/BBS';
import Directory from '@/components/Directory';
import Ferry from '@/components/Ferry';
import EmergencyAlertBanner from '@/components/EmergencyAlertBanner';
import Footer from '@/components/Footer';
import { useUser } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Event } from '@/lib/types';

type Tab = 'landing' | 'calendar' | 'forum' | 'directory' | 'ferry' | 'search';

export default function HomePage() {
  const { user } = useUser();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('landing');
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  // Read URL hash on mount and when hash changes
  useEffect(() => {
    const readHashAndSetTab = () => {
      const hash = window.location.hash.slice(1); // Remove '#'
      if (hash && ['calendar', 'forum', 'directory', 'ferry', 'search'].includes(hash)) {
        setActiveTab(hash as Tab);
      } else {
        setActiveTab('landing');
      }
    };

    // Read initial hash
    readHashAndSetTab();

    // Listen for hash changes (back/forward button)
    window.addEventListener('hashchange', readHashAndSetTab);
    
    return () => {
      window.removeEventListener('hashchange', readHashAndSetTab);
    };
  }, []);

  // Fetch events when calendar tab is active
  useEffect(() => {
    if (activeTab === 'calendar') {
      fetchEvents();
    }
  }, [activeTab]);

  const fetchEvents = async () => {
    setEventsLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('is_approved', true)
        .order('start_date', { ascending: true })
        .order('start_time', { ascending: true });  // FIX: Added time sorting

      if (error) throw error;

      // Convert database rows to Event objects
      const formattedEvents: Event[] = (data || []).map(event => {
        // Parse dates in local timezone (not UTC) to prevent day-shift
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
      setEventsLoading(false);
    }
  };

  const handleNavigateFromLanding = (tab: string) => {
    // Update URL hash (which triggers hashchange event and sets activeTab)
    window.location.hash = tab;
  };

  const handleTabClick = (tab: Tab) => {
    if (tab === 'landing') {
      // Clear hash for landing page
      window.location.hash = '';
    } else {
      // Set hash for other tabs
      window.location.hash = tab;
    }
  };

  if (activeTab === 'landing') {
    return (
      <div className="flex flex-col min-h-screen bg-gabriola-sand/10">
        <EmergencyAlertBanner />
        <main className="flex-1 overflow-auto">
          <LandingPage onNavigate={handleNavigateFromLanding} />
        </main>
        <Footer activeTab="landing" onNavigate={handleNavigateFromLanding} />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gabriola-sand/10">
      <main className="flex-1 overflow-auto">
        {activeTab === 'calendar' && <Calendar events={events} loading={eventsLoading} />}
        {activeTab === 'forum' && <BBS />}
        {activeTab === 'directory' && <Directory />}
        {activeTab === 'ferry' && <Ferry />}
        {activeTab === 'search' && (
          <div className="max-w-2xl mx-auto px-6 py-20 text-center">
            <h1 className="text-4xl font-bold text-gabriola-green mb-12">Search Coming Soon</h1>
          </div>
        )}
      </main>

      <Footer activeTab={activeTab} onNavigate={(tab) => handleTabClick(tab as Tab)} />
    </div>
  );
}
