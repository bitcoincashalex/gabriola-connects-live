// components/EventsManager.tsx
// v2.0 - Dec 8, 2025 - Updated to new database schema
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { Event } from '@/lib/types';
import { format, isAfter, isBefore, isSameDay } from 'date-fns';
import { Plus, MapPin, Clock, DollarSign, Users, Mail, Phone, Calendar, Edit, Trash2, X, Upload } from 'lucide-react';

export default function EventsManager() {
  const { user } = useUser();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [rsvpEvent, setRsvpEvent] = useState<Event | null>(null);
  const [rsvpCount, setRsvpCount] = useState<Record<string, number>>({});

  // Form state
  const [form, setForm] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    is_all_day: false,
    location: '',
    venue_name: '',
    venue_address: '',
    image_url: '',
    organizer_name: '',
    organizer_email: '',
    contact_email: '',
    contact_phone: '',
    fees: '',
    registration_url: '',
    additional_info: '',
    age_restrictions: '',
    accessibility_info: '',
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
    fetchRsvpCounts();
  }, []);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('is_approved', true)
      .order('start_date', { ascending: true });
    
    if (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
    } else {
      // Convert database rows to Event objects
      const formattedEvents: Event[] = (data || []).map(event => ({
        ...event,
        start_date: new Date(event.start_date),
        end_date: event.end_date ? new Date(event.end_date) : undefined,
        postponed_from_date: event.postponed_from_date ? new Date(event.postponed_from_date) : undefined,
      }));
      setEvents(formattedEvents);
    }
    setLoading(false);
  };

  const fetchRsvpCounts = async () => {
    const { data } = await supabase
      .from('event_rsvps')
      .select('event_id, guests');
    const counts: Record<string, number> = {};
    data?.forEach(r => {
      counts[r.event_id] = (counts[r.event_id] || 0) + 1 + (r.guests || 0);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: form.title,
      description: form.description,
      start_date: form.start_date,
      end_date: form.end_date || form.start_date,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      is_all_day: form.is_all_day,
      location: form.location,
      venue_name: form.venue_name || null,
      venue_address: form.venue_address || null,
      image_url: form.image_url || null,
      organizer_name: form.organizer_name || null,
      contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null,
      fees: form.fees || null,
      registration_url: form.registration_url || null,
      additional_info: form.additional_info || null,
      age_restrictions: form.age_restrictions || null,
      accessibility_info: form.accessibility_info || null,
      source_name: 'User Submitted',
      source_type: 'user_submitted',
      is_approved: true,
      created_by: user?.id,
    };

    const { error } = selectedEvent
      ? await supabase.from('events').update(payload).eq('id', selectedEvent.id)
      : await supabase.from('events').insert(payload);

    if (!error) {
      alert(selectedEvent ? 'Event updated!' : 'Event created!');
      setShowForm(false);
      setSelectedEvent(null);
      setForm({
        title: '',
        description: '',
        start_date: '',
        end_date: '',
        start_time: '',
        end_time: '',
        is_all_day: false,
        location: '',
        venue_name: '',
        venue_address: '',
        image_url: '',
        organizer_name: '',
        organizer_email: '',
        contact_email: '',
        contact_phone: '',
        fees: '',
        registration_url: '',
        additional_info: '',
        age_restrictions: '',
        accessibility_info: '',
      });
      setImagePreview(null);
      fetchEvents();
    } else {
      alert('Error: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this event forever?')) return;
    await supabase.from('events').delete().eq('id', id);
    fetchEvents();
  };

  const handleRsvp = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    const payload = {
      event_id: rsvpEvent?.id,
      name: data.get('name'),
      email: data.get('email'),
      phone: data.get('phone'),
      guests: Number(data.get('guests') || 0),
      message: data.get('message'),
      user_id: user?.id || null,
    };

    const { error } = await supabase.from('event_rsvps').insert(payload);
    if (!error) {
      alert('RSVP sent! Thank you!');
      setRsvpEvent(null);
      fetchRsvpCounts();
      form.reset();
    }
  };

  if (loading) return <div className="text-center py-20 text-2xl">Loading events...</div>;

  const today = new Date();
  const upcoming = events.filter(e => 
    isAfter(e.start_date, today) || isSameDay(e.start_date, today)
  );
  const past = events.filter(e => isBefore(e.start_date, today));

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
            Add Event
          </button>
        )}
      </div>

      {/* Upcoming Events */}
      <section className="mb-16">
        <h2 className="text-3xl font-bold text-gabriola-green-dark mb-8">Upcoming Events</h2>
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
                onEdit={() => { setSelectedEvent(event); setShowForm(true); }}
                onDelete={() => handleDelete(event.id)}
                isAdmin={user?.role === 'admin'}
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
                {selectedEvent ? 'Edit Event' : 'Add New Event'}
              </h2>
              <button onClick={() => { setShowForm(false); setSelectedEvent(null); setImagePreview(null); }} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-gabriola-green" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                  <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} required className="w-full p-4 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                  <input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} disabled={form.is_all_day} className="w-full p-4 border rounded-lg" />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={form.is_all_day} onChange={e => setForm({ ...form, is_all_day: e.target.checked })} className="w-5 h-5" />
                  <span>All Day Event</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="w-full p-4 border rounded-lg" placeholder="General location (e.g., Gabriola Island)" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Venue Name</label>
                <input type="text" value={form.venue_name} onChange={e => setForm({ ...form, venue_name: e.target.value })} className="w-full p-4 border rounded-lg" placeholder="e.g., Rollo Centre" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={4} className="w-full p-4 border rounded-lg resize-none"></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fees</label>
                <input type="text" value={form.fees} onChange={e => setForm({ ...form, fees: e.target.value })} className="w-full p-4 border rounded-lg" placeholder="e.g., Free, $10, By Donation" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
                <input type="email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} className="w-full p-4 border rounded-lg" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Poster Image</label>
                {imagePreview ? (
                  <div className="relative">
                    <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                    <button type="button" onClick={() => { setImagePreview(null); setForm({ ...form, image_url: '' }); }} className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="block">
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gabriola-green">
                      <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <p>Click to upload image (max 5MB)</p>
                    </div>
                  </label>
                )}
              </div>

              <button type="submit" className="w-full bg-gabriola-green text-white py-4 rounded-lg font-bold hover:bg-gabriola-green-dark">
                {selectedEvent ? 'Update Event' : 'Create Event'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* RSVP Modal */}
      {rsvpEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-8">
            <h2 className="text-2xl font-bold mb-4">RSVP: {rsvpEvent.title}</h2>
            <form onSubmit={handleRsvp} className="space-y-4">
              <input name="name" placeholder="Your name" required className="w-full p-3 border rounded-lg" />
              <input name="email" type="email" placeholder="Email" required className="w-full p-3 border rounded-lg" />
              <input name="phone" placeholder="Phone (optional)" className="w-full p-3 border rounded-lg" />
              <input name="guests" type="number" placeholder="Guests (0 for just you)" defaultValue="0" min="0" className="w-full p-3 border rounded-lg" />
              <textarea name="message" placeholder="Message (optional)" rows={3} className="w-full p-3 border rounded-lg resize-none"></textarea>
              <button type="submit" className="w-full bg-gabriola-green text-white py-3 rounded-lg font-bold hover:bg-gabriola-green-dark">
                Send RSVP
              </button>
            </form>
            <button onClick={() => setRsvpEvent(null)} className="mt-4 text-red-600 w-full">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable Event Card
function EventCard({ event, rsvpCount, onRsvp, onEdit, onDelete, isAdmin }: any) {
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition">
      {event.image_url && (
        <img src={event.image_url} alt={event.title} className="w-full h-48 object-cover" />
      )}
      <div className="p-6">
        <h3 className="text-2xl font-bold text-gabriola-green-dark mb-3">{event.title}</h3>
        
        <div className="space-y-2 text-gray-700 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gabriola-green" />
            <span>{format(event.start_date, 'PPP')}</span>
            {event.start_time && <span className="text-sm">• {event.start_time}</span>}
          </div>
          {event.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-gabriola-green" />
              <span>{event.venue_name || event.location}</span>
            </div>
          )}
          {event.fees && (
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-gabriola-green" />
              <span>{event.fees}</span>
            </div>
          )}
        </div>

        {event.description && (
          <p className="text-gray-600 mb-6 line-clamp-3">{event.description}</p>
        )}

        <div className="flex items-center justify-between">
          <button
            onClick={onRsvp}
            className="bg-gabriola-green text-white px-6 py-3 rounded-full font-bold hover:bg-gabriola-green-dark flex items-center gap-2"
          >
            <Users className="w-5 h-5" />
            RSVP ({rsvpCount})
          </button>

          {isAdmin && (
            <div className="flex gap-2">
              <button onClick={onEdit} className="p-2 hover:bg-gray-100 rounded-full">
                <Edit className="w-5 h-5" />
              </button>
              <button onClick={onDelete} className="p-2 hover:bg-red-100 rounded-full text-red-600">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
