// app/admin/forum/users/page.tsx
// Version: 1.0.0 - User Management Admin Page
// Date: 2025-12-11

'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { 
  Users, Search, Ban, Shield, Eye, EyeOff, 
  MessageSquare, Calendar, Clock, Filter, X,
  ChevronDown, CheckCircle, AlertCircle
} from 'lucide-react';
import Link from 'next/link';

interface UserData {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  last_active_at: string | null;
  is_banned: boolean;
  forum_read_only: boolean;
  forum_moderator: boolean;
  admin_forum: boolean;
  is_super_admin: boolean;
  posts_count: number;
  trust_score: number | null;
  banned_reason: string | null;
  banned_at: string | null;
}

export default function UserManagementPage() {
  const { user } = useUser();
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState<'joined' | 'posts' | 'active'>('joined');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [showBanModal, setShowBanModal] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Check admin access
  const isAdmin = user && (
    (user as any).is_super_admin ||
    (user as any).admin_forum
  );

  useEffect(() => {
    if (!isAdmin) {
      window.location.href = '/';
      return;
    }
    fetchUsers();
  }, [isAdmin]);

  useEffect(() => {
    filterAndSortUsers();
  }, [users, searchQuery, filterRole, filterStatus, sortBy]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, created_at, last_active_at, is_banned, forum_read_only, forum_moderator, admin_forum, is_super_admin, posts_count, trust_score, banned_reason, banned_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortUsers = () => {
    let filtered = [...users];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(u =>
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Role filter
    if (filterRole !== 'all') {
      if (filterRole === 'admin') {
        filtered = filtered.filter(u => u.is_super_admin || u.admin_forum);
      } else if (filterRole === 'moderator') {
        filtered = filtered.filter(u => u.forum_moderator);
      } else if (filterRole === 'regular') {
        filtered = filtered.filter(u => !u.is_super_admin && !u.admin_forum && !u.forum_moderator);
      }
    }

    // Status filter
    if (filterStatus !== 'all') {
      if (filterStatus === 'banned') {
        filtered = filtered.filter(u => u.is_banned);
      } else if (filterStatus === 'read_only') {
        filtered = filtered.filter(u => u.forum_read_only);
      } else if (filterStatus === 'active') {
        filtered = filtered.filter(u => !u.is_banned && !u.forum_read_only);
      }
    }

    // Sort
    if (sortBy === 'joined') {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === 'posts') {
      filtered.sort((a, b) => (b.posts_count || 0) - (a.posts_count || 0));
    } else if (sortBy === 'active') {
      filtered.sort((a, b) => {
        const aDate = a.last_active_at ? new Date(a.last_active_at).getTime() : 0;
        const bDate = b.last_active_at ? new Date(b.last_active_at).getTime() : 0;
        return bDate - aDate;
      });
    }

    setFilteredUsers(filtered);
  };

  const handleBanUser = async () => {
    if (!selectedUser || !banReason.trim()) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          is_banned: true,
          banned_at: new Date().toISOString(),
          banned_by: user?.id,
          banned_reason: banReason
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      // Log action
      await supabase.rpc('log_moderation_action', {
        p_moderator_id: user?.id,
        p_action_type: 'ban_user',
        p_target_type: 'user',
        p_target_id: selectedUser.id,
        p_reason: banReason
      });

      setShowBanModal(false);
      setBanReason('');
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Error banning user:', error);
      alert('Failed to ban user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnbanUser = async (userId: string) => {
    if (!confirm('Are you sure you want to unban this user?')) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({
          is_banned: false,
          banned_at: null,
          banned_by: null,
          banned_reason: null
        })
        .eq('id', userId);

      if (error) throw error;

      // Log action
      await supabase.rpc('log_moderation_action', {
        p_moderator_id: user?.id,
        p_action_type: 'unban_user',
        p_target_type: 'user',
        p_target_id: userId
      });

      fetchUsers();
    } catch (error) {
      console.error('Error unbanning user:', error);
      alert('Failed to unban user');
    }
  };

  const handleToggleReadOnly = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ forum_read_only: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      // Log action
      await supabase.rpc('log_moderation_action', {
        p_moderator_id: user?.id,
        p_action_type: currentStatus ? 'remove_read_only' : 'set_read_only',
        p_target_type: 'user',
        p_target_id: userId
      });

      fetchUsers();
    } catch (error) {
      console.error('Error toggling read-only:', error);
      alert('Failed to update user status');
    }
  };

  const handleToggleModerator = async (userId: string, currentStatus: boolean) => {
    if (!confirm(`Are you sure you want to ${currentStatus ? 'remove' : 'grant'} moderator status?`)) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ forum_moderator: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      // Log action
      await supabase.rpc('log_moderation_action', {
        p_moderator_id: user?.id,
        p_action_type: currentStatus ? 'remove_moderator' : 'make_moderator',
        p_target_type: 'user',
        p_target_id: userId
      });

      fetchUsers();
    } catch (error) {
      console.error('Error toggling moderator:', error);
      alert('Failed to update moderator status');
    }
  };

  if (!isAdmin) {
    return <div className="text-center py-20">Access Denied</div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gabriola-green"></div>
          <p className="mt-4 text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Link href="/admin/forum" className="text-gray-500 hover:text-gray-700">
              Admin
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900">User Management</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">User Management</h1>
          <p className="text-gray-600">Manage user accounts, roles, and permissions</p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600">Total Users</p>
            <p className="text-2xl font-bold text-gray-900">{users.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600">Banned</p>
            <p className="text-2xl font-bold text-red-600">
              {users.filter(u => u.is_banned).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600">Moderators</p>
            <p className="text-2xl font-bold text-purple-600">
              {users.filter(u => u.forum_moderator).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600">Read-Only</p>
            <p className="text-2xl font-bold text-yellow-600">
              {users.filter(u => u.forum_read_only).length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
              />
            </div>

            {/* Role Filter */}
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admins</option>
              <option value="moderator">Moderators</option>
              <option value="regular">Regular Users</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="banned">Banned</option>
              <option value="read_only">Read-Only</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
            >
              <option value="joined">Newest First</option>
              <option value="posts">Most Posts</option>
              <option value="active">Recently Active</option>
            </select>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Roles
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Posts
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((userData) => (
                    <tr key={userData.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gabriola-green rounded-full flex items-center justify-center">
                            <span className="text-white font-bold">
                              {(userData.full_name || userData.email)[0].toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {userData.full_name || 'No Name'}
                            </div>
                            <div className="text-sm text-gray-500">{userData.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {userData.is_super_admin && (
                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                              Super Admin
                            </span>
                          )}
                          {userData.admin_forum && !userData.is_super_admin && (
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                              Forum Admin
                            </span>
                          )}
                          {userData.forum_moderator && !userData.admin_forum && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                              Moderator
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {userData.is_banned ? (
                          <span className="flex items-center gap-1 text-red-600 text-sm">
                            <Ban className="w-4 h-4" />
                            Banned
                          </span>
                        ) : userData.forum_read_only ? (
                          <span className="flex items-center gap-1 text-yellow-600 text-sm">
                            <EyeOff className="w-4 h-4" />
                            Read-Only
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-green-600 text-sm">
                            <CheckCircle className="w-4 h-4" />
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {userData.posts_count || 0}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(userData.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Ban/Unban */}
                          {!userData.is_super_admin && (
                            <>
                              {userData.is_banned ? (
                                <button
                                  onClick={() => handleUnbanUser(userData.id)}
                                  className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 transition"
                                >
                                  Unban
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setSelectedUser(userData);
                                    setShowBanModal(true);
                                  }}
                                  className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 transition"
                                >
                                  Ban
                                </button>
                              )}

                              {/* Read-Only Toggle */}
                              <button
                                onClick={() => handleToggleReadOnly(userData.id, userData.forum_read_only)}
                                className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-sm hover:bg-yellow-200 transition"
                              >
                                {userData.forum_read_only ? 'Allow Post' : 'Read-Only'}
                              </button>

                              {/* Moderator Toggle */}
                              {!userData.admin_forum && (
                                <button
                                  onClick={() => handleToggleModerator(userData.id, userData.forum_moderator)}
                                  className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200 transition"
                                >
                                  {userData.forum_moderator ? 'Remove Mod' : 'Make Mod'}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Results Count */}
        <div className="mt-4 text-sm text-gray-600 text-center">
          Showing {filteredUsers.length} of {users.length} users
        </div>
      </div>

      {/* Ban Modal */}
      {showBanModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowBanModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Ban User</h2>
            <p className="text-gray-600 mb-4">
              You are about to ban <strong>{selectedUser.full_name || selectedUser.email}</strong>
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for ban *
              </label>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Enter reason for banning this user..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleBanUser}
                disabled={!banReason.trim() || actionLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Banning...' : 'Ban User'}
              </button>
              <button
                onClick={() => {
                  setShowBanModal(false);
                  setBanReason('');
                }}
                disabled={actionLoading}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
