// app/my-events/page.tsx
// Version: 1.0.1b - SYNTAX FIX: Added missing semicolon
// Date: 2025-12-22

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import Link from 'next/link';
import { Calendar, MapPin, Users, Edit, Trash2, Plus, Clock, Filter, ArrowUpDown, X, Upload, AlertCircle } from 'lucide-react';
import { format, isPast, isFuture, parseISO } from 'date-fns';

interface Event {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string;
  category: string;
  image_url: string | null;
  created_at: string;
  attendance_count: number;
  is_active: boolean;
  fees: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  organizer_name: string | null;
  organizer_organization: string | null;
  registration_url: string | null;
  accessibility_info: string | null;
}

export default function MyEventsPage() {
  const { user } = useUser();
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'title'>('date-desc');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  
  // Edit modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    location: '',
    fees: '',
    contact_email: '',
    contact_phone: '',
    organizer_name: '',
    organizer_organization: '',
    registration_url: '',
    accessibility_info: '',
    image_url: '',
  });

  useEffect(() => {
    if (user) {
      fetchMyEvents();
    }
  }, [user]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [events, filter, sortBy]);

  const fetchMyEvents = async () => {
    if (!user) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('created_by', user.id)
      .order('start_date', { ascending: false });

    if (data && !error) {
      setEvents(data);
    }

    setLoading(false);
  };

  const applyFiltersAndSort = () => {
    let filtered = [...events];

    // Apply filter
    if (filter === 'upcoming') {
      filtered = filtered.filter(event => isFuture(parseISO(event.start_date)));
    } else if (filter === 'past') {
      filtered = filtered.filter(event => isPast(parseISO(event.start_date)));
    }

    // Apply sort
    if (sortBy === 'date-desc') {
      filtered.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
    } else if (sortBy === 'date-asc') {
      filtered.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
    } else if (sortBy === 'title') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    }

    setFilteredEvents(filtered);
  };

  const openEditModal = (event: Event) => {
    setEditingEvent(event);
    setForm({
      title: event.title,
      description: event.description,
      category: event.category || '',
      start_date: format(parseISO(event.start_date), 'yyyy-MM-dd'),
      end_date: event.end_date ? format(parseISO(event.end_date), 'yyyy-MM-dd') : '',
      start_time: event.start_time || '',
      end_time: event.end_time || '',
      location: event.location,
      fees: event.fees || '',
      contact_email: event.contact_email || '',
      contact_phone: event.contact_phone || '',
      organizer_name: event.organizer_name || '',
      organizer_organization: event.organizer_organization || '',
      registration_url: event.registration_url || '',
      accessibility_info: event.accessibility_info || '',
      image_url: event.image_url || '',
    });
    setImagePreview(event.image_url);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingEvent(null);
    setImagePreview(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `event-images/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('events')
      .upload(filePath, file);

    if (uploadError) {
      alert('Error uploading image');
      return;
    }

    const { data } = supabase.storage
      .from('events')
      .getPublicUrl(filePath);

    setForm({ ...form, image_url: data.publicUrl });
    setImagePreview(data.publicUrl);
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;

    const payload = {
      ...form,
      start_date: form.start_date,
      end_date: form.end_date || null,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
    };

    const { error } = await supabase
      .from('events')
      .update(payload)
      .eq('id', editingEvent.id);

    if (error) {
      alert('Error updating event: ' + error.message);
      return;
    }

    await fetchMyEvents();
    closeEditModal();
  };

  const handleDelete = async () => {
    if (!eventToDelete) return;

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventToDelete.id);

    if (!error) {
      setEvents(events.filter(e => e.id !== eventToDelete.id));
      setShowDeleteModal(false);
      setEventToDelete(null);
    }
  };

  const confirmDelete = (event: Event) => {
    setEventToDelete(event);
    setShowDeleteModal(true);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign In Required</h2>
          <p className="text-gray-600 mb-6">Please sign in to view your events</p>
          <Link
            href="/signin"
            className="bg-gabriola-green text-white px-6 py-3 rounded-lg font-medium hover:bg-gabriola-green-dark transition"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-gabriola-green" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">My Events</h1>
                <p className="text-gray-600">Manage events you've created</p>
              </div>
            </div>
            <Link
              href="/events/create"
              className="flex items-center gap-2 bg-gabriola-green text-white px-4 py-2 rounded-lg font-medium hover:bg-gabriola-green-dark transition"
            >
              <Plus className="w-5 h-5" />
              Create Event
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{events.length}</div>
              <div className="text-sm text-gray-600">Total Events</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {events.filter(e => isFuture(parseISO(e.start_date))).length}
              </div>
              <div className="text-sm text-gray-600">Upcoming</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {events.filter(e => isPast(parseISO(e.start_date))).length}
              </div>
              <div className="text-sm text-gray-600">Past</div>
            </div>
          </div>
        </div>

        {/* Filters and Sort */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Filter */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Filter className="w-4 h-4 inline mr-1" />
                Filter by Status
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    filter === 'all'
                      ? 'bg-gabriola-green text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All ({events.length})
                </button>
                <button
                  onClick={() => setFilter('upcoming')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    filter === 'upcoming'
                      ? 'bg-gabriola-green text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Upcoming ({events.filter(e => isFuture(parseISO(e.start_date))).length})
                </button>
                <button
                  onClick={() => setFilter('past')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    filter === 'past'
                      ? 'bg-gabriola-green text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Past ({events.filter(e => isPast(parseISO(e.start_date))).length})
                </button>
              </div>
            </div>

            {/* Sort */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <ArrowUpDown className="w-4 h-4 inline mr-1" />
                Sort by
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
              >
                <option value="date-desc">Date (Newest First)</option>
                <option value="date-asc">Date (Oldest First)</option>
                <option value="title">Title (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Events List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gabriola-green border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your events...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {filter === 'all' ? 'No Events Yet' : `No ${filter} Events`}
            </h3>
            <p className="text-gray-600 mb-6">
              {filter === 'all'
                ? "You haven't created any events yet. Get started by creating your first event!"
                : `You don't have any ${filter} events.`}
            </p>
            {filter === 'all' && (
              <Link
                href="/events/create"
                className="inline-flex items-center gap-2 bg-gabriola-green text-white px-6 py-3 rounded-lg font-medium hover:bg-gabriola-green-dark transition"
              >
                <Plus className="w-5 h-5" />
                Create Your First Event
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map((event) => {
              const isUpcoming = isFuture(parseISO(event.start_date));
              
              return (
                <div
                  key={event.id}
                  className="bg-white rounded-xl shadow-sm hover:shadow-md transition overflow-hidden"
                >
                  <div className="flex flex-col md:flex-row">
                    {/* Image */}
                    {event.image_url ? (
                      <div className="md:w-48 h-48 md:h-auto flex-shrink-0">
                        <img
                          src={event.image_url}
                          alt={event.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="md:w-48 h-48 md:h-auto flex-shrink-0 bg-gradient-to-br from-gabriola-green to-green-600 flex items-center justify-center">
                        <Calendar className="w-16 h-16 text-white opacity-50" />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-xl font-bold text-gray-900">
                              {event.title}
                            </h3>
                            {isUpcoming ? (
                              <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                                Upcoming
                              </span>
                            ) : (
                              <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium">
                                Past
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                            {event.description}
                          </p>
                        </div>
                      </div>

                      {/* Event Details */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4 text-gabriola-green" />
                          <span>{format(parseISO(event.start_date), 'MMM d, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4 text-gabriola-green" />
                          <span className="truncate">{event.location}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Users className="w-4 h-4 text-gabriola-green" />
                          <span>{event.attendance_count || 0} attending</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => openEditModal(event)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200 transition"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => confirmDelete(event)}
                          className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && editingEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full my-8 shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 rounded-t-2xl flex justify-between items-center">
              <h2 className="text-3xl font-bold text-gabriola-green">Edit Event</h2>
              <button onClick={closeEditModal} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleUpdateEvent} className="p-8 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="text-lg font-bold text-gray-900">Basic Information</h4>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Event Title *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    required
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    required
                    rows={4}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
                  />
                </div>
              </div>

              {/* Date & Time */}
              <div className="space-y-4">
                <h4 className="text-lg font-bold text-gray-900">Date & Time</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                    <input
                      type="date"
                      value={form.start_date}
                      onChange={e => setForm({ ...form, start_date: e.target.value })}
                      required
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                    <input
                      type="time"
                      value={form.start_time}
                      onChange={e => setForm({ ...form, start_time: e.target.value })}
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                    <input
                      type="date"
                      value={form.end_date}
                      onChange={e => setForm({ ...form, end_date: e.target.value })}
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                    <input
                      type="time"
                      value={form.end_time}
                      onChange={e => setForm({ ...form, end_time: e.target.value })}
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
                    />
                  </div>
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location *</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={e => setForm({ ...form, location: e.target.value })}
                  required
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
                />
              </div>

              {/* Contact & Organizer */}
              <div className="space-y-4">
                <h4 className="text-lg font-bold text-gray-900">Contact & Organizer</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
                    <input
                      type="email"
                      value={form.contact_email}
                      onChange={e => setForm({ ...form, contact_email: e.target.value })}
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone</label>
                    <input
                      type="tel"
                      value={form.contact_phone}
                      onChange={e => setForm({ ...form, contact_phone: e.target.value })}
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Organizer Name</label>
                    <input
                      type="text"
                      value={form.organizer_name}
                      onChange={e => setForm({ ...form, organizer_name: e.target.value })}
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Organization</label>
                    <input
                      type="text"
                      value={form.organizer_organization}
                      onChange={e => setForm({ ...form, organizer_organization: e.target.value })}
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Details */}
              <div className="space-y-4">
                <h4 className="text-lg font-bold text-gray-900">Additional Details</h4>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fees</label>
                  <input
                    type="text"
                    value={form.fees}
                    onChange={e => setForm({ ...form, fees: e.target.value })}
                    placeholder="e.g., Free, $10, By donation"
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Registration URL</label>
                  <input
                    type="url"
                    value={form.registration_url}
                    onChange={e => setForm({ ...form, registration_url: e.target.value })}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Accessibility Info</label>
                  <textarea
                    value={form.accessibility_info}
                    onChange={e => setForm({ ...form, accessibility_info: e.target.value })}
                    rows={2}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
                  />
                </div>
              </div>

              {/* Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Event Image</label>
                {imagePreview && (
                  <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded-lg mb-2" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full p-3 border rounded-lg"
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gabriola-green text-white rounded-lg font-medium hover:bg-gabriola-green-dark transition"
                >
                  Update Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && eventToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Delete Event?</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-1">You're about to delete:</p>
              <p className="font-medium text-gray-900">{eventToDelete.title}</p>
              {eventToDelete.attendance_count > 0 && (
                <p className="text-sm text-orange-600 font-medium mt-2">
                  ⚠️ {eventToDelete.attendance_count} people are attending this event
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setEventToDelete(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition"
              >
                Delete Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
