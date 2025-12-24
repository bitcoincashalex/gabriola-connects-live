// app/my-events/page.tsx
// Version: 1.0.3 - REFACTORED: Uses shared EventFormModal component
// Date: 2025-12-22

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import Link from 'next/link';
import { Calendar, MapPin, Users, Edit, Trash2, Plus, Clock, Filter, ArrowUpDown } from 'lucide-react';
import { format, isPast, isFuture, parseISO } from 'date-fns';
import EventFormModal from '@/components/EventFormModal';

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

interface Venue {
  id: string;
  name: string;
  address: string;
  city: string;
  postal_code: string | null;
  map_url: string;
}

interface EventCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
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
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [categories, setCategories] = useState<EventCategory[]>([]);

  useEffect(() => {
    if (user) {
      fetchMyEvents();
      fetchVenues();
      fetchCategories();
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

  const fetchVenues = async () => {
    const { data } = await supabase
      .from('event_venues')
      .select('*')
      .order('name', { ascending: true });
    
    if (data) setVenues(data);
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('event_categories')
      .select('*')
      .order('name', { ascending: true });
    
    if (data) setCategories(data);
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

  const openCreateModal = () => {
    setEditingEvent(null);
    setShowModal(true);
  };

  const openEditModal = (event: Event) => {
    setEditingEvent(event);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingEvent(null);
  };

  const handleSaveEvent = () => {
    fetchMyEvents();
    closeModal();
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
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 bg-gabriola-green text-white px-4 py-2 rounded-lg font-medium hover:bg-gabriola-green-dark transition"
            >
              <Plus className="w-5 h-5" />
              Create Event
            </button>
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
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 bg-gabriola-green text-white px-6 py-3 rounded-lg font-medium hover:bg-gabriola-green-dark transition"
              >
                <Plus className="w-5 h-5" />
                Create Your First Event
              </button>
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

      {/* Shared Event Form Modal */}
      <EventFormModal
        isOpen={showModal}
        onClose={closeModal}
        onSave={handleSaveEvent}
        event={editingEvent}
        venues={venues}
        categories={categories}
        canPublishInstantly={true}
      />

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
