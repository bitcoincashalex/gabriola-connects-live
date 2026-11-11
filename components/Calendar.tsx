// Path: components/Calendar.tsx
// Version: 4.2.0 - "Special events / Everything" switch: the calendar opens on special events
//                  (concerts, fairs, AGMs), with the weekly programs one click away; each day in
//                  Month view says how many programs are hidden, and clicking a day still lists
//                  everything on it. Entries are coloured by category (seven colour families, key
//                  under the calendar). See lib/eventKind.ts for both rules.
// Previous: 4.1.2 - Times in the day list stay on one line ("10:00 AM", not "10:00 / AM"). On wide
//                  screens the page lines up with the header instead of running edge to edge.
// Previous: 4.1.1 - An event whose end date is before its start date (bad data) shows on its start
//                  day instead of breaking the layout of that whole week.
// Previous: 4.1.0 - Month view: an event that runs more than a week (e.g. a program listed as
//                  "Sept 15 to Dec 22") shows as one entry on its first day instead of a bar across
//                  every week that pushed the day's other events into "+N more". The list under the
//                  calendar now includes events still running on the chosen day ("ongoing").
// Previous: 4.0.0 - Calendar redesign: List view (day by day, the default on phones) and Month view
//                  with a toggle; filter by venue; shows "Loading events..." until events arrive
//                  (was "0 events" over an empty calendar); times shown as 10:00 AM (was 10:00:00);
//                  second Sign In button removed (the site header has one); day's events no longer
//                  in a small box that scrolls on its own; page no longer jumps down on first load.
// Previous: 3.0.3 - Attribution now lists all event sources (was "Sample events data")
// Earlier: 3.0.2 - REVERTED: Removed canCreateEvents check - ANY logged-in user can add events
// Date: 2026-10-10
// FIX: "Switch to Full Event Form" opens in same window (removed target="_blank")
// CRITICAL FIX: All hooks must run in same order every render - moved loading check to end
'use client';

import { ymd, daysBetween, prettyDate } from '@/lib/eventSeries';
import { programIds, familyFor, FAMILIES } from '@/lib/eventKind';
import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Calendar as BigCalendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { Event } from '@/lib/types';
import { X, Clock, Plus, Upload, UserCircle, List, CalendarDays } from 'lucide-react';
import { useUser } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import EventDetailModal from '@/components/EventDetailModal';
import CalendarList, { formatEventTime, eventPlace } from '@/components/CalendarList';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './calendar-custom.css';

interface Venue {
  id: string;
  name: string;
  address: string;
  city: string;
  postal_code: string | null;
  map_url: string;
  alternate_names: string[];
}

