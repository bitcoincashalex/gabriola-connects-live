// Path: components/EventsManager.tsx
// Version: 6.0.0 - Events page redesign: compact day-by-day list (time, name, venue) two weeks at a
//                  time with "Show more" (it drew all 720 events as big cards, making the page about
//                  435,000 pixels tall on a phone); tap an event to open it in place with its
//                  description and the RSVP, Add to Calendar, Details, Edit and Delete buttons;
//                  venue filter; past events behind a button; times shown as 10:00 AM; placeholder
//                  descriptions hidden; white cards to match the rest of the site.
// Previous: 5.0.3 - Attribution now lists all event sources (was "Sample events data")
// Earlier: 5.0.2 - Events list loads all events (was cut off at Supabase's 1,000-row limit)
// Before: 5.0.1 - PROPER REFACTOR: Uses shared EventFormModal, keeps ALL other features
// Date: 2026-10-10

'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchApprovedEvents } from '@/lib/fetchEvents';
import { useUser } from '@/components/AuthProvider';
import { canCreateEvents } from '@/lib/auth-utils';
import { Event } from '@/lib/types';
import { format, isAfter, isBefore, isSameDay, isToday, isTomorrow, addDays, startOfDay } from 'date-fns';
import { Plus, MapPin, Clock, DollarSign, Users, Mail, Phone, Calendar, Edit, Trash2, X, Upload, AlertCircle, Download, ChevronDown } from 'lucide-react';
import { exportEventToCalendar, generateGoogleCalendarURL } from '@/lib/calendar';
import EventDetailModal from '@/components/EventDetailModal';
import EventFormModal from '@/components/EventFormModal';
import { formatEventTime, eventPlace, realDescription } from '@/components/CalendarList';

interface Venue {
  id: string;
  name: string;
  address: string;
  city: string;
  postal_code: string | null;
  map_url: string;
  alternate_names: string[];
}

interface EventCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
}

