// Path: app/admin/events/page.tsx
// Version: 1.0.0 - Event Admin Dashboard
// Date: 2024-12-10

'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Calendar, 
  Users, 
  Clock, 
  CheckCircle,
  AlertCircle,
  TrendingUp,
  FolderTree,
  Eye,
  MapPin
} from 'lucide-react';

export default function EventAdminDashboard() {
  const { user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEvents: 0,
    upcomingEvents: 0,
    pastEvents: 0,
    pendingApprovals: 0,
    featuredEvents: 0,
    authorizedCreators: 0,
    totalCategories: 0,
    eventsThisMonth: 0,
  });

  useEffect(() => {
    // Check permissions
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

    fetchStats();
  }, [user, router]);

  const fetchStats = async () => {
    setLoading(true);

    try {
      const now = new Date().toISOString();
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      // Total events
      const { count: totalEvents } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

      // Upcoming events
      const { count: upcomingEvents } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .gte('start_date', now)
        .is('deleted_at', null);

      // Past events
      const { count: pastEvents } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .lt('start_date', now)
        .is('deleted_at', null);

      // Pending approvals
      const { count: pendingApprovals } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('is_approved', false)
        .is('deleted_at', null);

      // Featured events
      const { count: featuredEvents } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('is_featured', true)
        .is('deleted_at', null);

      // Authorized creators
      const { count: authorizedCreators } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('can_create_events', true);

      // Total categories
      const { count: totalCategories } = await supabase
        .from('event_categories')
        .select('*', { count: 'exact', head: true });

      // Events this month
      const { count: eventsThisMonth } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', monthStart.toISOString())
        .is('deleted_at', null);

      setStats({
        totalEvents: totalEvents || 0,
        upcomingEvents: upcomingEvents || 0,
        pastEvents: pastEvents || 0,
        pendingApprovals: pendingApprovals || 0,
        featuredEvents: featuredEvents || 0,
        authorizedCreators: authorizedCreators || 0,
        totalCategories: totalCategories || 0,
        eventsThisMonth: eventsThisMonth || 0,
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Calendar className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-xl text-gray-600">Loading Event Admin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-10 h-10 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">Event Admin Dashboard</h1>
          </div>
          <p className="text-gray-600 text-lg">
            Manage events, categories, and authorized creators for Gabriola Connects.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Events */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="w-8 h-8 text-blue-600" />
              <span className="text-3xl font-bold text-gray-900">{stats.totalEvents}</span>
            </div>
            <p className="text-gray-600 font-medium">Total Events</p>
          </div>

          {/* Upcoming Events */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-green-600" />
              <span className="text-3xl font-bold text-gray-900">{stats.upcomingEvents}</span>
            </div>
            <p className="text-gray-600 font-medium">Upcoming Events</p>
          </div>

          {/* Pending Approvals */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="w-8 h-8 text-orange-600" />
              <span className="text-3xl font-bold text-gray-900">{stats.pendingApprovals}</span>
            </div>
            <p className="text-gray-600 font-medium">Pending Approvals</p>
          </div>

          {/* Featured Events */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-8 h-8 text-purple-600" />
              <span className="text-3xl font-bold text-gray-900">{stats.featuredEvents}</span>
            </div>
            <p className="text-gray-600 font-medium">Featured Events</p>
          </div>

          {/* Authorized Creators */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-indigo-600" />
              <span className="text-3xl font-bold text-gray-900">{stats.authorizedCreators}</span>
            </div>
            <p className="text-gray-600 font-medium">Authorized Creators</p>
          </div>

          {/* Categories */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <FolderTree className="w-8 h-8 text-pink-600" />
              <span className="text-3xl font-bold text-gray-900">{stats.totalCategories}</span>
            </div>
            <p className="text-gray-600 font-medium">Event Categories</p>
          </div>

          {/* Past Events */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-gray-600" />
              <span className="text-3xl font-bold text-gray-900">{stats.pastEvents}</span>
            </div>
            <p className="text-gray-600 font-medium">Past Events</p>
          </div>

          {/* Events This Month */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="w-8 h-8 text-teal-600" />
              <span className="text-3xl font-bold text-gray-900">{stats.eventsThisMonth}</span>
            </div>
            <p className="text-gray-600 font-medium">Created This Month</p>
          </div>
        </div>

        {/* Pending Actions Alert */}
        {stats.pendingApprovals > 0 && (
          <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-6 mb-8">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-8 h-8 text-orange-600 flex-shrink-0" />
              <div>
                <h2 className="text-xl font-bold text-orange-900 mb-2">⚠️ Action Required</h2>
                <p className="text-orange-800 mb-4">
                  You have <strong>{stats.pendingApprovals} event{stats.pendingApprovals !== 1 ? 's' : ''}</strong> waiting for approval.
                </p>
                <Link 
                  href="/admin/events/pending"
                  className="inline-block bg-orange-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-orange-700 transition"
                >
                  Review Pending Events
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Pending Approvals */}
            <Link
              href="/admin/events/pending"
              className="flex items-center gap-4 p-4 border-2 border-orange-200 rounded-lg hover:bg-orange-50 hover:border-orange-400 transition group"
            >
              <AlertCircle className="w-8 h-8 text-orange-600 group-hover:scale-110 transition" />
              <div>
                <p className="font-bold text-gray-900">Pending Approvals</p>
                <p className="text-sm text-gray-600">Review submitted events</p>
              </div>
            </Link>

            {/* Manage Creators */}
            <Link
              href="/admin/events/creators"
              className="flex items-center gap-4 p-4 border-2 border-indigo-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-400 transition group"
            >
              <Users className="w-8 h-8 text-indigo-600 group-hover:scale-110 transition" />
              <div>
                <p className="font-bold text-gray-900">Authorized Creators</p>
                <p className="text-sm text-gray-600">Grant event permissions</p>
              </div>
            </Link>

            {/* Manage Categories */}
            <Link
              href="/admin/events/categories"
              className="flex items-center gap-4 p-4 border-2 border-pink-200 rounded-lg hover:bg-pink-50 hover:border-pink-400 transition group"
            >
              <FolderTree className="w-8 h-8 text-pink-600 group-hover:scale-110 transition" />
              <div>
                <p className="font-bold text-gray-900">Event Categories</p>
                <p className="text-sm text-gray-600">Manage categories</p>
              </div>
            </Link>

            {/* View All Events */}
            <Link
              href="/events"
              className="flex items-center gap-4 p-4 border-2 border-green-200 rounded-lg hover:bg-green-50 hover:border-green-400 transition group"
            >
              <Eye className="w-8 h-8 text-green-600 group-hover:scale-110 transition" />
              <div>
                <p className="font-bold text-gray-900">View All Events</p>
                <p className="text-sm text-gray-600">See public calendar</p>
              </div>
            </Link>

            {/* Event Locations */}
            <Link
              href="/admin/events/locations"
              className="flex items-center gap-4 p-4 border-2 border-blue-200 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition group"
            >
              <MapPin className="w-8 h-8 text-blue-600 group-hover:scale-110 transition" />
              <div>
                <p className="font-bold text-gray-900">Common Locations</p>
                <p className="text-sm text-gray-600">Manage venue list</p>
              </div>
            </Link>

            {/* Back to Admin */}
            <Link
              href="/admin/users"
              className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition group"
            >
              <Calendar className="w-8 h-8 text-gray-600 group-hover:scale-110 transition" />
              <div>
                <p className="font-bold text-gray-900">Main Admin Panel</p>
                <p className="text-sm text-gray-600">Back to admin home</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Tips for Event Admins */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-blue-900 mb-4">💡 Event Admin Tips</h2>
          <ul className="space-y-2 text-blue-800">
            <li>• <strong>Review daily:</strong> Check pending approvals to keep events fresh</li>
            <li>• <strong>Feature wisely:</strong> Highlight 3-5 important events at a time</li>
            <li>• <strong>Authorize creators:</strong> Grant permissions to trusted organizations</li>
            <li>• <strong>Curate categories:</strong> Keep categories clear and well-organized</li>
            <li>• <strong>Monitor quality:</strong> Ensure event details are complete and accurate</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