const locales = {
  'en-US': require('date-fns/locale/en-US'),
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// CRITICAL FIX: Helper to safely handle Date objects from page.tsx
// page.tsx already converts dates to Date objects, not strings!
// Also handles undefined/null by returning current date as fallback
// Events longer than this show as a single entry in the month grid
const LONG_EVENT_DAYS = 7;
const spanDays = (e: any) =>
  e?.end_date ? daysBetween(ymd(e.start_date), ymd(e.end_date)) : 0;

const ensureDate = (dateValue: Date | string | undefined | null): Date => {
  if (!dateValue) return new Date(); // Handle undefined/null
  if (dateValue instanceof Date) {
    // Check if it's a valid Date object
    return isNaN(dateValue.getTime()) ? new Date() : dateValue;
  }
  const parsed = new Date(dateValue);
  // Check if parsing resulted in valid date
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};


export default function Calendar({ events = [], loading = false }: { events?: Event[], loading?: boolean }) {
  const { user, loading: authLoading } = useUser();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string>('');
  const [view, setView] = useState<'list' | 'month'>('list');
  const [venueFilter, setVenueFilter] = useState<string>('');
  const firstDateRun = useRef(true);

  // Phones start on the list, computers on the month. A choice the visitor makes is remembered.
  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem('gc-calendar-view'); } catch {}
    if (saved === 'list' || saved === 'month') setView(saved);
    else setView(window.innerWidth < 768 ? 'list' : 'month');
  }, []);

  // Special events only (the default), or everything including the weekly programs
  const [showAll, setShowAll] = useState(false);
  useEffect(() => {
    try { if (localStorage.getItem('gc-calendar-show') === 'all') setShowAll(true); } catch {}
  }, []);
  const chooseShow = (all: boolean) => {
    setShowAll(all);
    try { localStorage.setItem('gc-calendar-show', all ? 'all' : 'special'); } catch {}
  };

  const chooseView = (v: 'list' | 'month') => {
    setView(v);
    try { localStorage.setItem('gc-calendar-view', v); } catch {}
  };

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '',
    endDate: format(new Date(), 'yyyy-MM-dd'),
    endTime: '',
    allDay: false,
    location: '',
    venue_name: '',
    venue_address: '',
    venue_city: 'Gabriola',
    venue_postal_code: '',
    venue_map_url: '',
    description: '',
    posterImage: '',
    organizerEmail: '',
    organizerPhone: '',
    contactInfo: '',
    fees: '',
    recurring: '',
    source: 'User Submitted',
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [customLocation, setCustomLocation] = useState<string>('');
  
  // Ref for auto-scrolling to event list
  const eventListRef = useRef<HTMLDivElement>(null);
  
  // Load venues from database
  useEffect(() => {
    const loadVenues = async () => {
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .order('name', { ascending: true });
      
      if (!error && data) {
        setVenues(data);
      }
    };
    loadVenues();
  }, []);

  // Auto-scroll to event list when a date is picked (not on first load)
  useEffect(() => {
    if (firstDateRun.current) { firstDateRun.current = false; return; }
    // Small delay to let event list render first
    setTimeout(() => {
      eventListRef.current?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);
  }, [selectedDate]);


  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be smaller than 5MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormData({ ...formData, posterImage: base64String });
        setImagePreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setFormData({ ...formData, posterImage: '' });
    setImagePreview(null);
  };

  // Venues to filter by: the places with the most events, busiest first
  const venueOptions = useMemo(() => {
    if (!Array.isArray(events)) return [];
    const counts = new Map<string, number>();
    for (const e of events) {
      const place = e ? eventPlace(e) : '';
      if (place) counts.set(place, (counts.get(place) || 0) + 1);
    }
    return Array.from(counts.entries())
      .filter(([, n]) => n >= 2)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 40)
      .map(([name]) => name);
  }, [events]);

  const shownEvents = useMemo(() => {
    if (!Array.isArray(events)) return [];
    return venueFilter ? events.filter(e => e && eventPlace(e) === venueFilter) : events;
  }, [events, venueFilter]);

  // Which events are regular programs (worked out from every event, not just one venue's)
  const programs = useMemo(() => programIds(Array.isArray(events) ? events : []), [events]);

  // What the list and the month grid show: special events, or everything
  const visibleEvents = useMemo(
    () => (showAll ? shownEvents : shownEvents.filter(e => e && !programs.has(e.id))),
    [shownEvents, showAll, programs]
  );

  // Programs hidden on each day, for the "+ 9 programs" line in the month grid
  const hiddenPerDay = useMemo(() => {
    const counts: Record<string, number> = {};
    if (showAll) return counts;
    for (const e of shownEvents) {
      if (!e || !e.start_date || !programs.has(e.id)) continue;
      const day = ymd(e.start_date);
      counts[day] = (counts[day] || 0) + 1;
    }
    return counts;
  }, [shownEvents, showAll, programs]);

  const calendarEvents = useMemo(() => {
    // Safety: Return empty array if events is not a valid array
    if (!Array.isArray(visibleEvents) || visibleEvents.length === 0) {
      return [];
    }
    
    return visibleEvents
      .filter(event => event && event.start_date) // Filter out null/undefined events and those without dates
      .map(event => {
        const span = spanDays(event);
        // Long-running, or ending before it starts (bad data): one entry on its first day
        const long = span > LONG_EVENT_DAYS;
        const backwards = span < 0;
        return {
          title: long ? `${event.title || 'Untitled Event'} (ongoing)` : (event.title || 'Untitled Event'),
          start: ensureDate(event.start_date),
          // A long-running event is one entry on its first day, not a bar across every week
          end: long || backwards ? ensureDate(event.start_date) : ensureDate(event.end_date || event.start_date),
          resource: event,
        };
      });
  }, [visibleEvents]);

  const eventsForSelectedDate = useMemo(() => {
    // Safety: Return empty array if events is not a valid array
    if (!Array.isArray(shownEvents) || shownEvents.length === 0) {
      return [];
    }
    
    return shownEvents
      .filter(event => event && event.start_date) // Filter out null/undefined events and those without dates
      .filter(event => {
        try {
          // Starts that day, or a multi-day event still running that day
          const day = ymd(selectedDate);
          const start = ymd(event.start_date);
          const end = event.end_date ? ymd(event.end_date) : start;
          return start === day || (start < day && day <= end);
        } catch (e) {
          console.error('Error filtering event by date:', e);
          return false;
        }
      })
      .sort((a, b) => {
        // Events starting that day first (by time), then ongoing ones
        const day = ymd(selectedDate);
        const ongoingA = ymd(a.start_date) !== day ? 1 : 0;
        const ongoingB = ymd(b.start_date) !== day ? 1 : 0;
        if (ongoingA !== ongoingB) return ongoingA - ongoingB;
        const timeA = a.start_time || '00:00:00';
        const timeB = b.start_time || '00:00:00';
        return timeA.localeCompare(timeB);
      });
  }, [shownEvents, selectedDate]);

  const handleSelectSlot = ({ start }: { start: Date }) => {
    setSelectedDate(start);
    setSelectedEvent(null);
  };

  const handleSelectEvent = (event: any) => {
    setSelectedEvent(event.resource);
  };

  const handleNavigate = (date: Date) => {
    setSelectedDate(date);
    setSelectedEvent(null);
  };

  const handleVenueChange = (venueId: string) => {
    setSelectedVenueId(venueId);
    
    if (venueId === 'other') {
      // Custom location - clear venue fields
      setFormData({
        ...formData,
        venue_name: '',
        venue_address: '',
        venue_city: 'Gabriola',
        venue_postal_code: '',
        venue_map_url: '',
        location: ''
      });
      setCustomLocation('');
    } else if (venueId) {
      // Selected venue - auto-fill all fields
      const venue = venues.find(v => v.id === venueId);
      if (venue) {
        setFormData({
          ...formData,
          venue_name: venue.name,
          venue_address: venue.address || '',
          venue_city: venue.city || 'Gabriola',
          venue_postal_code: venue.postal_code || '',
          venue_map_url: venue.map_url || '',
          location: `${venue.name}, Gabriola`
        });
      }
      setCustomLocation('');
    } else {
      // No selection
      setCustomLocation('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalLocation = selectedVenueId === 'other' ? customLocation.trim() : formData.location.trim();
    
    if (!formData.title.trim() || !finalLocation) {
      alert('Please fill in Title and Location');
      return;
    }

    if (!formData.allDay && !formData.time.trim()) {
      alert('Please fill in Start Time, or check "All Day Event"');
      return;
    }

    if (formData.organizerEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.organizerEmail.trim())) {
        alert('Please enter a valid email address (e.g., name@example.com)');
        return;
      }
    }

    if (formData.organizerPhone.trim()) {
      const cleanPhone = formData.organizerPhone.replace(/[\s\-\(\)]/g, '');
      const phoneRegex = /^(\+\d{1,3})?\d{10,}$/;
      if (!phoneRegex.test(cleanPhone)) {
        alert('Please enter a valid phone number (e.g., 250-555-1234 or +1-250-555-1234)');
        return;
      }
    }

    // Insert directly to Supabase instead of dispatching event
    const { error } = await supabase.from('events').insert({
      title: formData.title.trim(),
      description: formData.description.trim() || 'No description provided.',
      start_date: formData.date,
      end_date: formData.endDate || formData.date,
      start_time: formData.allDay ? null : formData.time,
      end_time: formData.endTime || null,
      is_all_day: formData.allDay,
      location: finalLocation,
      venue_name: formData.venue_name || null,
      venue_address: formData.venue_address || null,
      venue_city: formData.venue_city || 'Gabriola Island',
      venue_postal_code: formData.venue_postal_code || null,
      venue_map_url: formData.venue_map_url || null,
      image_url: formData.posterImage.trim() || null,
      contact_email: formData.organizerEmail.trim() || null,
      contact_phone: formData.organizerPhone.trim() || null,
      fees: formData.fees.trim() || null,
      is_recurring: formData.recurring.trim() ? true : false,
      recurrence_pattern: formData.recurring.trim() || null,
      source_name: 'User Submitted',
      source_type: 'user_submitted',
      is_approved: true, // Auto-approve calendar events
      created_by: user?.id,
    });

    if (!error) {
      alert('Event added to calendar! 🎉');
      // Reset form
      setFormData({
        title: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        time: '',
        endDate: format(new Date(), 'yyyy-MM-dd'),
        endTime: '',
        allDay: false,
        location: '',
        venue_name: '',
        venue_address: '',
        venue_city: 'Gabriola',
        venue_postal_code: '',
        venue_map_url: '',
        description: '',
        posterImage: '',
        organizerEmail: '',
        organizerPhone: '',
        contactInfo: '',
        fees: '',
        recurring: '',
        source: 'User Submitted',
      });
      setImagePreview(null);
      setCustomLocation('');
      setSelectedVenueId('');
      setShowAddForm(false);
      
      // Refresh page to show new event (parent component fetches events)
      window.location.reload();
    } else {
      alert('Error adding event: ' + error.message);
    }
  };

  const handleRSVP = (event: Event) => {
    if (event.contact_email) {
      const subject = encodeURIComponent(`RSVP: ${event.title}`);
      const body = encodeURIComponent(
        `Hi,\n\nI would like to RSVP for the following event:\n\n` +
        `Event: ${event.title}\n` +
        `Date: ${format(ensureDate(event.start_date), 'MMMM d, yyyy')}\n` +
        `Time: ${formatEventTime(event.start_time, event.is_all_day)}\n` +
        `Location: ${event.location}\n\n` +
        `Please confirm my attendance.\n\nThank you!`
      );
      window.location.href = `mailto:${event.contact_email}?subject=${subject}&body=${body}`;
    } else {
      alert('No organizer email available for this event. Please check the event source for RSVP details.');
    }
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const formatTimeDisplay = (time24: string): string => {
    if (!time24 || time24 === 'All Day') return time24;
    
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getFullAddress = (location: string): string => {
    const locationMap: { [key: string]: string } = {
      'community hall': 'Gabriola Community Hall, 2200 South Road, Gabriola Island, BC',
      'agi hall': 'Agi Hall, 575 South Road, Gabriola Island, BC',
      'agricultural hall': 'Agi Hall, 575 South Road, Gabriola Island, BC',
      'surf lodge': 'Surf Lodge, 885 Berry Point Rd, Gabriola Island, BC',
      'commons': 'The Commons, 501 South Road, Gabriola Island, BC',
      'rollo centre': 'Rollo Centre, 575 South Road, Gabriola Island, BC',
      'rollo center': 'Rollo Centre, 575 South Road, Gabriola Island, BC',
      'fellowship church': 'Gabriola Fellowship Church, Gabriola Island, BC',
      'gabriola golf': 'Gabriola Golf Club, Gabriola Island, BC',
      'golf club': 'Gabriola Golf Club, Gabriola Island, BC',
      'phoenix': 'Phoenix Auditorium, Gabriola Island, BC',
      'phoenix auditorium': 'Phoenix Auditorium, Gabriola Island, BC',
      'library': 'Gabriola Library, 575 South Road, Gabriola Island, BC',
      'gabriola library': 'Gabriola Library, 575 South Road, Gabriola Island, BC',
      "pages inn": "Page's Inn on Silva Bay, 3415 South Road, Gabriola Island, BC",
      'silva bay': "Page's Inn on Silva Bay, 3415 South Road, Gabriola Island, BC",
      'huxley': 'Huxley Community Park, 2720 Huxley Rd, Gabriola Island, BC',
      'huxley park': 'Huxley Community Park, 2720 Huxley Rd, Gabriola Island, BC',
    };

    const locationLower = location.toLowerCase();
    for (const [key, fullAddress] of Object.entries(locationMap)) {
      if (locationLower.includes(key)) {
        return fullAddress;
      }
    }

    return `${location}, Gabriola Island, BC`;
  };

  // Check loading state AFTER all hooks have run (Rules of Hooks compliance)
  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center py-32">
        <p className="text-2xl text-gray-600">Loading calendar...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#F6F2EA] text-[#1F2A24]">
      <div className="px-4 lg:px-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))] pt-4 pb-3 bg-white border-b border-[#E3DCCF]">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h1 className="text-2xl font-display font-bold text-gabriola-green-dark">
            Island Events
          </h1>
          {user && (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 text-sm text-[#5B6660] mr-2">
                <UserCircle className="w-5 h-5" />
                <span>{user.username}</span>
              </div>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-gabriola-green text-white px-4 py-2 min-h-[44px] rounded-lg font-semibold hover:bg-gabriola-green-dark transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {showAddForm ? 'Cancel' : 'Add Event'}
              </button>
            </div>
          )}
        </div>

        {/* Attribution */}
        <p className="text-[13px] text-[#5B6660] mb-3">
          Events from the{' '}
          <a
            href="https://directory.gabriolaevents.ca/gabriola-events/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-gabriola-green hover:text-gabriola-green-dark"
          >
            Gabriola Chamber of Commerce events directory
          </a>
          , Rollo Centre, Community Hall, Recreation Society and islanders
        </p>

        {/* View toggle + venue filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-gabriola-green overflow-hidden" role="group" aria-label="Calendar view">
            <button
              onClick={() => chooseView('list')}
              aria-pressed={view === 'list'}
              className={`flex items-center gap-1.5 px-4 min-h-[44px] text-sm font-semibold transition-colors ${view === 'list' ? 'bg-gabriola-green text-white' : 'bg-white text-gabriola-green hover:bg-gabriola-green/10'}`}
            >
              <List className="w-4 h-4" aria-hidden="true" /> List
            </button>
            <button
              onClick={() => chooseView('month')}
              aria-pressed={view === 'month'}
              className={`flex items-center gap-1.5 px-4 min-h-[44px] text-sm font-semibold border-l border-gabriola-green transition-colors ${view === 'month' ? 'bg-gabriola-green text-white' : 'bg-white text-gabriola-green hover:bg-gabriola-green/10'}`}
            >
              <CalendarDays className="w-4 h-4" aria-hidden="true" /> Month
            </button>
          </div>

          <div className="inline-flex rounded-lg border border-gabriola-green overflow-hidden" role="group" aria-label="Which events to show">
            <button
              onClick={() => chooseShow(false)}
              aria-pressed={!showAll}
              title="Concerts, fairs, meetings and other one-off events"
              className={`px-4 min-h-[44px] text-sm font-semibold transition-colors ${!showAll ? 'bg-gabriola-green text-white' : 'bg-white text-gabriola-green hover:bg-gabriola-green/10'}`}
            >
              Special events
            </button>
            <button
              onClick={() => chooseShow(true)}
              aria-pressed={showAll}
              title="Also show the weekly programs"
              className={`px-4 min-h-[44px] text-sm font-semibold border-l border-gabriola-green transition-colors ${showAll ? 'bg-gabriola-green text-white' : 'bg-white text-gabriola-green hover:bg-gabriola-green/10'}`}
            >
              Everything
            </button>
          </div>

          <label className="flex-1 min-w-[180px] md:max-w-sm">
            <span className="sr-only">Filter by venue</span>
            <select
              value={venueFilter}
              onChange={e => setVenueFilter(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-lg border border-[#CFC6B4] bg-white text-sm text-[#1F2A24] focus:outline-none focus:ring-2 focus:ring-gabriola-green"
            >
              <option value="">All venues</option>
              {venueOptions.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {showAddForm && (
        <div className="p-4 bg-gabriola-sand/30 border-b border-gabriola-green/20 slide-up overflow-y-auto max-h-[500px]">
          <h3 className="font-semibold text-gabriola-green-dark mb-3">Add New Event</h3>
          
          {/* Notice about Full Event Form - BEFORE users start typing */}
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800 mb-2">
              📋 <strong>Quick add</strong> for basic events, or use the <strong>Full Event Form</strong> for advanced options:
            </p>
            <ul className="text-xs text-blue-700 mb-2 ml-5 list-disc space-y-1">
              <li>Registration & capacity management</li>
              <li>Accessibility information</li>
              <li>Age restrictions & dress code</li>
              <li>Recurring events & tags</li>
            </ul>
            <Link 
              href="/events"
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium"
            >
              Switch to Full Event Form →
            </Link>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Title *</label>
              <input type="text" placeholder="Event Title" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gabriola-green" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value, endDate: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gabriola-green" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gabriola-green" />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 px-4 py-2 cursor-pointer">
                  <input type="checkbox" checked={formData.allDay} onChange={e => setFormData({ ...formData, allDay: e.target.checked })} className="w-4 h-4 text-gabriola-green focus:ring-gabriola-green rounded" />
                  <span className="text-sm font-medium text-gray-700">All Day</span>
                </label>
              </div>
            </div>
            {!formData.allDay && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
                  <input type="time" value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gabriola-green" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input type="time" value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gabriola-green" />
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date and Time Description</label>
              <input type="text" placeholder="e.g., Every Monday, First Friday of month" value={formData.recurring} onChange={e => setFormData({ ...formData, recurring: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gabriola-green" />
              <p className="text-xs text-gray-500 mt-1">For recurring events or special timing notes</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Venue *</label>
              <select
                value={selectedVenueId}
                onChange={(e) => handleVenueChange(e.target.value)}
                required={!customLocation}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gabriola-green"
              >
                <option value="">Select a venue...</option>
                {venues.map(venue => (
                  <option key={venue.id} value={venue.id}>{venue.name}</option>
                ))}
                <option value="other">Other location...</option>
              </select>
              {selectedVenueId === 'other' && (
                <input
                  type="text"
                  placeholder="Type custom location here"
                  value={customLocation}
                  onChange={(e) => setCustomLocation(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gabriola-green mt-2"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea placeholder="Event description" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gabriola-green resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fees/Admission</label>
              <input type="text" placeholder="e.g., Free, $10, By Donation" value={formData.fees} onChange={e => setFormData({ ...formData, fees: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gabriola-green" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Information</label>
              <textarea placeholder="Additional contact details" value={formData.contactInfo} onChange={e => setFormData({ ...formData, contactInfo: e.target.value })} rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gabriola-green resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organizer Email</label>
                <input type="email" placeholder="for RSVPs" value={formData.organizerEmail} onChange={e => setFormData({ ...formData, organizerEmail: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gabriola-green" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organizer Phone</label>
                <input type="tel" placeholder="for inquiries" value={formData.organizerPhone} onChange={e => setFormData({ ...formData, organizerPhone: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gabriola-green" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Event Poster Image (optional)</label>
              {imagePreview ? (
                <div className="relative">
                  <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover rounded-lg border-2 border-gabriola-green/20" />
                  <button type="button" onClick={removeImage} className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gabriola-green transition-colors bg-gray-50 hover:bg-gray-100">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">Click to upload image</span>
                    <span className="text-xs text-gray-500 mt-1">(Max 5MB, JPG/PNG)</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                  <div className="text-center text-sm text-gray-500">or</div>
                  <input type="url" placeholder="Paste image URL" value={formData.posterImage} onChange={e => { setFormData({ ...formData, posterImage: e.target.value }); if (e.target.value) setImagePreview(e.target.value); }} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gabriola-green" />
                </div>
              )}
            </div>
            
            <button type="submit" className="w-full bg-gabriola-green text-white py-3 px-4 rounded-lg font-semibold hover:bg-gabriola-green-dark transition-colors">
              Add Event to Calendar
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-[#5B6660]" role="status">Loading events...</div>
      ) : view === 'list' ? (
        <>
          {!showAll && (
            <p className="px-4 lg:px-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))] pt-3 text-sm text-[#5B6660]">
              Showing special events. Weekly programs like classes, clubs and meetings are under{' '}
              <button onClick={() => chooseShow(true)} className="font-semibold text-gabriola-green underline">Everything</button>.
            </p>
          )}
          <CalendarList events={visibleEvents} onSelect={setSelectedEvent} />
        </>
      ) : (
        <>
          <div className="p-4 lg:px-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))] bg-white">
            <p className="text-sm text-[#5B6660] mb-2">
              {eventsForSelectedDate.length} event{eventsForSelectedDate.length !== 1 ? 's' : ''} on {format(selectedDate, 'MMMM d, yyyy')}
            </p>
            <div className="min-h-[600px]">
              <BigCalendar
                localizer={localizer}
                events={calendarEvents}
                startAccessor="start"
                endAccessor="end"
                views={[Views.MONTH]}
                defaultView={Views.MONTH}
                date={selectedDate}
                onNavigate={handleNavigate}
                onSelectSlot={handleSelectSlot}
                onSelectEvent={handleSelectEvent}
                selectable
                eventPropGetter={(ev: any) => {
                  const fam = familyFor(ev?.resource?.category);
                  return { style: { '--ev-bg': fam.tint, '--ev-edge': fam.edge, '--ev-fg': '#1F2A24' } as React.CSSProperties };
                }}
                components={{
                  event: ({ event: ev }: any) => (
                    <span>
                      <span
                        aria-hidden="true"
                        className="inline-block w-[7px] h-[7px] rounded-full mr-1 align-middle"
                        style={{ backgroundColor: familyFor(ev?.resource?.category).color }}
                      />
                      {ev.title}
                    </span>
                  ),
                  month: {
                    dateHeader: ({ date, label }: any) => {
                      const n = hiddenPerDay[ymd(date)] || 0;
                      return (
                        <span className="flex items-baseline justify-between gap-1">
                          <span className="text-[11px] text-[#5B6660] truncate">
                            {n > 0 && <>+{n}<span className="hidden md:inline"> program{n === 1 ? '' : 's'}</span></>}
                          </span>
                          <span>{label}</span>
                        </span>
                      );
                    },
                  },
                }}
                className="h-full"
                style={{ minHeight: '600px' }}
              />
            </div>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[13px] text-[#3A4640]" aria-label="Colour key">
              {FAMILIES.map(f => (
                <li key={f.key} className="flex items-center gap-1.5">
                  <span aria-hidden="true" className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: f.color }} />
                  {f.label}
                </li>
              ))}
            </ul>
          </div>

          {eventsForSelectedDate.length > 0 && !selectedEvent && (
            <div ref={eventListRef} className="p-4 lg:px-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))] scroll-mt-24">
              <h3 className="text-sm font-bold uppercase tracking-wide text-gabriola-green-dark mb-2">
                Events on {format(selectedDate, 'EEEE, MMMM d')}
              </h3>
              <div className="bg-white border border-[#E3DCCF] rounded-2xl divide-y divide-[#EEE8DD] overflow-hidden">
                {eventsForSelectedDate.map(event => (
                  <button
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className="w-full text-left flex gap-3 px-4 py-3 min-h-[56px] hover:bg-[#F6F2EA] transition-colors"
                  >
                    <span className="w-[92px] flex-shrink-0 whitespace-nowrap text-sm font-semibold text-gabriola-green pt-0.5 flex items-start gap-1">
                      <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" aria-hidden="true" />
                      {ymd(event.start_date) !== ymd(selectedDate) ? 'Ongoing' : formatEventTime(event.start_time, event.is_all_day)}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[15px] font-semibold leading-snug">
                        <span
                          aria-hidden="true"
                          className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
                          style={{ backgroundColor: familyFor((event as any).category).color }}
                        />
                        {event.title}
                      </span>
                      {event.end_date && ymd(event.end_date) > ymd(event.start_date) && (
                        <span className="block text-[13px] text-[#5B6660]">
                          {prettyDate(ymd(event.start_date))} to {prettyDate(ymd(event.end_date))}
                        </span>
                      )}
                      {eventPlace(event) && <span className="block text-[13px] text-[#5B6660] truncate">{eventPlace(event)}</span>}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Event Detail Modal */}
      <EventDetailModal 
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
}