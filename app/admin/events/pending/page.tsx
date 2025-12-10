// Path: app/admin/events/pending/page.tsx
// Version: 1.0.0 - Event Approval Queue
// Date: 2024-12-10

'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { 
  ArrowLeft,
  CheckCircle,
  XCircle,
  Calendar,
  MapPin,
  User,
  Clock,
  AlertCircle
} from 'lucide-react';

interface PendingEvent {
  id: string;
  title: string;
  description: string;
  start_date: string;
  start_time: string;
  end_time: string;
  location: string;
  venue_name: string;
  category: string;
  created_by: string;
  created_at: string;
  organizer_name: string;
  contact_email: string;
  image_url: string;
  is_featured: boolean;
}

export default function EventApprovalQueue() {
  const { user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pendingEvents, setPendingEvents] = useState<PendingEvent[]>([]);
  const [filter, setFilter] = useState<'all' | 'today' | 'week'>('all');

  useEffect(() => {
    if (!user) {
      router.push('/signin');
      return;
    }

    const isEventAdmin = user.is_super_admin || (user as any).admin_events;
    if (!isEventAdmin) {
      router.push('/');
      alert('Access denied: Event admins only');
      return;
    }

    fetchPendingEvents();
  }, [user, router, filter]);

  const fetchPendingEvents = async () => {
    setLoading(true);

    let query = supabase
      .from('events')
      .select('*')
      .eq('is_approved', false)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    // Apply time filter
    if (filter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      query = query.gte('created_at', today.toISOString());
    } else if (filter === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      query = query.gte('created_at', weekAgo.toISOString());
    }

    const { data, error } = await query;

    if (!error && data) {
      setPendingEvents(data);
    }

    setLoading(false);
  };

  const handleApprove = async (eventId: string) => {
    if (!confirm('Approve this event? It will be visible to all users.')) return;

    const { error } = await supabase
      .from('events')
      .update({ is_approved: true })
      .eq('id', eventId);

    if (error) {
      alert('Failed to approve event');
    } else {
      fetchPendingEvents();
    }
  };

  const handleReject = async (eventId: string) => {
    const reason = prompt('Reason for rejection (will be sent to creator):');
    if (!reason) return;

    // Soft delete the event
    const { error } = await supabase
      .from('events')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user?.id,
        cancellation_reason: reason,
      })
      .eq('id', eventId);

    if (error) {
      alert('Failed to reject event');
    } else {
      // TODO: Send notification to creator about rejection
      fetchPendingEvents();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-xl text-gray-600">Loading pending events...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/admin/events"
            className="inline-flex items-center gap-2 text-blue-600 hover:underline mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </Link>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Event Approval Queue</h1>
              <p className="text-gray-600">Review and approve events submitted by users</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setFilter('week')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'week' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setFilter('today')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'today' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Today
            </button>
          </div>
        </div>

        {/* Pending Events List */}
        {pendingEvents.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-300 mx-auto mb-4" />
            <p className="text-xl text-gray-600">No pending events</p>
            <p className="text-gray-500 mt-2">
              {filter === 'all' 
                ? 'All events have been reviewed!' 
                : `No events submitted in the selected time period`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingEvents.map(event => (
              <div key={event.id} className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{event.title}</h3>
                    
                    {/* Event Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {event.start_date && format(new Date(event.start_date), 'PPP')}
                          {event.start_time && ` at ${event.start_time}`}
                        </span>
                      </div>
                      
                      {event.location && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span>{event.venue_name || event.location}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 text-gray-600">
                        <User className="w-4 h-4" />
                        <span>{event.organizer_name || event.contact_email || 'Unknown'}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>Submitted {format(new Date(event.created_at), 'PPp')}</span>
                      </div>
                    </div>

                    {/* Category */}
                    {event.category && (
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-3">
                        {event.category}
                      </span>
                    )}

                    {/* Description */}
                    <div className="text-gray-700 mb-4 line-clamp-3">
                      {event.description}
                    </div>

                    {/* Image Preview */}
                    {event.image_url && (
                      <div className="mb-4">
                        <img 
                          src={event.image_url} 
                          alt={event.title}
                          className="max-w-xs h-auto rounded-lg border-2 border-gray-200"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                  <Link
                    href={`/events?preview=${event.id}`}
                    target="_blank"
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition text-sm font-medium"
                  >
                    <AlertCircle className="w-4 h-4" />
                    Preview Full Event
                  </Link>
                  
                  <button
                    onClick={() => handleApprove(event.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition text-sm font-medium"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </button>
                  
                  <button
                    onClick={() => handleReject(event.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition text-sm font-medium"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-blue-900 mb-2">ℹ️ About Event Approvals</h3>
          <ul className="space-y-1 text-blue-800 text-sm">
            <li>• <strong>Approve</strong> makes the event visible to all users on the calendar</li>
            <li>• <strong>Reject</strong> removes the event and notifies the creator</li>
            <li>• <strong>Preview</strong> shows how the event will appear on the public calendar</li>
            <li>• Approved events can be edited or removed later if needed</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