export default function EventsManager() {
  const { user } = useUser();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [viewEvent, setViewEvent] = useState<Event | null>(null); // For viewing details
  const [rsvpEvent, setRsvpEvent] = useState<Event | null>(null);
  const [rsvpCount, setRsvpCount] = useState<Record<string, number>>({});
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string>('');
  const [customLocation, setCustomLocation] = useState('');

  // Check if user can publish events instantly
  const canPublishInstantly = user && (
    user.is_super_admin || 
    (user as any).admin_events || 
    (user as any).can_create_events
  );

  // Form state
  const [form, setForm] = useState({
    // Basic Info
    title: '',
    description: '',
    category: '',
    image_url: '',
    
    // Date & Time
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    is_all_day: false,
    is_recurring: false,
    recurrence_pattern: '',
    
    // Location
    location: '',
    venue_name: '',
    venue_address: '',
    venue_city: 'Gabriola Island',
    venue_postal_code: '',
    venue_map_url: '',
    parking_info: '',
    
    // Contact & Organizer
    contact_email: '',
    contact_phone: '',
    organizer_name: '',
    organizer_organization: '',
    organizer_website: '',
    
    // Registration & Fees
    fees: '',
    registration_required: false,
    registration_url: '',
    registration_deadline: '',
    max_attendees: '',
    min_attendees: '',
    waitlist_enabled: false,
    
    // Event Details
    age_restrictions: '',
    accessibility_info: '',
    what_to_bring: '',
    dress_code: '',
    additional_info: '',
    weather_dependent: false,
    
    // Tags (will be comma-separated string, converted to array on save)
    tags: '',
    keywords: '',
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date-asc' | 'date-desc' | 'title' | 'category' | 'venue' | 'organization'>('date-asc');
  const [venueFilter, setVenueFilter] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);   // event opened in place
  const [days, setDays] = useState(14);                        // days shown (date order)
  const [listLimit, setListLimit] = useState(50);              // rows shown (other orders)
  const [showPast, setShowPast] = useState(false);
  const [pastLimit, setPastLimit] = useState(30);

  useEffect(() => {
    fetchEvents();
    fetchRsvpCounts();
    fetchCategories();
    fetchVenues();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('event_categories')
      .select('*')
      .order('name', { ascending: true });
    
    if (!error && data) {
      setCategories(data);
    }
  };

  const fetchVenues = async () => {
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .order('name', { ascending: true });
    
    if (!error && data) {
      setVenues(data);
    }
  };

  const fetchEvents = async () => {
    let data: any[] | null = null;
    let error: any = null;
    try {
      data = await fetchApprovedEvents();
    } catch (e) {
      error = e;
    }
    
    if (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
    } else {
      // Parse dates in local timezone to prevent day-shift
      const parseLocalDate = (dateStr: string) => {
        if (!dateStr) return undefined;
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
      };

      const formattedEvents: Event[] = (data || []).map(event => ({
        ...event,
        start_date: parseLocalDate(event.start_date) || new Date(),
        end_date: event.end_date ? parseLocalDate(event.end_date) : undefined,
        postponed_from_date: event.postponed_from_date ? parseLocalDate(event.postponed_from_date) : undefined,
      }));
      setEvents(formattedEvents);
    }
    setLoading(false);
  };

  const fetchRsvpCounts = async () => {
    const { data } = await supabase
      .from('event_rsvps')
      .select('event_id, guest_count');
    const counts: Record<string, number> = {};
    data?.forEach(r => {
      counts[r.event_id] = (counts[r.event_id] || 0) + 1 + (r.guest_count || 0);
    });
    setRsvpCount(counts);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be smaller than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setForm({ ...form, image_url: result });
        setImagePreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVenueChange = (venueId: string) => {
    setSelectedVenueId(venueId);
    
    if (venueId === 'other') {
      // Custom location - clear venue fields
      setForm({
        ...form,
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
        setForm({
          ...form,
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

    // Determine final location
    const finalLocation = selectedVenueId === 'other' 
      ? customLocation 
      : form.location;

    if (!finalLocation.trim()) {
      alert('Please specify a location');
      return;
    }

    const payload = {
      // Basic Info
      title: form.title,
      description: form.description,
      category: form.category || null,
      image_url: form.image_url || null,
      
      // Date & Time
      start_date: form.start_date,
      end_date: form.end_date || form.start_date,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      is_all_day: form.is_all_day,
      is_recurring: form.is_recurring,
      recurrence_pattern: form.recurrence_pattern || null,
      
      // Location
      location: finalLocation,
      venue_name: form.venue_name || null,
      venue_address: form.venue_address || null,
      venue_city: form.venue_city || 'Gabriola Island',
      venue_postal_code: form.venue_postal_code || null,
      venue_map_url: form.venue_map_url || null,
      parking_info: form.parking_info || null,
      
      // Contact & Organizer
      contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null,
      organizer_name: form.organizer_name || null,
      organizer_organization: form.organizer_organization || null,
      organizer_website: form.organizer_website || null,
      
      // Registration & Fees
      fees: form.fees || null,
      registration_required: form.registration_required,
      registration_url: form.registration_url || null,
      registration_deadline: form.registration_deadline || null,
      max_attendees: form.max_attendees ? parseInt(form.max_attendees) : null,
      min_attendees: form.min_attendees ? parseInt(form.min_attendees) : null,
      waitlist_enabled: form.waitlist_enabled,
      
      // Event Details
      age_restrictions: form.age_restrictions || null,
      accessibility_info: form.accessibility_info || null,
      what_to_bring: form.what_to_bring || null,
      dress_code: form.dress_code || null,
      additional_info: form.additional_info || null,
      weather_dependent: form.weather_dependent,
      
      // Tags & Keywords
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : null,
      keywords: form.keywords || null,
      
      // Meta
      source_name: 'User Submitted',
      source_type: 'user_submitted',
      is_approved: canPublishInstantly ? true : false,
      created_by: user?.id,
    };

    const { error } = selectedEvent
      ? await supabase.from('events').update(payload).eq('id', selectedEvent.id)
      : await supabase.from('events').insert(payload);

    if (!error) {
      if (canPublishInstantly) {
        alert('Event published! 🎉');
      } else {
        alert('Event submitted for approval! 📝\n\nAn admin will review and publish your event soon.');
      }
      setShowForm(false);
      setSelectedEvent(null);
      resetForm();
      fetchEvents();
    } else {
      alert('Error: ' + error.message);
    }
  };

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      category: '',
      image_url: '',
      start_date: '',
      end_date: '',
      start_time: '',
      end_time: '',
      is_all_day: false,
      is_recurring: false,
      recurrence_pattern: '',
      location: '',
      venue_name: '',
      venue_address: '',
      venue_city: 'Gabriola Island',
      venue_postal_code: '',
      venue_map_url: '',
      parking_info: '',
      contact_email: '',
      contact_phone: '',
      organizer_name: '',
      organizer_organization: '',
      organizer_website: '',
      fees: '',
      registration_required: false,
      registration_url: '',
      registration_deadline: '',
      max_attendees: '',
      min_attendees: '',
      waitlist_enabled: false,
      age_restrictions: '',
      accessibility_info: '',
      what_to_bring: '',
      dress_code: '',
      additional_info: '',
      weather_dependent: false,
      tags: '',
      keywords: '',
    });
    setImagePreview(null);
    setSelectedVenueId('');
    setCustomLocation('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this event forever?')) return;
    await supabase.from('events').delete().eq('id', id);
    fetchEvents();
  };

  const handleRsvp = async (e: React.FormEvent) => {
    e.preventDefault();
    const formEl = e.target as HTMLFormElement;
    const data = new FormData(formEl);
    const payload = {
      event_id: rsvpEvent?.id,
      name: data.get('name'),
      email: data.get('email'),
      phone: data.get('phone'),
      guest_count: Number(data.get('guests') || 0),
      notes: data.get('message'),
      user_id: user?.id || null,
    };

    const { error } = await supabase.from('event_rsvps').insert(payload);
    if (!error) {
      alert('RSVP sent! Thank you!');
      setRsvpEvent(null);
      fetchRsvpCounts();
      formEl.reset();
    } else {
      console.error('RSVP error:', error);
      alert('Failed to send RSVP. Please try again.');
    }
  };

  // Edit an event: fills the form and opens the shared event form
  const startEdit = (event: Event) => {

    setSelectedEvent(event); 
    
    // Find venue by venue_name and set dropdown
    const eventVenueName = event.venue_name || '';
    const matchingVenue = venues.find(v => v.name === eventVenueName);
    
    setForm({
      // Basic Info
      title: event.title,
      description: event.description,
      category: event.category || '',
      image_url: event.image_url || '',
      
      // Date & Time
      start_date: format(event.start_date, 'yyyy-MM-dd'),
      end_date: event.end_date ? format(event.end_date, 'yyyy-MM-dd') : '',
      start_time: event.start_time || '',
      end_time: event.end_time || '',
      is_all_day: event.is_all_day || false,
      is_recurring: event.is_recurring || false,
      recurrence_pattern: event.recurrence_pattern || '',
      
      // Location
      location: event.location || '',
      venue_name: event.venue_name || '',
      venue_address: event.venue_address || '',
      venue_city: (event as any).venue_city || 'Gabriola Island',
      venue_postal_code: (event as any).venue_postal_code || '',
      venue_map_url: (event as any).venue_map_url || '',
      parking_info: (event as any).parking_info || '',
      
      // Contact & Organizer
      contact_email: event.contact_email || '',
      contact_phone: event.contact_phone || '',
      organizer_name: event.organizer_name || '',
      organizer_organization: (event as any).organizer_organization || '',
      organizer_website: (event as any).organizer_website || '',
      
      // Registration & Fees
      fees: event.fees || '',
      registration_required: (event as any).registration_required || false,
      registration_url: event.registration_url || '',
      registration_deadline: (event as any).registration_deadline || '',
      max_attendees: (event as any).max_attendees ? String((event as any).max_attendees) : '',
      min_attendees: (event as any).min_attendees ? String((event as any).min_attendees) : '',
      waitlist_enabled: (event as any).waitlist_enabled || false,
      
      // Event Details
      age_restrictions: event.age_restrictions || '',
      accessibility_info: event.accessibility_info || '',
      what_to_bring: (event as any).what_to_bring || '',
      dress_code: (event as any).dress_code || '',
      additional_info: event.additional_info || '',
      weather_dependent: (event as any).weather_dependent || false,
      
      // Tags & Keywords
      tags: (event as any).tags ? (event as any).tags.join(', ') : '',
      keywords: (event as any).keywords || '',
    });
    
    // Set venue dropdown state
    if (matchingVenue) {
      setSelectedVenueId(matchingVenue.id);
      setCustomLocation('');
    } else if (event.location) {
      setSelectedVenueId('other');
      setCustomLocation(event.location);
    } else {
      setSelectedVenueId('');
      setCustomLocation('');
    }
    
    setImagePreview(event.image_url || null);
    setShowForm(true);
  };

  // Google Calendar link and .ics download for one event
  const buildExport = (event: Event) => {
    const start = () => {
      const d = new Date(event.start_date);
      if (event.start_time) {
        const [hours, minutes] = event.start_time.split(':');
        d.setHours(parseInt(hours), parseInt(minutes));
      }
      return d;
    };
    const end = () => {
      const d = event.end_date ? new Date(event.end_date) : undefined;
      if (d && event.end_time) {
        const [hours, minutes] = event.end_time.split(':');
        d.setHours(parseInt(hours), parseInt(minutes));
      }
      return d;
    };
    const details = {
      title: event.title,
      description: event.description,
      location: event.venue_name || event.location,
      url: `https://gabriolaconnects.ca/events#${event.id}`,
      organizer: event.contact_email ? {
        name: event.organizer_name || 'Event Organizer',
        email: event.contact_email
      } : undefined
    };
    return {
      googleUrl: generateGoogleCalendarURL({ ...details, startDate: start(), endDate: end() }),
      downloadICS: () => exportEventToCalendar({ ...details, startDate: start(), endDate: end() }),
    };
  };

  const today = startOfDay(new Date());

  // Venues to filter by: busiest first
  const venueCounts = new Map<string, number>();
  events.forEach(e => { const v = eventPlace(e); if (v) venueCounts.set(v, (venueCounts.get(v) || 0) + 1); });
  const venueOptions = Array.from(venueCounts.entries())
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 40)
    .map(([name]) => name);

  // Search and venue filter
  const filteredEvents = events.filter(event => {
    if (venueFilter && eventPlace(event) !== venueFilter) return false;
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      event.title.toLowerCase().includes(query) ||
      (event.description || '').toLowerCase().includes(query) ||
      event.location?.toLowerCase().includes(query) ||
      event.venue_name?.toLowerCase().includes(query) ||
      event.category?.toLowerCase().includes(query)
    );
  });

  const timeKey = (e: Event) => (e.is_all_day || !e.start_time ? '00:00' : e.start_time);

  // Sort filtered events
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    if (sortBy === 'date-asc') {
      return new Date(a.start_date).getTime() - new Date(b.start_date).getTime() || timeKey(a).localeCompare(timeKey(b));
    } else if (sortBy === 'date-desc') {
      return new Date(b.start_date).getTime() - new Date(a.start_date).getTime() || timeKey(b).localeCompare(timeKey(a));
    } else if (sortBy === 'title') {
      return a.title.localeCompare(b.title);
    } else if (sortBy === 'category') {
      return (a.category || '').localeCompare(b.category || '');
    } else if (sortBy === 'venue') {
      return eventPlace(a).localeCompare(eventPlace(b));
    } else if (sortBy === 'organization') {
      return (a.organizer_organization || '').localeCompare(b.organizer_organization || '');
    }
    return 0;
  });

  // Split into upcoming and past
  const upcoming = sortedEvents.filter(e => isAfter(e.start_date, today) || isSameDay(e.start_date, today));
  // Past events always show most recently finished first
  const past = sortedEvents
    .filter(e => isBefore(e.start_date, today))
    .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

  // Date order: group by day, two weeks at a time. Other orders: one list, 50 at a time.
  const byDate = sortBy === 'date-asc' || sortBy === 'date-desc';
  const lastDay = addDays(today, days);
  const shownUpcoming = byDate
    ? (sortBy === 'date-asc' ? upcoming.filter(e => isBefore(e.start_date, lastDay)) : upcoming.slice(0, listLimit))
    : upcoming.slice(0, listLimit);
  const moreUpcoming = upcoming.length - shownUpcoming.length;

  const groups: { key: string; date: Date; items: Event[] }[] = [];
  if (byDate) {
    for (const e of shownUpcoming) {
      const key = format(e.start_date, 'yyyy-MM-dd');
      const last = groups[groups.length - 1];
      if (last && last.key === key) last.items.push(e);
      else groups.push({ key, date: startOfDay(e.start_date), items: [e] });
    }
  }

  const dayHeading = (d: Date) => {
    if (isToday(d)) return `Today · ${format(d, 'EEE MMM d')}`;
    if (isTomorrow(d)) return `Tomorrow · ${format(d, 'EEE MMM d')}`;
    return format(d, 'EEEE, MMMM d');
  };

  const canEditEvent = (event: Event) =>
    !!(user && (user.id === event.created_by || user.is_super_admin || (user as any)?.admin_events));

  const Row = ({ event, showDate }: { event: Event; showDate?: boolean }) => {
    const open = openId === event.id;
    return (
      <div id={event.id} className={open ? 'bg-[#FBF9F4]' : ''}>
        <button
          onClick={() => setOpenId(open ? null : event.id)}
          aria-expanded={open}
          className="w-full text-left flex gap-3 px-4 py-3 min-h-[56px] hover:bg-[#F6F2EA] transition-colors"
        >
          <span className="w-[72px] flex-shrink-0 text-sm font-semibold text-gabriola-green pt-0.5">
            {showDate && <span className="block text-[#1F2A24]">{format(event.start_date, 'MMM d')}</span>}
            {formatEventTime(event.start_time, event.is_all_day)}
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[15px] font-semibold text-[#1F2A24] leading-snug">{event.title}</span>
            {eventPlace(event) && <span className="block text-[13px] text-[#5B6660] truncate">{eventPlace(event)}</span>}
          </span>
          <ChevronDown className={`w-5 h-5 text-[#5B6660] flex-shrink-0 mt-0.5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
        {open && (
          <EventCard
            event={event}
            rsvpCount={rsvpCount[event.id] || 0}
            onRsvp={() => setRsvpEvent(event)}
            onExport={buildExport(event)}
            onEdit={() => startEdit(event)}
            onViewDetails={() => setViewEvent(event)}
            onDelete={() => handleDelete(event.id)}
            canEdit={canEditEvent(event)}
          />
        )}
      </div>
    );
  };

  const listBox = 'bg-white border border-[#E3DCCF] rounded-2xl divide-y divide-[#EEE8DD] overflow-hidden';

  return (
    <div className="min-h-screen bg-[#F6F2EA] text-[#1F2A24]">
      <div className="bg-white border-b border-[#E3DCCF]">
        <div className="max-w-5xl mx-auto px-4 pt-4 pb-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h1 className="font-display text-[26px] md:text-3xl font-bold text-gabriola-green-dark leading-tight">Gabriola Events</h1>
            {user && (
              <button
                onClick={() => setShowForm(true)}
                className="flex-shrink-0 bg-gabriola-green text-white px-4 min-h-[44px] rounded-lg font-semibold hover:bg-gabriola-green-dark flex items-center gap-2"
              >
                <Plus className="w-5 h-5" aria-hidden="true" />
                {canPublishInstantly ? 'Add Event' : 'Submit Event'}
              </button>
            )}
          </div>

          <p className="text-[13px] text-[#5B6660]">
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

          {/* Info for people whose events need approval */}
          {user && !canPublishInstantly && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" aria-hidden="true" />
              <div className="text-sm text-blue-800">
                <strong>Note:</strong> Events you submit will be reviewed by an admin before appearing on the calendar.
              </div>
            </div>
          )}

          {/* Search, venue, sort */}
          <label className="relative block">
            <span className="sr-only">Search events</span>
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#5B6660]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events"
              className="w-full min-h-[44px] pl-10 pr-4 text-[15px] border border-[#CFC6B4] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gabriola-green/30 focus:border-gabriola-green"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className="sr-only">Filter by venue</span>
              <select
                value={venueFilter}
                onChange={(e) => setVenueFilter(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#CFC6B4] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gabriola-green"
              >
                <option value="">All venues</option>
                {venueOptions.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
            <label>
              <span className="sr-only">Sort events</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#CFC6B4] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gabriola-green"
              >
                <option value="date-asc">Date (Soonest First)</option>
                <option value="date-desc">Date (Latest First)</option>
                <option value="title">Title (A-Z)</option>
                <option value="category">Category (A-Z)</option>
                <option value="venue">Venue (A-Z)</option>
                <option value="organization">Organization (A-Z)</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-8">
        {loading ? (
          <div className="py-20 text-center text-[#5B6660]" role="status">Loading events...</div>
        ) : (
          <>
            {/* Upcoming */}
            {upcoming.length === 0 ? (
              <p className="text-center text-[#5B6660] py-16">
                {searchQuery || venueFilter ? 'No upcoming events match.' : 'No upcoming events — be the first to add one!'}
              </p>
            ) : byDate && sortBy === 'date-asc' ? (
              <>
                {groups.length === 0 && (
                  <p className="text-center text-[#5B6660] py-8">No events in the next {days} days.</p>
                )}
                {groups.map(g => (
                  <section key={g.key} className="mt-5">
                    <h2 className="text-sm font-bold uppercase tracking-wide text-gabriola-green-dark mb-2">{dayHeading(g.date)}</h2>
                    <div className={listBox}>
                      {g.items.map(e => <Row key={e.id} event={e} />)}
                    </div>
                  </section>
                ))}
              </>
            ) : (
              <div className={`${listBox} mt-5`}>
                {shownUpcoming.map(e => <Row key={e.id} event={e} showDate />)}
              </div>
            )}

            {moreUpcoming > 0 && (
              <div className="text-center mt-5">
                <button
                  onClick={() => (byDate && sortBy === 'date-asc' ? setDays(d => d + 14) : setListLimit(n => n + 50))}
                  className="px-6 min-h-[48px] rounded-full border-2 border-gabriola-green text-gabriola-green font-semibold hover:bg-gabriola-green hover:text-white transition-colors"
                >
                  {byDate && sortBy === 'date-asc' ? 'Show the next 14 days' : 'Show more events'}
                </button>
              </div>
            )}

            {/* Past */}
            {past.length > 0 && (
              <section className="mt-8">
                <button
                  onClick={() => setShowPast(v => !v)}
                  aria-expanded={showPast}
                  className="w-full flex items-center justify-center gap-1.5 min-h-[44px] text-sm font-semibold text-[#5B6660] hover:text-[#1F2A24]"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${showPast ? 'rotate-180' : ''}`} aria-hidden="true" />
                  {showPast ? 'Hide past events' : `Show past events (${past.length})`}
                </button>
                {showPast && (
                  <>
                    <div className={`${listBox} mt-2 opacity-90`}>
                      {past.slice(0, pastLimit).map(e => <Row key={e.id} event={e} showDate />)}
                    </div>
                    {past.length > pastLimit && (
                      <div className="text-center mt-4">
                        <button onClick={() => setPastLimit(n => n + 30)} className="px-5 min-h-[44px] text-sm font-semibold text-gabriola-green hover:underline">
                          Show more past events
                        </button>
                      </div>
                    )}
                  </>
                )}
              </section>
            )}
          </>
        )}
      </div>

      {/* Shared Event Form Modal */}
      <EventFormModal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setSelectedEvent(null);
          resetForm();
        }}
        onSave={() => {
          fetchEvents();
          fetchRsvpCounts();
          setShowForm(false);
          setSelectedEvent(null);
        }}
        event={selectedEvent}
        venues={venues}
        categories={categories}
        canPublishInstantly={canPublishInstantly || false}
      />

      {/* RSVP Modal */}
      {rsvpEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 md:p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start gap-3 mb-5">
              <h3 className="text-xl font-bold">RSVP to {rsvpEvent.title}</h3>
              <button onClick={() => setRsvpEvent(null)} className="p-2 hover:bg-gray-100 rounded-full" aria-label="Close">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleRsvp} className="space-y-3">
              <input name="name" placeholder="Your Name *" required className="w-full p-3 border border-[#CFC6B4] rounded-lg" />
              <input name="email" type="email" placeholder="Email *" required className="w-full p-3 border border-[#CFC6B4] rounded-lg" />
              <input name="phone" type="tel" placeholder="Phone" className="w-full p-3 border border-[#CFC6B4] rounded-lg" />
              <input name="guests" type="number" min="0" placeholder="Additional Guests" className="w-full p-3 border border-[#CFC6B4] rounded-lg" />
              <textarea name="message" placeholder="Message (optional)" rows={3} className="w-full p-3 border border-[#CFC6B4] rounded-lg"></textarea>
              <button type="submit" className="w-full bg-gabriola-green text-white min-h-[48px] rounded-lg font-bold hover:bg-gabriola-green-dark">
                Confirm RSVP
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Event Detail Modal */}
      {viewEvent && (
        <EventDetailModal
          event={viewEvent}
          onClose={() => setViewEvent(null)}
        />
      )}
    </div>
  );
}

