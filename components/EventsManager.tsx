// Path: components/EventsManager.tsx
// Version: 4.0.0 - MASSIVELY ENHANCED: 40+ fields (registration, organizer, tags, recurring, parking, etc.)
// Date: 2025-12-20

'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { canCreateEvents } from '@/lib/auth-utils';
import { Event } from '@/lib/types';
import { format, isAfter, isBefore, isSameDay } from 'date-fns';
import { Plus, MapPin, Clock, DollarSign, Users, Mail, Phone, Calendar, Edit, Trash2, X, Upload, AlertCircle, Download, ChevronDown } from 'lucide-react';
import { exportEventToCalendar, generateGoogleCalendarURL } from '@/lib/calendar';

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
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('is_approved', true)
      .is('deleted_at', null)
      .order('start_date', { ascending: true })
      .order('start_time', { ascending: true });  // FIX: Added time sorting
    
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

  if (loading) return <div className="text-center py-20 text-2xl">Loading events...</div>;

  const today = new Date();
  const upcoming = events.filter(e => 
    isAfter(e.start_date, today) || isSameDay(e.start_date, today)
  );
  const past = events
    .filter(e => isBefore(e.start_date, today))
    .reverse(); // Show past events newest first (descending order)

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-12">
        <h1 className="text-5xl font-bold text-gabriola-green">Gabriola Events</h1>
        {user && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-gabriola-green text-white px-6 py-3 rounded-full font-bold hover:bg-gabriola-green-dark flex items-center gap-3 shadow-lg"
          >
            <Plus className="w-6 h-6" />
            {canPublishInstantly ? 'Add Event' : 'Submit Event'}
          </button>
        )}
      </div>

      {/* Info banner for regular users */}
      {user && !canPublishInstantly && (
        <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <strong>Note:</strong> Events you submit will be reviewed by an admin before appearing on the calendar.
          </div>
        </div>
      )}

      {/* Upcoming Events */}
      <section className="mb-16">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gabriola-green-dark mb-3">Upcoming Events</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 inline-block">
            <p className="text-sm text-blue-800">
              Sample events data from{' '}
              <a 
                href="https://directory.gabriolaevents.ca/gabriola-events/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-semibold text-gabriola-green hover:text-gabriola-green-dark underline"
              >
                Gabriola Chamber of Commerce website
              </a>
            </p>
          </div>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-center text-gray-600 py-20 text-xl">No upcoming events — be the first to add one!</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            {upcoming.map(event => (
              <EventCard
                key={event.id}
                event={event}
                rsvpCount={rsvpCount[event.id] || 0}
                onRsvp={() => setRsvpEvent(event)}
                onExport={{
                  googleUrl: (() => {
                    const eventStartDate = new Date(event.start_date);
                    if (event.start_time) {
                      const [hours, minutes] = event.start_time.split(':');
                      eventStartDate.setHours(parseInt(hours), parseInt(minutes));
                    }

                    const eventEndDate = event.end_date ? new Date(event.end_date) : undefined;
                    if (eventEndDate && event.end_time) {
                      const [hours, minutes] = event.end_time.split(':');
                      eventEndDate.setHours(parseInt(hours), parseInt(minutes));
                    }

                    return generateGoogleCalendarURL({
                      title: event.title,
                      description: event.description,
                      location: event.venue_name || event.location,
                      startDate: eventStartDate,
                      endDate: eventEndDate,
                      url: `https://gabriolaconnects.ca/events#${event.id}`,
                      organizer: event.contact_email ? {
                        name: event.organizer_name || 'Event Organizer',
                        email: event.contact_email
                      } : undefined
                    });
                  })(),
                  downloadICS: () => {
                    const eventStartDate = new Date(event.start_date);
                    if (event.start_time) {
                      const [hours, minutes] = event.start_time.split(':');
                      eventStartDate.setHours(parseInt(hours), parseInt(minutes));
                    }

                    const eventEndDate = event.end_date ? new Date(event.end_date) : undefined;
                    if (eventEndDate && event.end_time) {
                      const [hours, minutes] = event.end_time.split(':');
                      eventEndDate.setHours(parseInt(hours), parseInt(minutes));
                    }

                    exportEventToCalendar({
                      title: event.title,
                      description: event.description,
                      location: event.venue_name || event.location,
                      startDate: eventStartDate,
                      endDate: eventEndDate,
                      url: `https://gabriolaconnects.ca/events#${event.id}`,
                      organizer: event.contact_email ? {
                        name: event.organizer_name || 'Event Organizer',
                        email: event.contact_email
                      } : undefined
                    });
                  }
                }}
                onEdit={() => { 
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
                }}
                onDelete={() => handleDelete(event.id)}
                canEdit={user?.id === event.created_by || user?.is_super_admin || (user as any)?.admin_events}
              />
            ))}
          </div>
        )}
      </section>

      {/* Past Events */}
      {past.length > 0 && (
        <section>
          <h2 className="text-3xl font-bold text-gabriola-green-dark mb-8">Past Events</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {past.map(event => (
              <div key={event.id} className="bg-gray-50 rounded-xl p-6 opacity-75">
                <h3 className="text-xl font-bold">{event.title}</h3>
                <p className="text-sm text-gray-600 mt-2">{format(event.start_date, 'PPP')}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-gabriola-green">
                {selectedEvent ? 'Edit Event' : canPublishInstantly ? 'Add New Event' : 'Submit Event for Approval'}
              </h2>
              <button onClick={() => { setShowForm(false); setSelectedEvent(null); resetForm(); }} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            {!canPublishInstantly && (
              <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  Your event will be reviewed by an admin before appearing on the calendar. We'll review it as soon as possible!
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* SECTION 1: Basic Information */}
              <div className="bg-white border-2 border-gabriola-green/20 rounded-xl p-6">
                <h4 className="text-xl font-bold text-gabriola-green-dark mb-4">📝 Basic Information</h4>
                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Event Title *</label>
                    <input 
                      type="text" 
                      value={form.title} 
                      onChange={e => setForm({ ...form, title: e.target.value })} 
                      required 
                      className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-gabriola-green" 
                      placeholder="Annual Salmon BBQ"
                    />
                  </div>

                  {/* Category */}
                  {categories.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                      <select 
                        value={form.category} 
                        onChange={e => setForm({ ...form, category: e.target.value })}
                        className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
                      >
                        <option value="">Select a category...</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.name}>
                            {cat.icon} {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                    <textarea 
                      value={form.description} 
                      onChange={e => setForm({ ...form, description: e.target.value })} 
                      required 
                      rows={5}
                      className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
                      placeholder="Describe your event..."
                    />
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                    <input 
                      type="text" 
                      value={form.tags} 
                      onChange={e => setForm({ ...form, tags: e.target.value })} 
                      className="w-full p-4 border rounded-lg" 
                      placeholder="family-friendly, outdoor, music (comma-separated)"
                    />
                    <p className="text-xs text-gray-500 mt-1">Separate tags with commas</p>
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Event Image</label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload} 
                      className="w-full p-4 border rounded-lg" 
                    />
                    {imagePreview && (
                      <div className="mt-3">
                        <img src={imagePreview} alt="Preview" className="max-w-xs rounded-lg" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 2: Date & Time */}
              <div className="bg-white border-2 border-blue-200 rounded-xl p-6">
                <h4 className="text-xl font-bold text-gray-800 mb-4">📅 Date & Time</h4>
                <div className="space-y-4">
                  {/* Start Date & Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                      <input 
                        type="date" 
                        value={form.start_date} 
                        onChange={e => setForm({ ...form, start_date: e.target.value })} 
                        required 
                        className="w-full p-4 border rounded-lg" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                      <input 
                        type="time" 
                        value={form.start_time} 
                        onChange={e => setForm({ ...form, start_time: e.target.value })} 
                        disabled={form.is_all_day} 
                        className="w-full p-4 border rounded-lg" 
                      />
                    </div>
                  </div>

                  {/* End Date & Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                      <input 
                        type="date" 
                        value={form.end_date} 
                        onChange={e => setForm({ ...form, end_date: e.target.value })} 
                        className="w-full p-4 border rounded-lg" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                      <input 
                        type="time" 
                        value={form.end_time} 
                        onChange={e => setForm({ ...form, end_time: e.target.value })} 
                        disabled={form.is_all_day} 
                        className="w-full p-4 border rounded-lg" 
                      />
                    </div>
                  </div>

                  {/* Checkboxes */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={form.is_all_day} 
                        onChange={e => setForm({ ...form, is_all_day: e.target.checked })} 
                        className="w-5 h-5" 
                      />
                      <span className="font-medium">All Day Event</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={form.is_recurring} 
                        onChange={e => setForm({ ...form, is_recurring: e.target.checked })} 
                        className="w-5 h-5" 
                      />
                      <span className="font-medium">Recurring Event</span>
                    </label>

                    {form.is_recurring && (
                      <div className="ml-8">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Recurrence Pattern</label>
                        <select
                          value={form.recurrence_pattern}
                          onChange={e => setForm({ ...form, recurrence_pattern: e.target.value })}
                          className="w-full p-3 border rounded-lg"
                        >
                          <option value="">Select pattern...</option>
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="biweekly">Bi-weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      </div>
                    )}

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={form.weather_dependent} 
                        onChange={e => setForm({ ...form, weather_dependent: e.target.checked })} 
                        className="w-5 h-5" 
                      />
                      <span className="font-medium">🌧️ Weather Dependent</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Location & Venue */}
              <div className="bg-white border-2 border-purple-200 rounded-xl p-6">
                <h4 className="text-xl font-bold text-gray-800 mb-4">📍 Location & Venue</h4>
                <div className="space-y-4">
                  {/* Venue Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Venue *</label>
                    <select
                      value={selectedVenueId}
                      onChange={e => handleVenueChange(e.target.value)}
                      required
                      className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
                    >
                      <option value="">Select a venue...</option>
                      {venues.map(venue => (
                        <option key={venue.id} value={venue.id}>{venue.name}</option>
                      ))}
                      <option value="other">Other location...</option>
                    </select>
                  </div>

                  {/* Custom Location */}
                  {selectedVenueId === 'other' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Specify Location *</label>
                      <input 
                        type="text" 
                        value={customLocation}
                        onChange={e => setCustomLocation(e.target.value)}
                        required
                        placeholder="Enter location name"
                        className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-gabriola-green" 
                      />
                    </div>
                  )}

                  {/* Venue Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Venue Name</label>
                      <input 
                        type="text" 
                        value={form.venue_name} 
                        onChange={e => setForm({ ...form, venue_name: e.target.value })} 
                        className="w-full p-4 border rounded-lg"
                        placeholder="Rollo Centre"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Venue Address</label>
                      <input 
                        type="text" 
                        value={form.venue_address} 
                        onChange={e => setForm({ ...form, venue_address: e.target.value })} 
                        className="w-full p-4 border rounded-lg"
                        placeholder="575 North Rd"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Postal Code</label>
                      <input 
                        type="text" 
                        value={form.venue_postal_code} 
                        onChange={e => setForm({ ...form, venue_postal_code: e.target.value })} 
                        className="w-full p-4 border rounded-lg"
                        placeholder="V0R 1X0"
                        maxLength={7}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Google Maps URL</label>
                      <input 
                        type="url" 
                        value={form.venue_map_url} 
                        onChange={e => setForm({ ...form, venue_map_url: e.target.value })} 
                        className="w-full p-4 border rounded-lg"
                        placeholder="https://maps.google.com/..."
                      />
                    </div>
                  </div>

                  {/* Parking Info */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">🅿️ Parking Information</label>
                    <textarea 
                      value={form.parking_info} 
                      onChange={e => setForm({ ...form, parking_info: e.target.value })} 
                      rows={2}
                      className="w-full p-4 border rounded-lg"
                      placeholder="Free parking available, street parking, etc."
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: Registration & Capacity */}
              <div className="bg-white border-2 border-green-200 rounded-xl p-6">
                <h4 className="text-xl font-bold text-gray-800 mb-4">🎟️ Registration & Capacity</h4>
                <div className="space-y-4">
                  {/* Fees */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">💰 Fees / Cost</label>
                    <input 
                      type="text" 
                      value={form.fees} 
                      onChange={e => setForm({ ...form, fees: e.target.value })} 
                      placeholder="e.g., Free, $10, $5-$15, By donation"
                      className="w-full p-4 border rounded-lg" 
                    />
                  </div>

                  {/* Registration */}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={form.registration_required} 
                      onChange={e => setForm({ ...form, registration_required: e.target.checked })} 
                      className="w-5 h-5" 
                    />
                    <span className="font-medium">Registration Required</span>
                  </label>

                  {form.registration_required && (
                    <div className="space-y-4 ml-8">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Registration URL</label>
                        <input 
                          type="url" 
                          value={form.registration_url} 
                          onChange={e => setForm({ ...form, registration_url: e.target.value })} 
                          placeholder="https://eventbrite.com/..."
                          className="w-full p-4 border rounded-lg" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Registration Deadline</label>
                        <input 
                          type="datetime-local" 
                          value={form.registration_deadline} 
                          onChange={e => setForm({ ...form, registration_deadline: e.target.value })} 
                          className="w-full p-4 border rounded-lg" 
                        />
                      </div>
                    </div>
                  )}

                  {/* Capacity */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Min Attendees</label>
                      <input 
                        type="number" 
                        value={form.min_attendees} 
                        onChange={e => setForm({ ...form, min_attendees: e.target.value })} 
                        className="w-full p-4 border rounded-lg"
                        min="0"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Max Attendees</label>
                      <input 
                        type="number" 
                        value={form.max_attendees} 
                        onChange={e => setForm({ ...form, max_attendees: e.target.value })} 
                        className="w-full p-4 border rounded-lg"
                        min="0"
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  {/* Waitlist */}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={form.waitlist_enabled} 
                      onChange={e => setForm({ ...form, waitlist_enabled: e.target.checked })} 
                      className="w-5 h-5" 
                    />
                    <span className="font-medium">Enable Waitlist (if event fills up)</span>
                  </label>
                </div>
              </div>

              {/* SECTION 5: Organizer Information */}
              <div className="bg-white border-2 border-amber-200 rounded-xl p-6">
                <h4 className="text-xl font-bold text-gray-800 mb-4">👤 Organizer Information</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Organizer Name</label>
                      <input 
                        type="text" 
                        value={form.organizer_name} 
                        onChange={e => setForm({ ...form, organizer_name: e.target.value })} 
                        className="w-full p-4 border rounded-lg"
                        placeholder="Jane Smith"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Organization</label>
                      <input 
                        type="text" 
                        value={form.organizer_organization} 
                        onChange={e => setForm({ ...form, organizer_organization: e.target.value })} 
                        className="w-full p-4 border rounded-lg"
                        placeholder="Gabriola Arts Council"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Organizer Website</label>
                    <input 
                      type="url" 
                      value={form.organizer_website} 
                      onChange={e => setForm({ ...form, organizer_website: e.target.value })} 
                      className="w-full p-4 border rounded-lg"
                      placeholder="https://gabriolaartscouncil.org"
                    />
                  </div>

                  {/* Contact Info */}
                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium text-gray-700 mb-3">Contact Information</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
                        <input 
                          type="email" 
                          value={form.contact_email} 
                          onChange={e => setForm({ ...form, contact_email: e.target.value })} 
                          className="w-full p-4 border rounded-lg"
                          placeholder="contact@example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone</label>
                        <input 
                          type="tel" 
                          value={form.contact_phone} 
                          onChange={e => setForm({ ...form, contact_phone: e.target.value })} 
                          className="w-full p-4 border rounded-lg"
                          placeholder="(250) 555-1234"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 6: Event Details */}
              <div className="bg-white border-2 border-pink-200 rounded-xl p-6">
                <h4 className="text-xl font-bold text-gray-800 mb-4">ℹ️ Event Details</h4>
                <div className="space-y-4">
                  {/* Age Restrictions */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">🔞 Age Restrictions</label>
                    <input 
                      type="text" 
                      value={form.age_restrictions} 
                      onChange={e => setForm({ ...form, age_restrictions: e.target.value })} 
                      className="w-full p-4 border rounded-lg"
                      placeholder="e.g., All ages, 19+, Family friendly"
                    />
                  </div>

                  {/* Accessibility */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">♿ Accessibility Information</label>
                    <textarea 
                      value={form.accessibility_info} 
                      onChange={e => setForm({ ...form, accessibility_info: e.target.value })} 
                      rows={2}
                      className="w-full p-4 border rounded-lg"
                      placeholder="Wheelchair accessible, ASL interpreter available, etc."
                    />
                  </div>

                  {/* What to Bring */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">🎒 What to Bring</label>
                    <textarea 
                      value={form.what_to_bring} 
                      onChange={e => setForm({ ...form, what_to_bring: e.target.value })} 
                      rows={2}
                      className="w-full p-4 border rounded-lg"
                      placeholder="Lawn chairs, water bottle, sunscreen, etc."
                    />
                  </div>

                  {/* Dress Code */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">👔 Dress Code</label>
                    <input 
                      type="text" 
                      value={form.dress_code} 
                      onChange={e => setForm({ ...form, dress_code: e.target.value })} 
                      className="w-full p-4 border rounded-lg"
                      placeholder="Casual, Business casual, Formal, etc."
                    />
                  </div>

                  {/* Additional Info */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">📋 Additional Information</label>
                    <textarea 
                      value={form.additional_info} 
                      onChange={e => setForm({ ...form, additional_info: e.target.value })} 
                      rows={4}
                      className="w-full p-4 border rounded-lg"
                      placeholder="Any other important details..."
                    />
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 bg-gabriola-green text-white py-5 rounded-xl font-bold text-lg hover:bg-gabriola-green-dark shadow-lg hover:shadow-xl transition-all"
                >
                  {selectedEvent ? 'Update Event' : canPublishInstantly ? 'Publish Event' : 'Submit for Approval'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setSelectedEvent(null); resetForm(); }}
                  className="px-8 py-5 border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-semibold transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RSVP Modal - keeping your existing one */}
      {rsvpEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">RSVP to {rsvpEvent.title}</h3>
              <button onClick={() => setRsvpEvent(null)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleRsvp} className="space-y-4">
              <input name="name" placeholder="Your Name *" required className="w-full p-4 border rounded-lg" />
              <input name="email" type="email" placeholder="Email *" required className="w-full p-4 border rounded-lg" />
              <input name="phone" type="tel" placeholder="Phone" className="w-full p-4 border rounded-lg" />
              <input name="guests" type="number" min="0" placeholder="Additional Guests" className="w-full p-4 border rounded-lg" />
              <textarea name="message" placeholder="Message (optional)" rows={3} className="w-full p-4 border rounded-lg"></textarea>
              <button type="submit" className="w-full bg-gabriola-green text-white py-4 rounded-lg font-bold hover:bg-gabriola-green-dark">
                Confirm RSVP
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// EventCard component
function EventCard({ event, rsvpCount, onRsvp, onExport, onEdit, onDelete, canEdit }: any) {
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
    
    // Debug logging
    console.log('🔍 Mobile detection:', {
      userAgent,
      isMobileUA,
      isMobileScreen,
      isTouchDevice,
      result
    });
    
    return result;
  };
  
  // Handle Google Calendar - use Google Calendar URL on ALL platforms
  const handleGoogleCalendar = () => {
    console.log('📅 Opening Google Calendar');
    // Google Calendar URL works great on both desktop AND mobile!
    // On mobile with Google Calendar app installed: Prompts to open in app ✅
    // On mobile without app: Opens in mobile web ✅
    // On desktop: Opens in web interface ✅
    window.open(onExport.googleUrl, '_blank');
    setShowCalendarMenu(false);
  };
  
  // Handle all other calendar options - just download .ics file
  const handleOtherCalendar = () => {
    console.log('📥 Downloading .ics file');
    // On both mobile and desktop: Download .ics file
    // Mobile users can then tap the file to open in their calendar app
    onExport.downloadICS();
    setShowCalendarMenu(false);
  };
  
  return (
    <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition">
      {event.image_url && (
        <img src={event.image_url} alt={event.title} className="w-full h-48 object-cover" />
      )}
      <div className="p-6">
        <h3 className="text-2xl font-bold text-gabriola-green-dark mb-3">{event.title}</h3>
        
        {event.category && (
          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-3">
            {event.category}
          </span>
        )}

        <div className="space-y-2 mb-4 text-gray-700">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {format(event.start_date, 'PPP')} {event.start_time && `at ${event.start_time}`}
          </div>
          {event.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {event.location}
            </div>
          )}
          {event.fees && (
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              {event.fees}
            </div>
          )}
        </div>

        <p className="text-gray-700 mb-4 line-clamp-3">{event.description}</p>

        <div className="flex flex-col gap-2">
          {/* Primary action buttons */}
          <div className="flex items-center gap-2">
            <button 
              onClick={onRsvp}
              className="flex-1 bg-gabriola-green text-white px-4 py-2 rounded-lg font-bold hover:bg-gabriola-green-dark flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4" />
              RSVP {rsvpCount > 0 && `(${rsvpCount})`}
            </button>
            
            {/* Calendar dropdown */}
            <div className="flex-1">
              <button 
                ref={buttonRef}
                onClick={handleOpenMenu}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center justify-center gap-2"
                title="Add to your calendar"
              >
                <Calendar className="w-4 h-4" />
                Add to Calendar
                <ChevronDown className="w-4 h-4" />
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
              <button onClick={onEdit} className="flex-1 p-2 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center justify-center gap-2">
                <Edit className="w-5 h-5" />
                Edit
              </button>
              <button onClick={onDelete} className="flex-1 p-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center justify-center gap-2">
                <Trash2 className="w-5 h-5" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
