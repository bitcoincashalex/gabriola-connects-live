// app/admin/forum/page.tsx
// Version: 1.0.0 - Forum Admin Dashboard
// Date: 2025-12-11

'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { 
  Users, MessageSquare, Flag, Shield, 
  TrendingUp, AlertTriangle, Eye, Ban,
  Clock, Activity
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  totalUsers: number;
  totalPosts: number;
  totalReplies: number;
  bannedUsers: number;
  reportsPending: number;
  reportsToday: number;
  postsToday: number;
  activeUsers: number;
  hiddenPosts: number;
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  moderator: string;
}

export default function ForumAdminDashboard() {
  const { user } = useUser();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  // Check admin access
  const isAdmin = user && (
    (user as any).is_super_admin ||
    (user as any).admin_forum ||
    (user as any).forum_moderator
  );

  const isSuperAdmin = user && (user as any).is_super_admin;
  const isForumAdmin = user && ((user as any).is_super_admin || (user as any).admin_forum);

  useEffect(() => {
    if (!isAdmin) {
      window.location.href = '/';
      return;
    }

    fetchStats();
    fetchRecentActivity();
  }, [isAdmin]);

  const fetchStats = async () => {
    try {
      // Total users
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Total posts
      const { count: totalPosts } = await supabase
        .from('bbs_posts')
        .select('*', { count: 'exact', head: true });

      // Total replies
      const { count: totalReplies } = await supabase
        .from('bbs_replies')
        .select('*', { count: 'exact', head: true });

      // Banned users
      const { count: bannedUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('is_banned', true);

      // Pending reports
      const { count: reportsPending } = await supabase
        .from('bbs_reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Reports today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: reportsToday } = await supabase
        .from('bbs_reports')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      // Posts today
      const { count: postsToday } = await supabase
        .from('bbs_posts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      // Active users (posted/replied in last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data: activePosts } = await supabase
        .from('bbs_posts')
        .select('user_id')
        .gte('created_at', sevenDaysAgo.toISOString());
      
      const uniqueUsers = new Set(activePosts?.map(p => p.user_id) || []);

      // Hidden posts
      const { count: hiddenPosts } = await supabase
        .from('bbs_posts')
        .select('*', { count: 'exact', head: true })
        .eq('is_hidden', true);

      setStats({
        totalUsers: totalUsers || 0,
        totalPosts: totalPosts || 0,
        totalReplies: totalReplies || 0,
        bannedUsers: bannedUsers || 0,
        reportsPending: reportsPending || 0,
        reportsToday: reportsToday || 0,
        postsToday: postsToday || 0,
        activeUsers: uniqueUsers.size,
        hiddenPosts: hiddenPosts || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const { data } = await supabase
        .from('bbs_moderation_logs')
        .select(`
          *,
          users:moderator_id(full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) {
        const activities = data.map(log => ({
          id: log.id,
          type: log.action_type,
          description: formatActivityDescription(log),
          timestamp: log.created_at,
          moderator: (log.users as any)?.full_name || (log.users as any)?.email || 'Unknown'
        }));

        setRecentActivity(activities);
      }
    } catch (error) {
      console.error('Error fetching activity:', error);
    }
  };

  const formatActivityDescription = (log: any): string => {
    const actionMap: Record<string, string> = {
      'hide_post': 'Hidden a post',
      'unhide_post': 'Unhidden a post',
      'delete_post': 'Deleted a post',
      'restore_post': 'Restored a post',
      'pin_post': 'Pinned a post',
      'unpin_post': 'Unpinned a post',
      'global_pin_post': 'Globally pinned a post',
      'ban_user': 'Banned a user',
      'unban_user': 'Unbanned a user',
      'set_read_only': 'Set user to read-only',
      'remove_read_only': 'Removed read-only status',
      'make_moderator': 'Promoted user to moderator',
      'resolve_report': 'Resolved a report'
    };

    return actionMap[log.action_type] || log.action_type;
  };

  if (!isAdmin) {
    return <div className="text-center py-20">Access Denied</div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gabriola-green"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Forum Administration</h1>
          <p className="text-gray-600">Manage users, posts, and community guidelines</p>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Users */}
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.totalUsers.toLocaleString()}</p>
              </div>
              <Users className="w-12 h-12 text-blue-500 opacity-20" />
            </div>
          </div>

          {/* Total Posts */}
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Posts</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.totalPosts.toLocaleString()}</p>
                <p className="text-xs text-green-600 mt-1">+{stats?.postsToday} today</p>
              </div>
              <MessageSquare className="w-12 h-12 text-green-500 opacity-20" />
            </div>
          </div>

          {/* Pending Reports */}
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pending Reports</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.reportsPending}</p>
                <p className="text-xs text-red-600 mt-1">+{stats?.reportsToday} today</p>
              </div>
              <Flag className="w-12 h-12 text-red-500 opacity-20" />
            </div>
          </div>

          {/* Active Users */}
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Active (7 days)</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.activeUsers}</p>
              </div>
              <Activity className="w-12 h-12 text-purple-500 opacity-20" />
            </div>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Replies</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalReplies.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Eye className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Hidden Posts</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.hiddenPosts}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <Ban className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Banned Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.bannedUsers}</p>
            </div>
          </div>
        </div>

        {/* Quick Actions & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              
              <Link
                href="/admin/forum/reports"
                className="flex items-center justify-between p-4 bg-red-50 hover:bg-red-100 rounded-lg transition"
              >
                <div className="flex items-center gap-3">
                  <Flag className="w-5 h-5 text-red-600" />
                  <span className="font-medium text-gray-900">Review Reports</span>
                </div>
                {stats && stats.reportsPending > 0 && (
                  <span className="px-3 py-1 bg-red-600 text-white text-sm rounded-full">
                    {stats.reportsPending}
                  </span>
                )}
              </Link>

              {isForumAdmin && (
                <Link
                  href="/admin/forum/users"
                  className="flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-gray-900">Manage Users</span>
                  </div>
                </Link>
              )}

              <Link
                href="/admin/forum/posts"
                className="flex items-center justify-between p-4 bg-green-50 hover:bg-green-100 rounded-lg transition"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-gray-900">Moderate Posts</span>
                </div>
              </Link>

              {isForumAdmin && (
                <Link
                  href="/admin/forum/categories"
                  className="flex items-center justify-between p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-purple-600" />
                    <span className="font-medium text-gray-900">Manage Categories</span>
                  </div>
                </Link>
              )}

              <Link
                href="/admin/forum/logs"
                className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900">View Activity Logs</span>
                </div>
              </Link>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
            <div className="space-y-3">
              {recentActivity.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No recent moderation activity</p>
              ) : (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-gabriola-green rounded-full flex items-center justify-center flex-shrink-0">
                      <Shield className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                      <p className="text-xs text-gray-600">
                        by {activity.moderator} • {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
