// Path: app/admin/users/page.tsx
// Version: 3.0.5 - All TypeScript fixes (profile_photo, icon title, email undefined)
// Date: 2024-12-10

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { User } from '@/lib/types';
import { 
  Shield, Calendar, Mail, MapPin, CheckCircle, XCircle, 
  Eye, X, Clock, Activity, Lock, Unlock, LogOut, 
  MessageSquare, FileText, CalendarDays, AlertTriangle,
  UserX, UserCheck, Loader2
} from 'lucide-react';

export default function AdminUsersPage() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      // SUPER ADMIN ONLY - no other admins allowed
      if (!user?.is_super_admin) {
        router.push('/');
        alert('Access denied: Super Admin only');
      } else {
        fetchUsers();
        
        // Auto-refresh every 30 seconds to show active users
        const interval = setInterval(fetchUsers, 30000);
        return () => clearInterval(interval);
      }
    }
  }, [user, authLoading, router]);

  const fetchUsers = async () => {
    // Fetch from the view that includes activity stats
    const { data, error } = await supabase
      .from('user_admin_stats')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setUsers(data as User[]);
    }
    setLoading(false);
  };

  const updatePermission = async (userId: string, field: string, value: any) => {
    const { error } = await supabase
      .from('users')
      .update({ [field]: value })
      .eq('id', userId);

    if (!error) {
      await fetchUsers();
    } else {
      alert('Error updating permission: ' + error.message);
    }
  };

  const forceLogout = async (userId: string, userName: string) => {
    if (!confirm(`Force logout ${userName}? This will end their current session.`)) return;
    
    setActionLoading(userId);
    
    // Clear their session data
    const { error } = await supabase
      .from('users')
      .update({ 
        current_session_id: null,
        session_started_at: null
      })
      .eq('id', userId);

    if (!error) {
      // In production, you'd also revoke their JWT token via Supabase Admin API
      alert(`${userName} has been logged out successfully`);
      await fetchUsers();
    } else {
      alert('Error logging out user: ' + error.message);
    }
    
    setActionLoading(null);
  };

  const toggleAccountLock = async (userId: string, userName: string, isCurrentlyLocked: boolean) => {
    const action = isCurrentlyLocked ? 'unlock' : 'lock';
    const reason = isCurrentlyLocked ? null : prompt(`Reason for locking ${userName}'s account:`);
    
    if (!isCurrentlyLocked && !reason) return; // Canceled or no reason
    
    setActionLoading(userId);
    
    const { error } = await supabase
      .from('users')
      .update({ 
        account_locked: !isCurrentlyLocked,
        locked_reason: reason,
        locked_at: !isCurrentlyLocked ? new Date().toISOString() : null,
        locked_by: !isCurrentlyLocked ? user!.id : null
      })
      .eq('id', userId);

    if (!error) {
      alert(`Account ${action}ed successfully`);
      await fetchUsers();
    } else {
      alert(`Error: ${error.message}`);
    }
    
    setActionLoading(null);
  };

  const toggleSuspension = async (userId: string, userName: string, isCurrentlySuspended: boolean) => {
    if (isCurrentlySuspended) {
      // Unsuspend
      setActionLoading(userId);
      const { error } = await supabase
        .from('users')
        .update({ 
          is_suspended: false,
          suspension_reason: null,
          suspended_until: null
        })
        .eq('id', userId);

      if (!error) {
        alert(`${userName} unsuspended successfully`);
        await fetchUsers();
      }
      setActionLoading(null);
    } else {
      // Suspend
      const reason = prompt(`Reason for suspending ${userName}:`);
      if (!reason) return;
      
      const days = prompt('Suspend for how many days? (0 = permanent)', '7');
      if (!days) return;
      
      setActionLoading(userId);
      
      const suspendedUntil = parseInt(days) > 0 
        ? new Date(Date.now() + parseInt(days) * 24 * 60 * 60 * 1000).toISOString()
        : null;
      
      const { error } = await supabase
        .from('users')
        .update({ 
          is_suspended: true,
          suspension_reason: reason,
          suspended_until: suspendedUntil
        })
        .eq('id', userId);

      if (!error) {
        alert(`${userName} suspended successfully`);
        await fetchUsers();
      }
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatRelativeTime = (dateString: string | null) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const isUserOnline = (lastActivity: string | null) => {
    if (!lastActivity) return false;
    const diffMs = new Date().getTime() - new Date(lastActivity).getTime();
    return diffMs < 5 * 60 * 1000; // Online if active within 5 minutes
  };

  const calculateProfileCompleteness = (user: User) => {
    let score = 0;
    if (user.full_name) score += 20;
    if (user.bio) score += 15;
    if (user.postal_code) score += 15;
    if ((user as any).profile_photo) score += 20;
    if (user.avatar_url) score += 10;
    if ((user as any).phone_number) score += 20;
    return score;
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.postal_code?.toLowerCase().includes(search.toLowerCase())
  );

  const selectedUser = selectedUserId ? users.find(u => u.id === selectedUserId) : null;

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-12 h-12 text-gabriola-green animate-spin" />
    </div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gabriola-green flex items-center gap-3">
            <Shield className="w-10 h-10" />
            User Management
          </h1>
          <p className="text-gray-600 mt-2">{users.length} total users</p>
        </div>
        <button
          onClick={() => router.push('/')}
          className="text-blue-600 hover:underline"
        >
          ← Back to Home
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <Activity className="w-8 h-8 text-green-600" />
            <span className="text-2xl font-bold">
              {users.filter(u => isUserOnline((u as any).last_activity_at)).length}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-2">Online Now</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <CheckCircle className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold">
              {users.filter(u => u.is_resident).length}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-2">Verified Residents</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <Lock className="w-8 h-8 text-orange-600" />
            <span className="text-2xl font-bold">
              {users.filter(u => (u as any).account_locked || u.is_banned).length}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-2">Locked/Banned</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <Calendar className="w-8 h-8 text-purple-600" />
            <span className="text-2xl font-bold">
              {users.filter(u => {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return new Date(u.created_at) > weekAgo;
              }).length}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-2">New This Week</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by name, email, or postal code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:outline-none"
        />
      </div>

      {/* User List */}
      <div className="space-y-4">
        {filteredUsers.map(u => {
          const isOnline = isUserOnline((u as any).last_activity_at);
          const profileScore = calculateProfileCompleteness(u);
          const isLocked = (u as any).account_locked;
          const isSuspended = (u as any).is_suspended;
          
          return (
            <div key={u.id} className={`bg-white rounded-lg shadow-md p-6 ${isLocked ? 'border-l-4 border-orange-500' : ''} ${isSuspended ? 'border-l-4 border-red-500' : ''}`}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  {/* User Header Info */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="relative">
                      {u.avatar_url ? (
                        <img 
                          src={u.avatar_url} 
                          alt={u.full_name || 'User'} 
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gabriola-green text-white flex items-center justify-center text-2xl font-bold">
                          {u.full_name?.charAt(0) || '?'}
                        </div>
                      )}
                      {/* Online indicator */}
                      {isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-4 border-white rounded-full" 
                             title="Online now"
                        />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold text-gray-900">{u.full_name || 'No name'}</h3>
                        {isOnline && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                            ONLINE
                          </span>
                        )}
                      </div>
                      
                      {/* Email */}
                      <div className="flex items-center gap-2 text-gray-600 mt-1">
                        <Mail className="w-4 h-4" />
                        <span>{u.email}</span>
                        {(u as any).email_verified && (
                          <span title="Email verified">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          </span>
                        )}
                      </div>
                      
                      {/* Postal Code */}
                      {u.postal_code && (
                        <div className="flex items-center gap-2 text-gray-600 mt-1">
                          <MapPin className="w-4 h-4" />
                          <span>{u.postal_code}</span>
                        </div>
                      )}
                      
                      {/* Joined Date */}
                      <div className="flex items-center gap-2 text-gray-600 mt-1">
                        <Calendar className="w-4 h-4" />
                        <span>Joined: {formatDate(u.created_at)}</span>
                      </div>
                      
                      {/* Last Login */}
                      <div className="flex items-center gap-2 text-gray-600 mt-1">
                        <Clock className="w-4 h-4" />
                        <span>Last login: {formatRelativeTime((u as any).last_sign_in_at)}</span>
                      </div>
                      
                      {/* Activity Stats */}
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                        <span title="Forum posts">💬 {(u as any).post_count || 0} posts</span>
                        <span title="Events created">📅 {(u as any).event_count || 0} events</span>
                        <span title="Messages sent">✉️ {(u as any).message_count || 0} messages</span>
                        <span title="Profile completeness">👤 {profileScore}% complete</span>
                      </div>
                      
                      {/* Resident Status */}
                      <div className="flex items-center gap-2 mt-2">
                        {u.is_resident ? (
                          <>
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span className="font-medium text-green-700">Verified Resident</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-5 h-5 text-gray-400" />
                            <span className="text-gray-600">Not Resident</span>
                          </>
                        )}
                      </div>

                      {/* Locked/Suspended Warnings */}
                      {isLocked && (
                        <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded flex items-start gap-2">
                          <Lock className="w-4 h-4 text-orange-600 mt-0.5" />
                          <div className="text-sm">
                            <p className="font-bold text-orange-900">Account Locked</p>
                            <p className="text-orange-700">{(u as any).locked_reason}</p>
                            <p className="text-xs text-orange-600 mt-1">
                              Locked: {formatRelativeTime((u as any).locked_at)}
                            </p>
                          </div>
                        </div>
                      )}

                      {isSuspended && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                          <div className="text-sm">
                            <p className="font-bold text-red-900">Account Suspended</p>
                            <p className="text-red-700">{(u as any).suspension_reason}</p>
                            {(u as any).suspended_until && (
                              <p className="text-xs text-red-600 mt-1">
                                Until: {formatDate((u as any).suspended_until)}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Badges/Permissions Row */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {u.is_super_admin && (
                      <span className="px-3 py-1 bg-red-600 text-white rounded-full text-sm font-bold">
                        Super Admin
                      </span>
                    )}
                    {u.is_banned && (
                      <span className="px-3 py-1 bg-red-600 text-white rounded-full text-sm font-bold">
                        ⛔ BANNED
                      </span>
                    )}
                    {(u as any).forum_read_only && (
                      <span className="px-3 py-1 bg-yellow-500 text-white rounded-full text-sm font-bold">
                        Read Only
                      </span>
                    )}
                    {u.can_issue_alerts && (
                      <span className="px-3 py-1 bg-orange-600 text-white rounded-full text-sm">
                        Can Issue Alerts ({(u as any).alert_level_permission})
                      </span>
                    )}
                    {u.can_create_events && (
                      <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm">
                        Event Creator
                      </span>
                    )}
                    {(u as any).admin_events && (
                      <span className="px-3 py-1 bg-purple-600 text-white rounded-full text-sm">
                        Event Admin
                      </span>
                    )}
                    {(u as any).admin_forum && (
                      <span className="px-3 py-1 bg-indigo-600 text-white rounded-full text-sm">
                        Forum Admin
                      </span>
                    )}
                    {(u as any).admin_directory && (
                      <span className="px-3 py-1 bg-green-600 text-white rounded-full text-sm">
                        Directory Admin
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="ml-4 flex flex-col gap-2">
                  {/* Send Message */}
                  <button
                    onClick={() => router.push(`/messages/new?to=${u.id}`)}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm whitespace-nowrap"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Message
                  </button>

                  {/* View Profile */}
                  <button
                    onClick={() => router.push(`/profile/${u.id}`)}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm whitespace-nowrap"
                  >
                    <Eye className="w-4 h-4" />
                    Profile
                  </button>

                  {/* Force Logout */}
                  {isOnline && (
                    <button
                      onClick={() => forceLogout(u.id, u.full_name || u.email || 'User')}
                      disabled={actionLoading === u.id}
                      className="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2 text-sm whitespace-nowrap disabled:opacity-50"
                    >
                      {actionLoading === u.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <LogOut className="w-4 h-4" />
                      )}
                      Logout
                    </button>
                  )}

                  {/* Lock/Unlock */}
                  <button
                    onClick={() => toggleAccountLock(u.id, u.full_name || u.email || 'User', isLocked)}
                    disabled={actionLoading === u.id}
                    className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm whitespace-nowrap disabled:opacity-50 ${
                      isLocked 
                        ? 'bg-green-600 text-white hover:bg-green-700' 
                        : 'bg-orange-600 text-white hover:bg-orange-700'
                    }`}
                  >
                    {actionLoading === u.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isLocked ? (
                      <Unlock className="w-4 h-4" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                    {isLocked ? 'Unlock' : 'Lock'}
                  </button>

                  {/* Suspend/Unsuspend */}
                  <button
                    onClick={() => toggleSuspension(u.id, u.full_name || u.email || 'User', isSuspended)}
                    disabled={actionLoading === u.id}
                    className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm whitespace-nowrap disabled:opacity-50 ${
                      isSuspended 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    {actionLoading === u.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isSuspended ? (
                      <UserCheck className="w-4 h-4" />
                    ) : (
                      <UserX className="w-4 h-4" />
                    )}
                    {isSuspended ? 'Unsuspend' : 'Suspend'}
                  </button>

                  {/* Email User */}
                  <button
                    onClick={() => window.location.href = `mailto:${u.email}`}
                    className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 text-sm whitespace-nowrap"
                  >
                    <Mail className="w-4 h-4" />
                    Email
                  </button>

                  {/* Edit All */}
                  <button
                    onClick={() => setSelectedUserId(u.id)}
                    className="px-3 py-2 bg-gabriola-green text-white rounded-lg hover:bg-gabriola-green-dark text-sm whitespace-nowrap"
                  >
                    Edit All
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full Edit Modal - Keep your existing modal code here */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Edit: {selectedUser.full_name}</h2>
              <button onClick={() => setSelectedUserId(null)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* User Info Summary */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div><strong>Email:</strong> {selectedUser.email}</div>
                <div><strong>Postal Code:</strong> {selectedUser.postal_code || 'Not provided'}</div>
                <div><strong>Joined:</strong> {formatDate(selectedUser.created_at)}</div>
                <div><strong>Last Login:</strong> {formatRelativeTime((selectedUser as any).last_sign_in_at)}</div>
                <div><strong>Resident:</strong> {selectedUser.is_resident ? '✅ Yes' : '❌ No'}</div>
                <div><strong>Profile:</strong> {calculateProfileCompleteness(selectedUser)}% complete</div>
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium mb-2">Role</label>
                <select
                  value={selectedUser.role}
                  onChange={(e) => updatePermission(selectedUser.id, 'role', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="user">User</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Super Admin */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="super-admin"
                  checked={selectedUser.is_super_admin || false}
                  onChange={(e) => updatePermission(selectedUser.id, 'is_super_admin', e.target.checked)}
                  className="w-5 h-5 cursor-pointer"
                />
                <label htmlFor="super-admin" className="font-medium cursor-pointer">Super Admin (full system access)</label>
              </div>

              {/* Forum Permissions */}
              <div className="border-t pt-4">
                <h3 className="font-bold mb-3">Forum Permissions</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="admin-forum"
                      checked={(selectedUser as any).admin_forum || false}
                      onChange={(e) => updatePermission(selectedUser.id, 'admin_forum', e.target.checked)}
                      className="w-5 h-5 cursor-pointer"
                    />
                    <label htmlFor="admin-forum" className="cursor-pointer">Forum Admin (full forum control)</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="can-post"
                      checked={selectedUser.can_post || false}
                      onChange={(e) => updatePermission(selectedUser.id, 'can_post', e.target.checked)}
                      className="w-5 h-5 cursor-pointer"
                    />
                    <label htmlFor="can-post" className="cursor-pointer">Can post to forums</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="forum-read-only"
                      checked={(selectedUser as any).forum_read_only || false}
                      onChange={(e) => updatePermission(selectedUser.id, 'forum_read_only', e.target.checked)}
                      className="w-5 h-5 cursor-pointer"
                    />
                    <label htmlFor="forum-read-only" className="cursor-pointer text-orange-700">Forum Read-Only</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="is-banned"
                      checked={selectedUser.is_banned || false}
                      onChange={(e) => updatePermission(selectedUser.id, 'is_banned', e.target.checked)}
                      className="w-5 h-5 cursor-pointer"
                    />
                    <label htmlFor="is-banned" className="cursor-pointer text-red-700 font-bold">BANNED</label>
                  </div>
                </div>
              </div>

              {/* Event Permissions */}
              <div className="border-t pt-4">
                <h3 className="font-bold mb-3">Event Permissions</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="admin-events"
                      checked={(selectedUser as any).admin_events || false}
                      onChange={(e) => updatePermission(selectedUser.id, 'admin_events', e.target.checked)}
                      className="w-5 h-5 cursor-pointer"
                    />
                    <label htmlFor="admin-events" className="cursor-pointer">Event Admin</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="create-events"
                      checked={selectedUser.can_create_events || false}
                      onChange={(e) => updatePermission(selectedUser.id, 'can_create_events', e.target.checked)}
                      className="w-5 h-5 cursor-pointer"
                    />
                    <label htmlFor="create-events" className="cursor-pointer">Can create events</label>
                  </div>
                </div>
              </div>

              {/* Directory Permissions */}
              <div className="border-t pt-4">
                <h3 className="font-bold mb-3">Directory Permissions</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="admin-directory"
                      checked={(selectedUser as any).admin_directory || false}
                      onChange={(e) => updatePermission(selectedUser.id, 'admin_directory', e.target.checked)}
                      className="w-5 h-5 cursor-pointer"
                    />
                    <label htmlFor="admin-directory" className="cursor-pointer">Directory Admin</label>
                  </div>
                </div>
              </div>

              {/* Alert Permissions */}
              <div className="border-t pt-4">
                <h3 className="font-bold mb-3">Alert Permissions</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="issue-alerts"
                      checked={selectedUser.can_issue_alerts || false}
                      onChange={(e) => updatePermission(selectedUser.id, 'can_issue_alerts', e.target.checked)}
                      className="w-5 h-5 cursor-pointer"
                    />
                    <label htmlFor="issue-alerts" className="cursor-pointer">Can issue alerts</label>
                  </div>
                  {selectedUser.can_issue_alerts && (
                    <div className="ml-8">
                      <label className="block text-sm mb-1">Maximum alert level:</label>
                      <select
                        value={(selectedUser as any).alert_level_permission || 'none'}
                        onChange={(e) => updatePermission(selectedUser.id, 'alert_level_permission', e.target.value)}
                        className="px-4 py-2 border rounded-lg"
                      >
                        <option value="none">None</option>
                        <option value="info">Info</option>
                        <option value="advisory">Advisory</option>
                        <option value="warning">Warning</option>
                        <option value="emergency">Emergency</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
