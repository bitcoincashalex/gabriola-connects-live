// Path: app/mod/page.tsx
// Version: 1.0.0 - Moderator Dashboard
// Date: 2024-12-09

'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Shield, 
  FolderTree, 
  Flag, 
  Eye, 
  EyeOff, 
  Users, 
  Activity,
  MessageSquare,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

export default function ModeratorDashboard() {
  const { user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalThreads: 0,
    totalReplies: 0,
    hiddenThreads: 0,
    reportedPosts: 0,
    todayThreads: 0,
    activeUsers: 0,
  });

  useEffect(() => {
    // Check permissions
    if (!user) {
      router.push('/signin');
      return;
    }

    const isModerator = (user as any).forum_moderator || (user as any).admin_forum || user.is_super_admin;
    if (!isModerator) {
      router.push('/');
      alert('Access denied: Moderators only');
      return;
    }

    fetchStats();
  }, [user, router]);

  const fetchStats = async () => {
    setLoading(true);

    try {
      // Total threads
      const { count: totalThreads } = await supabase
        .from('bbs_posts')
        .select('*', { count: 'exact', head: true });

      // Total replies
      const { count: totalReplies } = await supabase
        .from('bbs_replies')
        .select('*', { count: 'exact', head: true });

      // Hidden threads (is_active = false)
      const { count: hiddenThreads } = await supabase
        .from('bbs_posts')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', false);

      // Reported posts (reported_count > 0)
      const { count: reportedPosts } = await supabase
        .from('bbs_posts')
        .select('*', { count: 'exact', head: true })
        .gt('reported_count', 0)
        .eq('is_active', true);

      // Today's threads
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: todayThreads } = await supabase
        .from('bbs_posts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      // Active users (users who posted in last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data: activePosts } = await supabase
        .from('bbs_posts')
        .select('user_id')
        .gte('created_at', sevenDaysAgo.toISOString());

      const uniqueUsers = new Set(activePosts?.map(p => p.user_id) || []);

      setStats({
        totalThreads: totalThreads || 0,
        totalReplies: totalReplies || 0,
        hiddenThreads: hiddenThreads || 0,
        reportedPosts: reportedPosts || 0,
        todayThreads: todayThreads || 0,
        activeUsers: uniqueUsers.size,
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
          <Shield className="w-16 h-16 text-purple-600 mx-auto mb-4 animate-pulse" />
          <p className="text-xl text-gray-600">Loading Moderator Panel...</p>
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
            <Shield className="w-10 h-10 text-purple-600" />
            <h1 className="text-4xl font-bold text-gray-900">Moderator Dashboard</h1>
          </div>
          <p className="text-gray-600 text-lg">
            Welcome back, {(user as any)?.full_name || 'Moderator'}! Here's what's happening in the forum.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Total Threads */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <MessageSquare className="w-8 h-8 text-blue-600" />
              <span className="text-3xl font-bold text-gray-900">{stats.totalThreads}</span>
            </div>
            <p className="text-gray-600 font-medium">Total Threads</p>
          </div>

          {/* Total Replies */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-8 h-8 text-green-600" />
              <span className="text-3xl font-bold text-gray-900">{stats.totalReplies}</span>
            </div>
            <p className="text-gray-600 font-medium">Total Replies</p>
          </div>

          {/* Today's Threads */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-purple-600" />
              <span className="text-3xl font-bold text-gray-900">{stats.todayThreads}</span>
            </div>
            <p className="text-gray-600 font-medium">Threads Today</p>
          </div>

          {/* Active Users */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-indigo-600" />
              <span className="text-3xl font-bold text-gray-900">{stats.activeUsers}</span>
            </div>
            <p className="text-gray-600 font-medium">Active Users (7d)</p>
          </div>

          {/* Hidden Threads */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <EyeOff className="w-8 h-8 text-orange-600" />
              <span className="text-3xl font-bold text-gray-900">{stats.hiddenThreads}</span>
            </div>
            <p className="text-gray-600 font-medium">Hidden Threads</p>
          </div>

          {/* Reported Posts */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <span className="text-3xl font-bold text-gray-900">{stats.reportedPosts}</span>
            </div>
            <p className="text-gray-600 font-medium">Reported Posts</p>
          </div>
        </div>

        {/* Pending Actions */}
        {stats.reportedPosts > 0 && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 mb-8">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-8 h-8 text-red-600 flex-shrink-0" />
              <div>
                <h2 className="text-xl font-bold text-red-900 mb-2">⚠️ Action Required</h2>
                <p className="text-red-800 mb-4">
                  You have <strong>{stats.reportedPosts} reported post{stats.reportedPosts !== 1 ? 's' : ''}</strong> waiting for review.
                </p>
                <Link 
                  href="/mod/reports"
                  className="inline-block bg-red-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-700 transition"
                >
                  Review Reports
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Manage Categories */}
            <Link
              href="/mod/categories"
              className="flex items-center gap-4 p-4 border-2 border-purple-200 rounded-lg hover:bg-purple-50 hover:border-purple-400 transition group"
            >
              <FolderTree className="w-8 h-8 text-purple-600 group-hover:scale-110 transition" />
              <div>
                <p className="font-bold text-gray-900">Manage Categories</p>
                <p className="text-sm text-gray-600">Create, edit, or archive</p>
              </div>
            </Link>

            {/* View Reports */}
            <Link
              href="/mod/reports"
              className="flex items-center gap-4 p-4 border-2 border-red-200 rounded-lg hover:bg-red-50 hover:border-red-400 transition group"
            >
              <Flag className="w-8 h-8 text-red-600 group-hover:scale-110 transition" />
              <div>
                <p className="font-bold text-gray-900">View Reports</p>
                <p className="text-sm text-gray-600">Review flagged content</p>
              </div>
            </Link>

            {/* Hidden Content */}
            <Link
              href="/mod/hidden"
              className="flex items-center gap-4 p-4 border-2 border-orange-200 rounded-lg hover:bg-orange-50 hover:border-orange-400 transition group"
            >
              <EyeOff className="w-8 h-8 text-orange-600 group-hover:scale-110 transition" />
              <div>
                <p className="font-bold text-gray-900">Hidden Content</p>
                <p className="text-sm text-gray-600">Restore or delete</p>
              </div>
            </Link>

            {/* User Management */}
            <Link
              href="/mod/users"
              className="flex items-center gap-4 p-4 border-2 border-blue-200 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition group"
            >
              <Users className="w-8 h-8 text-blue-600 group-hover:scale-110 transition" />
              <div>
                <p className="font-bold text-gray-900">User Management</p>
                <p className="text-sm text-gray-600">Ban, mute, or review</p>
              </div>
            </Link>

            {/* Moderation Log */}
            <Link
              href="/mod/log"
              className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition group"
            >
              <Activity className="w-8 h-8 text-gray-600 group-hover:scale-110 transition" />
              <div>
                <p className="font-bold text-gray-900">Moderation Log</p>
                <p className="text-sm text-gray-600">Recent actions</p>
              </div>
            </Link>

            {/* Back to Forum */}
            <Link
              href="/community"
              className="flex items-center gap-4 p-4 border-2 border-green-200 rounded-lg hover:bg-green-50 hover:border-green-400 transition group"
            >
              <Eye className="w-8 h-8 text-green-600 group-hover:scale-110 transition" />
              <div>
                <p className="font-bold text-gray-900">View Forum</p>
                <p className="text-sm text-gray-600">Return to discussions</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Tips for Moderators */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-blue-900 mb-4">💡 Moderator Tips</h2>
          <ul className="space-y-2 text-blue-800">
            <li>• <strong>Hide, don't delete:</strong> Use soft delete (hide) to preserve content for review</li>
            <li>• <strong>Check reports daily:</strong> Quick action keeps the community safe</li>
            <li>• <strong>Document actions:</strong> Add notes when hiding content for future reference</li>
            <li>• <strong>Be consistent:</strong> Apply rules fairly across all users</li>
            <li>• <strong>Communicate:</strong> Let users know why content was moderated when appropriate</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