// EventCard component
function EventCard({ event, rsvpCount, onRsvp, onExport, onEdit, onDelete, onViewDetails, canEdit }: any) {
  const [showCalendarMenu, setShowCalendarMenu] = useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  
  const handleOpenMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,  // Fixed positioning = viewport relative, NO scrollY!
        left: rect.left         // Fixed positioning = viewport relative, NO scrollX!
      });
    }
    setShowCalendarMenu(!showCalendarMenu);
  };
  
  // Detect if user is on mobile (improved detection)
  const isMobile = () => {
    // Check user agent
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    // Check screen size as backup
    const isMobileScreen = typeof window !== 'undefined' ? window.innerWidth <= 768 : false;
    
    // Check touch support
    const isTouchDevice = typeof window !== 'undefined' ? 'ontouchstart' in window || navigator.maxTouchPoints > 0 : false;
    
    const result = isMobileUA || (isMobileScreen && isTouchDevice);
    
    
    return result;
  };
  
  // Handle Google Calendar - use Google Calendar URL on ALL platforms
  const handleGoogleCalendar = () => {
    // Google Calendar URL works great on both desktop AND mobile!
    // On mobile with Google Calendar app installed: Prompts to open in app ✅
    // On mobile without app: Opens in mobile web ✅
    // On desktop: Opens in web interface ✅
    window.open(onExport.googleUrl, '_blank');
    setShowCalendarMenu(false);
  };
  
  // Handle all other calendar options - just download .ics file
  const handleOtherCalendar = () => {
    // On both mobile and desktop: Download .ics file
    // Mobile users can then tap the file to open in their calendar app
    onExport.downloadICS();
    setShowCalendarMenu(false);
  };
  
  const desc = realDescription(event.description);
  return (
    <div className="px-4 pb-4 -mt-1">
      {event.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={event.image_url} alt={event.title} className="w-full max-h-56 object-cover rounded-xl mb-3" />
      )}

      <div className="text-sm text-[#3A4640] space-y-1 mb-2">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 flex-shrink-0 text-[#5B6660]" aria-hidden="true" />
          {format(event.start_date, 'EEEE, MMMM d')} · {formatEventTime(event.start_time, event.is_all_day)}
          {event.end_time && !event.is_all_day && ` – ${formatEventTime(event.end_time)}`}
        </div>
        {event.fees && (
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 flex-shrink-0 text-[#5B6660]" aria-hidden="true" />
            {event.fees}
          </div>
        )}
      </div>

      {desc && <p className="text-sm text-[#1F2A24] leading-relaxed mb-3 line-clamp-4">{desc}</p>}

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={onViewDetails}
            className="min-h-[44px] bg-white border border-[#CFC6B4] text-[#1F2A24] px-2 rounded-lg text-sm font-semibold hover:border-gabriola-green transition-colors"
          >
            Details
          </button>
          <button
            onClick={onRsvp}
            className="min-h-[44px] bg-gabriola-green text-white px-2 rounded-lg text-sm font-semibold hover:bg-gabriola-green-dark flex items-center justify-center gap-1.5"
          >
            <Users className="w-4 h-4" aria-hidden="true" />
            RSVP {rsvpCount > 0 && `(${rsvpCount})`}
          </button>
            {/* Calendar dropdown */}
            <div>
              <button 
                ref={buttonRef}
                onClick={handleOpenMenu}
                className="w-full min-h-[44px] bg-[#002774] text-white px-2 rounded-lg text-sm font-semibold hover:bg-[#001d57] flex items-center justify-center gap-1"
                title="Add to your calendar"
                aria-label="Add to your calendar"
              >
                <Calendar className="w-4 h-4" aria-hidden="true" />
                Add
                <ChevronDown className="w-4 h-4" aria-hidden="true" />
              </button>
              
              {showCalendarMenu && (
                <>
                  {/* Backdrop to close dropdown */}
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowCalendarMenu(false);
                    }}
                  />
                  
                  {/* Dropdown menu - fixed positioning with calculated position */}
                  <div 
                    className="fixed z-50 w-56 bg-white rounded-lg shadow-2xl border border-gray-200 py-2"
                    style={{
                      top: `${menuPosition.top}px`,
                      left: `${menuPosition.left}px`
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleGoogleCalendar();
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-100 flex items-center gap-3 transition-colors"
                    >
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <div className="flex-1">
                        <div className="text-sm font-medium">Google Calendar</div>
                        {isMobile() && (
                          <div className="text-xs text-gray-500 mt-0.5">Opens in app if installed</div>
                        )}
                      </div>
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleOtherCalendar();
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-100 flex items-center gap-3 transition-colors"
                    >
                      <Calendar className="w-5 h-5 text-gray-600" />
                      <span className="text-sm font-medium">Apple Calendar</span>
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleOtherCalendar();
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-100 flex items-center gap-3 transition-colors"
                    >
                      <Calendar className="w-5 h-5 text-blue-500" />
                      <span className="text-sm font-medium">Outlook</span>
                    </button>
                    
                    <div className="border-t border-gray-200 my-1" />
                    
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleOtherCalendar();
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-100 flex items-center gap-3 transition-colors"
                    >
                      <Download className="w-5 h-5 text-gray-500" />
                      <span className="text-sm">Download .ics file</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Admin action buttons */}
          {canEdit && (
            <div className="flex items-center gap-2">
              <button onClick={onEdit} className="flex-1 min-h-[44px] text-blue-700 hover:bg-blue-50 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold">
                <Edit className="w-5 h-5" />
                Edit
              </button>
              <button onClick={onDelete} className="flex-1 min-h-[44px] text-red-700 hover:bg-red-50 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold">
                <Trash2 className="w-5 h-5" />
                Delete
              </button>
            </div>
          )}
        </div>
    </div>
  );
}
