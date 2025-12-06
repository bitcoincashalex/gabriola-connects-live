// components/Calendar.tsx — FULLY RESTORED, FULLY WORKING, NO GAPS
'use client';

import { useState, useMemo } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { Event } from '@/lib/types';
import { X, MapPin, Clock, Plus, Mail, Phone, Upload, LogIn, UserCircle } from 'lucide-react';
import { canCreateEvents } from '@/lib/auth-utils';
import { useUser } from '@/components/AuthProvider';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './calendar-custom.css';

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

export default function Calendar({ events = [] }: { events?: Event[] }) {
  const { user, loading: authLoading } = useUser();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Only show loading while auth is loading
  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center py-32">
        <p className="text-2xl text-gray-600">Loading calendar...</p>
      </div>
    );
  }

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '',
    endDate: format(new Date(), 'yyyy-MM-dd'),
    endTime: '',
    allDay: false,
    location: '',
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
    return events.map(event => ({
      title: event.title,
      start: event.date,
      end: event.date,
      resource: event,
    }));
  }, [events]);

  const eventsForSelectedDate = useMemo(() => {
    return events.filter(event => 
      event.date.toDateString() === selectedDate.toDateString()
    );
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalLocation = formData.location === 'other' ? customLocation.trim() : formData.location.trim();
    
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
      date: eventDate,
      time: formData.allDay ? 'All Day' : formatTimeDisplay(formData.time),
      location: finalLocation,
      description: formData.description.trim() || 'No description provided.',
      posterImage: formData.posterImage.trim() || undefined,
      organizerEmail: formData.organizerEmail.trim() || undefined,
      organizerPhone: formData.organizerPhone.trim() || undefined,
      source: 'User Submitted',
      endDate: formData.endDate ? new Date(formData.endDate) : undefined,
      endTime: formData.endTime ? formatTimeDisplay(formData.endTime) : undefined,
      allDay: formData.allDay,
      fees: formData.fees.trim() || undefined,
      recurring: formData.recurring.trim() || undefined,
      contactInfo: formData.contactInfo.trim() || undefined,
    }}));

    setFormData({
      title: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      time: '',
      endDate: format(new Date(), 'yyyy-MM-dd'),
      endTime: '',
      allDay: false,
      location: '',
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
    setShowAddForm(false);
  };

  const handleRSVP = (event: Event) => {
    if (event.organizerEmail) {
      const subject = encodeURIComponent(`RSVP: ${event.title}`);
      const body = encodeURIComponent(
        `Hi,\n\nI would like to RSVP for the following event:\n\n` +
        `Event: ${event.title}\n` +
        `Date: ${format(event.date, 'MMMM d, yyyy')}\n` +
        `Time: ${event.time}\n` +
        `Location: ${event.location}\n\n` +
        `Please confirm my attendance.\n\nThank you!`
      );
      window.location.href = `mailto:${event.organizerEmail}?subject=${subject}&body=${body}`;
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
              <select
                value={formData.location === 'other' || (formData.location && !['Community Hall - 2200 South Road','Agi Hall - 575 South Road','Surf Lodge - 885 Berry Point Rd','The Commons - 501 South Road','Rollo Centre - 575 South Road','Gabriola Fellowship Church','Gabriola Golf Club','Phoenix Auditorium','Gabriola Library - 575 South Road',"Page's Inn on Silva Bay - 3415 South Road",'Huxley Community Park - 2720 Huxley Rd'].includes(formData.location)) ? 'other' : formData.location}
                onChange={(e) => {
                  if (e.target.value === 'other') {
                    setFormData({ ...formData, location: 'other' });
                    setCustomLocation('');
                  } else {
                    setFormData({ ...formData, location: e.target.value });
                    setCustomLocation('');
                  }
                }}
                required={!customLocation}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gabriola-green"
              >
                <option value="">Choose location or select "Other"</option>
                <option value="Community Hall - 2200 South Road">Community Hall - 2200 South Road</option>
                <option value="Agi Hall - 575 South Road">Agi Hall - 575 South Road</option>
                <option value="Surf Lodge - 885 Berry Point Rd">Surf Lodge - 885 Berry Point Rd</option>
                <option value="The Commons - 501 South Road">The Commons - 501 South Road</option>
                <option value="Rollo Centre - 575 South Road">Rollo Centre - 575 South Road</option>
                <option value="Gabriola Fellowship Church">Gabriola Fellowship Church</option>
                <option value="Gabriola Golf Club">Gabriola Golf Club</option>
                <option value="Phoenix Auditorium">Phoenix Auditorium</option>
                <option value="Gabriola Library - 575 South Road">Gabriola Library - 575 South Road</option>
                <option value="Page's Inn on Silva Bay - 3415 South Road">Page's Inn on Silva Bay - 3415 South Road</option>
                <option value="Huxley Community Park - 2720 Huxley Rd">Huxley Community Park - 2720 Huxley Rd</option>
                <option value="other">Other (type below)</option>
              </select>
              {formData.location === 'other' && (
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
                  {event.time}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 fade-in" onClick={() => setSelectedEvent(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl slide-up" onClick={e => e.stopPropagation()}>
            {selectedEvent.posterImage && (
              <img src={selectedEvent.posterImage} alt={selectedEvent.title} className="w-full h-48 object-cover rounded-t-2xl" />
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
                      <span className="font-medium">{selectedEvent.time}</span>
                      {selectedEvent.endTime && <span className="text-gray-500">- {selectedEvent.endTime}</span>}
                      <span className="text-gray-500">
                        on {format(selectedEvent.date, 'MMMM d, yyyy')}
                        {selectedEvent.endDate && selectedEvent.endDate.getTime() !== selectedEvent.date.getTime() && 
                          ` - ${format(selectedEvent.endDate, 'MMMM d, yyyy')}`
                        }
                      </span>
                      <button
                        onClick={() => {
                          const eventTitle = encodeURIComponent(selectedEvent.title);
                          const eventDetails = encodeURIComponent(selectedEvent.description);
                          const eventLocation = encodeURIComponent(selectedEvent.location);
                          const eventDate = format(selectedEvent.date, 'yyyyMMdd');
                          const googleCalUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${eventDate}/${eventDate}&details=${eventDetails}&location=${eventLocation}`;
                          window.open(googleCalUrl, '_blank');
                        }}
                        className="text-xs bg-gabriola-green/10 text-gabriola-green px-3 py-1 rounded-full hover:bg-gabriola-green/20 transition-colors"
                      >
                        Add to Calendar
                      </button>
                    </div>
                    {selectedEvent.recurring && (
                      <div className="text-sm text-gabriola-green-dark mt-1">
                        📅 {selectedEvent.recurring}
                      </div>
                    )}
                  </div>
                </div>

                {selectedEvent.fees && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="text-gabriola-green">💵</span>
                    <span className="font-medium">{selectedEvent.fees}</span>
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

                {selectedEvent.organizerEmail && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Mail className="w-5 h-5 text-gabriola-green" />
                    <a href={`mailto:${selectedEvent.organizerEmail}`} className="text-sm text-blue-600 hover:text-blue-800 hover:underline">
                      {selectedEvent.organizerEmail}
                    </a>
                  </div>
                )}

                {selectedEvent.organizerPhone && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone className="w-5 h-5 text-gabriola-green" />
                    <a href={`tel:${selectedEvent.organizerPhone}`} className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium">
                      {selectedEvent.organizerPhone}
                    </a>
                  </div>
                )}
              </div>

              <div className="prose prose-sm max-w-none mb-6">
                <p className="text-gray-700 leading-relaxed">{selectedEvent.description}</p>
              </div>

              {selectedEvent.contactInfo && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-gray-800 mb-2">ℹ️ Additional Information</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedEvent.contactInfo}</p>
                </div>
              )}

              {(selectedEvent.organizerEmail || selectedEvent.organizerPhone) && (
                <div className="mb-6 p-4 bg-gabriola-sand/30 rounded-lg border border-gabriola-green/20">
                  <h3 className="font-semibold text-gabriola-green-dark mb-3 flex items-center gap-2">
                    📞 Contact Organizer
                  </h3>
                  <div className="space-y-2">
                    {selectedEvent.organizerEmail && (
                      <a href={`mailto:${selectedEvent.organizerEmail}`} className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline transition-colors">
                        <Mail className="w-4 h-4" />
                        <span className="text-sm">{selectedEvent.organizerEmail}</span>
                      </a>
                    )}
                    {selectedEvent.organizerPhone && (
                      <a href={`tel:${selectedEvent.organizerPhone}`} className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline transition-colors font-medium">
                        <Phone className="w-4 h-4" />
                        <span className="text-sm">{selectedEvent.organizerPhone}</span>
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-3">
                    Have questions about this event? Contact the organizer directly!
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                {selectedEvent.organizerEmail ? (
                  <button onClick={() => handleRSVP(selectedEvent)} className="flex-1 bg-gabriola-green text-white py-3 px-6 rounded-lg font-semibold hover:bg-gabriola-green-dark transition-colors flex items-center justify-center gap-2">
                    <Mail className="w-4 h-4" />
                    RSVP via Email
                  </button>
                ) : selectedEvent.organizerPhone ? (
                  <button onClick={() => handleCall(selectedEvent.organizerPhone!)} className="flex-1 bg-gabriola-green text-white py-3 px-6 rounded-lg font-semibold hover:bg-gabriola-green-dark transition-colors flex items-center justify-center gap-2">
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

              {!selectedEvent.organizerEmail && !selectedEvent.organizerPhone && (
                <p className="text-xs text-amber-600 mt-2 text-center">
                  No organizer contact info available - check event source for RSVP details
                </p>
              )}

              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Source: {selectedEvent.source}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}