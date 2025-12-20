// ============================================================================
// ADMIN USERS PAGE - Paginated User Management with Full Features
// ============================================================================
// Path: app/admin/users/page.tsx
// Version: 5.0.1 - Performance: Removed auto-refresh, added manual refresh, debounced search
// Created: 2025-12-18
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { 
  Shield, Search, Filter, ChevronLeft, ChevronRight,
  Activity, Clock, Mail, MapPin, CheckCircle, XCircle,
  Loader2, AlertCircle, Eye, X, Lock, Unlock, LogOut,
  MessageSquare, UserX, UserCheck, Ban, Calendar
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  bio?: string;
  postal_code?: string;
  phone_number?: string;
  profile_photo?: string;
  
  role?: string;
  is_super_admin: boolean;
  admin_events: boolean;
  admin_bbs: boolean;
  admin_forum?: boolean;
  admin_directory?: boolean;
  admin_alerts?: boolean;
  admin_ferry?: boolean;
  admin_users?: boolean;
  
  is_banned: boolean;
  is_suspended?: boolean;
  account_locked: boolean;
  forum_read_only?: boolean;
  forum_banned?: boolean;
  
  can_post?: boolean;
  can_create_events?: boolean;
  can_issue_alerts?: boolean;
  alert_level_permission?: string;
  
  is_resident?: boolean;
  
  created_at: string;
  last_sign_in_at: string | null;
  last_activity_at: string | null;
  
  is_online: boolean;
  
  last_activity?: {
    type: string;
    details: any;
    timestamp: string;
    formatted: string;
  } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

type FilterType = 'all' | 'admins' | 'banned' | 'online';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AdminUsersPage() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();

  // State
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Pagination & Filters
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
    hasMore: false
  });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  
  // Modal
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // ========================================================================
  // AUTH CHECK
  // ========================================================================

  useEffect(() => {
    if (!authLoading) {
      if (!user?.is_super_admin) {
        router.push('/');
        alert('Access denied: Super Admin only');
      } else {
        fetchUsers();
        // Manual refresh only - no auto-refresh
      }
    }
  }, [user, authLoading, router]);

  // Debounced search - only fetch after user stops typing for 500ms
  useEffect(() => {
    if (user?.is_super_admin) {
      const timeoutId = setTimeout(() => {
        fetchUsers();
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [search]);

  // Immediate fetch when page or filter changes
  useEffect(() => {
    if (user?.is_super_admin) {
      fetchUsers();
    }
  }, [pagination.page, filter]);

  // ========================================================================
  // FETCH USERS VIA API ROUTE
  // ========================================================================

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get auth token for API request
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      // Call our API route
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
        filter,
      });

      const response = await fetch(`/api/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch users');
      }

      const data = await response.json();
      
      setUsers(data.users);
      setPagination(prev => ({
        ...prev,
        ...data.pagination
      }));

    } catch (err) {
      console.error('[Admin] Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // ========================================================================
  // PERMISSION UPDATES
  // ========================================================================

  const updatePermission = async (userId: string, field: string, value: any) => {
    try {
      console.log(`[Admin] Updating ${field} = ${value} for user ${userId}`);
      
      // Optimistic update
      setUsers(prevUsers => prevUsers.map(u => 
        u.id === userId ? { ...u, [field]: value } : u
      ));

      // Update database
      const { error } = await supabase
        .from('users')
        .update({ [field]: value })
        .eq('id', userId);

      if (error) {
        console.error('[Admin] Update failed:', error);
        alert(`Failed to save: ${error.message}`);
        // Revert
        await fetchUsers();
      } else {
        console.log('[Admin] ✅ Update successful');
      }
    } catch (err) {
      console.error('[Admin] Unexpected error:', err);
      await fetchUsers();
    }
  };

  // ========================================================================
  // ACTION FUNCTIONS
  // ========================================================================

  const forceLogout = async (userId: string, userName: string) => {
    if (!confirm(`Force logout ${userName}? This will end their current session.`)) return;
    
    setActionLoading(userId);
    
    const { error } = await supabase
      .from('users')
      .update({ 
        current_session_id: null,
        session_started_at: null
      })
      .eq('id', userId);

    if (!error) {
      alert(`${userName} has been logged out successfully`);
      await fetchUsers();
    } else {
      alert(`Failed to logout user: ${error.message}`);
    }
    
    setActionLoading(null);
  };

  const toggleAccountLock = async (userId: string, userName: string, isLocked: boolean) => {
    if (!confirm(`${isLocked ? 'Unlock' : 'Lock'} account for ${userName}?`)) return;
    
    setActionLoading(userId);
    await updatePermission(userId, 'account_locked', !isLocked);
    setActionLoading(null);
  };

  const toggleSuspension = async (userId: string, userName: string, isSuspended: boolean) => {
    if (!confirm(`${isSuspended ? 'Unsuspend' : 'Suspend'} ${userName}?`)) return;
    
    setActionLoading(userId);
    await updatePermission(userId, 'is_suspended', !isSuspended);
    setActionLoading(null);
  };

  // ========================================================================
  // HELPER FUNCTIONS
  // ========================================================================

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatRelativeTime = (dateString: string | null): string => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = Date.now();
    const diff = now - date.getTime();
    
    if (diff < 60 * 1000) return 'Just now';
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}m ago`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}h ago`;
    if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / (24 * 60 * 60 * 1000))}d ago`;
    
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const calculateProfileCompleteness = (user: AdminUser) => {
    let score = 0;
    if (user.full_name) score += 20;
    if (user.bio) score += 15;
    if (user.postal_code) score += 15;
    if (user.profile_photo) score += 20;
    if (user.avatar_url) score += 10;
    if (user.phone_number) score += 20;
    return score;
  };

  // ========================================================================
  // PAGINATION CONTROLS
  // ========================================================================

  const nextPage = () => {
    if (pagination.hasMore) {
      setPagination(prev => ({ ...prev, page: prev.page + 1 }));
    }
  };

  const prevPage = () => {
    if (pagination.page > 1) {
      setPagination(prev => ({ ...prev, page: prev.page - 1 }));
    }
  };

  const goToPage = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  // ========================================================================
  // RENDER
  // ========================================================================

  const selectedUser = selectedUserId ? users.find(u => u.id === selectedUserId) : null;

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-gabriola-green animate-spin" />
      </div>
    );
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
          <p className="text-gray-600 mt-2">
            {pagination.total} total users • Page {pagination.page} of {pagination.totalPages}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setLoading(true);
              fetchUsers();
            }}
            disabled={loading}
            className="px-4 py-2 bg-gabriola-green text-white rounded-lg hover:bg-gabriola-green-dark disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <Activity className="w-4 h-4" />
                Refresh
              </>
            )}
          </button>
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:underline"
          >
            ← Back to Home
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <Activity className="w-8 h-8 text-green-600" />
            <span className="text-2xl font-bold">
              {users.filter(u => u.is_online).length}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-2">Online Now</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <Shield className="w-8 h-8 text-purple-600" />
            <span className="text-2xl font-bold">
              {users.filter(u => u.is_super_admin || u.admin_events || u.admin_bbs || u.admin_forum).length}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-2">Admins</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <Lock className="w-8 h-8 text-orange-600" />
            <span className="text-2xl font-bold">
              {users.filter(u => u.account_locked || u.is_banned).length}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-2">Locked/Banned</p>
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
      </div>

      {/* Search and Filter */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by name, email, username, or postal code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:outline-none"
          />
        </div>
        <div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterType)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:outline-none"
          >
            <option value="all">All Users</option>
            <option value="admins">Admins Only</option>
            <option value="banned">Banned/Locked</option>
            <option value="online">Online Now</option>
          </select>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-600" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* User List */}
      <div className="space-y-4">
        {users.map(u => {
          const isLocked = u.account_locked;
          const isSuspended = u.is_suspended;
          const profileScore = calculateProfileCompleteness(u);
          
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
                      {u.is_online && (
                        <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{u.full_name || 'No name'}</h3>
                      <p className="text-gray-600">@{u.username}</p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {u.email}
                        </span>
                        {u.postal_code && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {u.postal_code}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Activity & Stats */}
                  <div className="flex items-center gap-4 text-sm mb-3">
                    {u.last_activity ? (
                      <div className="flex items-center gap-2 text-gray-700">
                        <Activity className="w-4 h-4 text-blue-500" />
                        <span>{u.last_activity.formatted}</span>
                        <span className="text-gray-500">• {formatRelativeTime(u.last_activity.timestamp)}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-gray-500">
                        <Clock className="w-4 h-4" />
                        Last login: {formatRelativeTime(u.last_sign_in_at)}
                      </div>
                    )}
                    <span className="text-gray-500">• Profile: {profileScore}%</span>
                    <span className="text-gray-500">• Joined {formatDate(u.created_at)}</span>
                  </div>

                  {/* Badges/Permissions */}
                  <div className="flex flex-wrap gap-2">
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
                    {u.forum_read_only && (
                      <span className="px-3 py-1 bg-yellow-500 text-white rounded-full text-sm font-bold">
                        Read Only
                      </span>
                    )}
                    {u.can_issue_alerts && (
                      <span className="px-3 py-1 bg-orange-600 text-white rounded-full text-sm">
                        Can Issue Alerts ({u.alert_level_permission})
                      </span>
                    )}
                    {u.can_create_events && (
                      <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm">
                        Event Creator
                      </span>
                    )}
                    {u.admin_events && (
                      <span className="px-3 py-1 bg-purple-600 text-white rounded-full text-sm">
                        Event Admin
                      </span>
                    )}
                    {u.admin_forum && (
                      <span className="px-3 py-1 bg-indigo-600 text-white rounded-full text-sm">
                        Forum Admin
                      </span>
                    )}
                    {u.admin_bbs && (
                      <span className="px-3 py-1 bg-pink-600 text-white rounded-full text-sm">
                        BBS Admin
                      </span>
                    )}
                    {u.admin_directory && (
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
                  {u.is_online && (
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
                    onClick={() => toggleSuspension(u.id, u.full_name || u.email || 'User', isSuspended || false)}
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

      {/* Empty State */}
      {users.length === 0 && !loading && (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No users found</h3>
          <p className="text-gray-500">
            {search ? 'Try adjusting your search' : 'No users match the current filter'}
          </p>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={prevPage}
            disabled={pagination.page === 1}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => goToPage(pageNum)}
                  className={`w-10 h-10 rounded-lg font-medium ${
                    pagination.page === pageNum
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            
            {pagination.totalPages > 5 && (
              <>
                <span className="px-2 text-gray-500">...</span>
                <button
                  onClick={() => goToPage(pagination.totalPages)}
                  className="w-10 h-10 rounded-lg font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  {pagination.totalPages}
                </button>
              </>
            )}
          </div>
          
          <button
            onClick={nextPage}
            disabled={!pagination.hasMore}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Full Edit Modal */}
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
                <div><strong>Last Login:</strong> {formatRelativeTime(selectedUser.last_sign_in_at)}</div>
                <div><strong>Resident:</strong> {selectedUser.is_resident ? '✅ Yes' : '❌ No'}</div>
                <div><strong>Profile:</strong> {calculateProfileCompleteness(selectedUser)}% complete</div>
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium mb-2">Role</label>
                <select
                  value={selectedUser.role || 'user'}
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
                      checked={selectedUser.admin_forum || false}
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
                      checked={selectedUser.forum_read_only || false}
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
                      checked={selectedUser.admin_events || false}
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

              {/* BBS Permissions */}
              <div className="border-t pt-4">
                <h3 className="font-bold mb-3">BBS Permissions</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="admin-bbs"
                      checked={selectedUser.admin_bbs || false}
                      onChange={(e) => updatePermission(selectedUser.id, 'admin_bbs', e.target.checked)}
                      className="w-5 h-5 cursor-pointer"
                    />
                    <label htmlFor="admin-bbs" className="cursor-pointer">BBS Admin</label>
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
                      checked={selectedUser.admin_directory || false}
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
                        value={selectedUser.alert_level_permission || 'none'}
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
