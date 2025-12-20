// Path: components/Calendar.tsx
// Version: 2.4.0 - Prominent Chamber of Commerce attribution with link
// Date: 2024-12-13
// components/Calendar.tsx — FULLY RESTORED, FULLY WORKING, NO GAPS
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { Event } from '@/lib/types';
import { X, MapPin, Clock, Plus, Mail, Phone, Upload, LogIn, UserCircle } from 'lucide-react';
import { canCreateEvents } from '@/lib/auth-utils';
import { useUser } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
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
  
  // Only show loading while auth is loading
  if (authLoading || loading) { 
    return (
      <div className="max-w-4xl mx-auto p-8 text-center py-32">
        <p className="text-2xl text-gray-600">Loading calendar...</p>
      </div>
    );
  }


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

  const calendarEvents = useMemo(() => {
    return events
      .filter(event => event.start_date) // Only include events with valid start_date
      .map(event => ({
        title: event.title,
        start: ensureDate(event.start_date),
        end: ensureDate(event.start_date),
        resource: event,
      }));
  }, [events]);

  const eventsForSelectedDate = useMemo(() => {
    return events
      .filter(event => event.start_date) // Only include events with valid start_date
      .filter(event => 
        ensureDate(event.start_date).toDateString() === selectedDate.toDateString()
      )
      .sort((a, b) => {
        // Sort by time - handle all-day events and missing times
        const timeA = a.start_time || '00:00:00';
        const timeB = b.start_time || '00:00:00';
        return timeA.localeCompare(timeB);
      });
  }, [events, selectedDate]);

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

  const handleSubmit = (e: React.FormEvent) => {
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

    const eventDate = new Date(formData.date);
    
    window.dispatchEvent(new CustomEvent('add-event', { detail: {
      title: formData.title.trim(),
      start_date: eventDate,
      start_time: formData.allDay ? 'All Day' : formatTimeDisplay(formData.time),
      location: finalLocation,
      venue_name: formData.venue_name || undefined,
      venue_address: formData.venue_address || undefined,
      venue_city: formData.venue_city || 'Gabriola',
      venue_postal_code: formData.venue_postal_code || undefined,
      venue_map_url: formData.venue_map_url || undefined,
      description: formData.description.trim() || 'No description provided.',
      image_url: formData.posterImage.trim() || undefined,
      contact_email: formData.organizerEmail.trim() || undefined,
      contact_phone: formData.organizerPhone.trim() || undefined,
      source_name: 'User Submitted',
      end_date: formData.endDate ? new Date(formData.endDate) : undefined,
      end_time: formData.endTime ? formatTimeDisplay(formData.endTime) : undefined,
      is_all_day: formData.allDay,
      is_recurring: formData.recurring.trim() ? true : false,
      recurrence_pattern: formData.recurring.trim() || undefined,
    }}));

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
  };

  const handleRSVP = (event: Event) => {
    if (event.contact_email) {
      const subject = encodeURIComponent(`RSVP: ${event.title}`);
      const body = encodeURIComponent(
        `Hi,\n\nI would like to RSVP for the following event:\n\n` +
        `Event: ${event.title}\n` +
        `Date: ${format(event.start_date, 'MMMM d, yyyy')}\n` +
        `Time: ${event.start_time}\n` +
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

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b border-gabriola-green/20">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-display font-bold text-gabriola-green">
            Island Events
          </h1>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600 mr-2">
                  <UserCircle className="w-5 h-5" />
                  <span>{user.username}</span>
                </div>
                {canCreateEvents(user) ? (
                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="bg-gabriola-green text-white px-4 py-2 rounded-lg font-semibold hover:bg-gabriola-green-dark transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {showAddForm ? 'Cancel' : 'Add Event'}
                  </button>
                ) : (
                  <div className="text-xs text-gray-500 italic hidden sm:block">
                    Contact admin to add events
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={() => window.location.href = '/signin'}
                className="bg-white text-gabriola-green border-2 border-gabriola-green px-4 py-2 rounded-lg font-semibold hover:bg-gabriola-green hover:text-white transition-colors flex items-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
            )}
          </div>
        </div>
        
        {/* Prominent Attribution */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 mb-3">
          <a 
            href="https://directory.gabriolaevents.ca/gabriola-events/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm font-medium text-blue-700 hover:text-blue-900 transition-colors inline-flex items-center gap-1"
          >
            <span>Sample events data from Gabriola Chamber of Commerce</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
        
        <p className="text-sm text-gray-600">
          {eventsForSelectedDate.length} event{eventsForSelectedDate.length !== 1 ? 's' : ''} on {format(selectedDate, 'MMMM d, yyyy')}
        </p>
      </div>

      {showAddForm && (
        <div className="p-4 bg-gabriola-sand/30 border-b border-gabriola-green/20 slide-up overflow-y-auto max-h-[500px]">
          <h3 className="font-semibold text-gabriola-green-dark mb-3">Add New Event</h3>
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

      <div className="flex-1 overflow-auto p-4">
        <div className="h-full min-h-[600px]">
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
            className="h-full"
            style={{ minHeight: '600px' }}
          />
        </div>
      </div>

      {eventsForSelectedDate.length > 0 && !selectedEvent && (
        <div className="border-t border-gabriola-green/20 p-4 bg-gabriola-sand/30 overflow-y-auto max-h-64">
          <h3 className="font-semibold text-gabriola-green-dark mb-3">
            Events on {format(selectedDate, 'MMMM d')}:
          </h3>
          <div className="space-y-2">
            {eventsForSelectedDate.map(event => (
              <button
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className="w-full text-left p-3 bg-white rounded-lg hover:bg-gabriola-green/5 transition-colors border border-gabriola-green/20"
              >
                <div className="font-medium text-gabriola-green-dark">{event.title}</div>
                <div className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  {event.start_time}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 fade-in" onClick={() => setSelectedEvent(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl slide-up" onClick={e => e.stopPropagation()}>
            {selectedEvent.image_url && (
              <img src={selectedEvent.image_url} alt={selectedEvent.title} className="w-full h-48 object-cover rounded-t-2xl" />
            )}
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-display font-bold text-gabriola-green-dark pr-8">
                  {selectedEvent.title}
                </h2>
                <button onClick={() => setSelectedEvent(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-2 text-gray-700">
                  <Clock className="w-5 h-5 text-gabriola-green flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-medium">{selectedEvent.start_time}</span>
                      {selectedEvent.end_time && <span className="text-gray-500">- {selectedEvent.end_time}</span>}
                      <span className="text-gray-500">
                        on {format(selectedEvent.start_date, 'MMMM d, yyyy')}
                        {selectedEvent.end_date && selectedEvent.end_date.getTime() !== selectedEvent.start_date.getTime() && 
                          ` - ${format(selectedEvent.end_date, 'MMMM d, yyyy')}`
                        }
                      </span>
                      <button
                        onClick={() => {
                          const eventTitle = encodeURIComponent(selectedEvent.title);
                          const eventDetails = encodeURIComponent(selectedEvent.description);
                          const eventLocation = encodeURIComponent(selectedEvent.location);
                          const eventDate = format(selectedEvent.start_date, 'yyyyMMdd');
                          const googleCalUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${eventDate}/${eventDate}&details=${eventDetails}&location=${eventLocation}`;
                          window.open(googleCalUrl, '_blank');
                        }}
                        className="text-xs bg-gabriola-green/10 text-gabriola-green px-3 py-1 rounded-full hover:bg-gabriola-green/20 transition-colors"
                      >
                        Add to Calendar
                      </button>
                    </div>
                    {selectedEvent.is_recurring && selectedEvent.recurrence_pattern && (
                      <div className="text-sm text-gabriola-green-dark mt-1">
                        📅 Repeats {selectedEvent.recurrence_pattern}
                      </div>
                    )}
                  </div>
                </div>


                {/* Fees */}
                {selectedEvent.fees && (
                  <div className="flex items-center gap-2 text-gray-700 mt-4">
                    <span className="text-gabriola-green text-xl">💵</span>
                    <span className="font-medium">{selectedEvent.fees}</span>
                  </div>
                )}

                {/* Registration */}
                {selectedEvent.registration_url && (
                  <a 
                    href={selectedEvent.registration_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 mt-4 bg-gabriola-green text-white rounded-lg hover:bg-gabriola-green-dark transition-colors"
                  >
                    🎟️ Register Now →
                  </a>
                )}

                {/* Venue Name */}
                {selectedEvent.venue_name && (
                  <div className="flex items-center gap-2 text-gray-700 mt-4">
                    <span className="text-gabriola-green">🏢</span>
                    <span className="font-medium">{selectedEvent.venue_name}</span>
                  </div>
                )}

                {/* Age Restrictions */}
                {selectedEvent.age_restrictions && (
                  <div className="flex items-center gap-2 text-gray-700 mt-2">
                    <span className="text-gabriola-green">👶</span>
                    <span className="text-sm">{selectedEvent.age_restrictions}</span>
                  </div>
                )}

                {/* Accessibility */}
                {selectedEvent.accessibility_info && (
                  <div className="flex items-center gap-2 text-gray-700 mt-2">
                    <span className="text-gabriola-green">♿</span>
                    <span className="text-sm">{selectedEvent.accessibility_info}</span>
                  </div>
                )}

                {/* Weather Dependent */}
                {selectedEvent.weather_dependent && (
                  <div className="flex items-center gap-2 text-blue-600 mt-2">
                    <span>🌧️</span>
                    <span className="text-sm">Weather permitting</span>
                  </div>
                )}

                {/* Cancelled Badge */}
                {selectedEvent.status === 'cancelled' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                    <div className="text-red-800 font-semibold">❌ Event Cancelled</div>
                    {selectedEvent.cancellation_reason && (
                      <div className="text-sm text-red-700 mt-1">{selectedEvent.cancellation_reason}</div>
                    )}
                  </div>
                )}
                
                <button
                  onClick={() => {
                    const fullAddress = getFullAddress(selectedEvent.location);
                    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
                    window.open(mapsUrl, '_blank');
                  }}
                  className="flex items-start gap-2 text-gray-700 hover:text-gabriola-green transition-colors w-full text-left group"
                >
                  <MapPin className="w-5 h-5 text-gabriola-green flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                  <div>
                    <span className="underline decoration-dotted">{selectedEvent.location}</span>
                    <div className="text-xs text-gabriola-green mt-1">Click to open in Google Maps →</div>
                  </div>
                </button>

                {selectedEvent.contact_email && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Mail className="w-5 h-5 text-gabriola-green" />
                    <a href={`mailto:${selectedEvent.contact_email}`} className="text-sm text-blue-600 hover:text-blue-800 hover:underline">
                      {selectedEvent.contact_email}
                    </a>
                  </div>
                )}

                {selectedEvent.contact_phone && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone className="w-5 h-5 text-gabriola-green" />
                    <a href={`tel:${selectedEvent.contact_phone}`} className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium">
                      {selectedEvent.contact_phone}
                    </a>
                  </div>
                )}
              </div>

              <div className="prose prose-sm max-w-none mb-6">
                <p className="text-gray-700 leading-relaxed">{selectedEvent.description}</p>
              </div>



              {/* Additional Information */}
              {selectedEvent.additional_info && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    ℹ️ Additional Information
                  </h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedEvent.additional_info}</p>
                </div>
              )}

              {/* Organizer Information */}
              {(selectedEvent.organizer_name || selectedEvent.organizer_organization) && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-semibold text-gray-800 mb-2">👤 Organized By</h4>
                  {selectedEvent.organizer_name && (
                    <div className="text-sm text-gray-700">{selectedEvent.organizer_name}</div>
                  )}
                  {selectedEvent.organizer_organization && (
                    <div className="text-sm text-gray-600">{selectedEvent.organizer_organization}</div>
                  )}
                  {selectedEvent.organizer_website && (
                    <a href={selectedEvent.organizer_website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline mt-1 inline-block">
                      🌐 Visit Website →
                    </a>
                  )}
                </div>
              )}
              {(selectedEvent.contact_email || selectedEvent.contact_phone) && (
                <div className="mb-6 p-4 bg-gabriola-sand/30 rounded-lg border border-gabriola-green/20">
                  <h3 className="font-semibold text-gabriola-green-dark mb-3 flex items-center gap-2">
                    📞 Contact Organizer
                  </h3>
                  <div className="space-y-2">
                    {selectedEvent.contact_email && (
                      <a href={`mailto:${selectedEvent.contact_email}`} className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline transition-colors">
                        <Mail className="w-4 h-4" />
                        <span className="text-sm">{selectedEvent.contact_email}</span>
                      </a>
                    )}
                    {selectedEvent.contact_phone && (
                      <a href={`tel:${selectedEvent.contact_phone}`} className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline transition-colors font-medium">
                        <Phone className="w-4 h-4" />
                        <span className="text-sm">{selectedEvent.contact_phone}</span>
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-3">
                    Have questions about this event? Contact the organizer directly!
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                {selectedEvent.contact_email ? (
                  <button onClick={() => handleRSVP(selectedEvent)} className="flex-1 bg-gabriola-green text-white py-3 px-6 rounded-lg font-semibold hover:bg-gabriola-green-dark transition-colors flex items-center justify-center gap-2">
                    <Mail className="w-4 h-4" />
                    RSVP via Email
                  </button>
                ) : selectedEvent.contact_phone ? (
                  <button onClick={() => handleCall(selectedEvent.contact_phone!)} className="flex-1 bg-gabriola-green text-white py-3 px-6 rounded-lg font-semibold hover:bg-gabriola-green-dark transition-colors flex items-center justify-center gap-2">
                    <Phone className="w-4 h-4" />
                    Call to RSVP
                  </button>
                ) : (
                  <button className="flex-1 bg-gray-400 text-white py-3 px-6 rounded-lg font-semibold cursor-not-allowed" disabled>
                    No Contact Info
                  </button>
                )}
                <button className="px-6 py-3 border-2 border-gabriola-green text-gabriola-green rounded-lg font-semibold hover:bg-gabriola-green/5 transition-colors">
                  Share
                </button>
              </div>

              {!selectedEvent.contact_email && !selectedEvent.contact_phone && (
                <p className="text-xs text-amber-600 mt-2 text-center">
                  No organizer contact info available - check event source for RSVP details
                </p>
              )}

              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Source: {selectedEvent.source_url ? (<a href={selectedEvent.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{selectedEvent.source_name}</a>) : selectedEvent.source_name}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}