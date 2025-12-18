// ============================================================================
// ADMIN USERS PAGE - Paginated User Management with Activity Tracking
// ============================================================================
// Path: app/admin/users/page.tsx
// Version: 4.0.0 - Complete rewrite with pagination and activity tracking
// Created: 2025-12-18
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { 
  Shield, Search, Filter, ChevronLeft, ChevronRight,
  Activity, Clock, Mail, User as UserIcon, 
  Lock, Unlock, Ban, CheckCircle, XCircle,
  Loader2, AlertCircle
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
  
  is_super_admin: boolean;
  admin_events: boolean;
  admin_bbs: boolean;
  admin_users: boolean;
  
  is_banned: boolean;
  account_locked: boolean;
  
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
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

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
        
        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchUsers, 30000);
        return () => clearInterval(interval);
      }
    }
  }, [user, authLoading, router]);

  // Refetch when page/search/filter changes
  useEffect(() => {
    if (user?.is_super_admin) {
      fetchUsers();
    }
  }, [pagination.page, search, filter]);

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
  // HELPER FUNCTIONS
  // ========================================================================

  const formatTimestamp = (timestamp: string | null): string => {
    if (!timestamp) return 'Never';
    
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - date.getTime();
    
    // Less than 1 minute
    if (diff < 60 * 1000) return 'Just now';
    
    // Less than 1 hour
    if (diff < 60 * 60 * 1000) {
      const mins = Math.floor(diff / (60 * 1000));
      return `${mins}m ago`;
    }
    
    // Less than 24 hours
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      return `${hours}h ago`;
    }
    
    // Less than 7 days
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      const days = Math.floor(diff / (24 * 60 * 60 * 1000));
      return `${days}d ago`;
    }
    
    // Format as date
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getActivityIcon = (activityType: string): string => {
    const icons: Record<string, string> = {
      post_created: '📝',
      reply_posted: '💬',
      event_created: '📅',
      event_rsvp: '✓',
      message_sent: '✉️'
    };
    return icons[activityType] || '•';
  };

  // ========================================================================
  // PAGINATION HANDLERS
  // ========================================================================

  const goToPage = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const nextPage = () => {
    if (pagination.hasMore) {
      goToPage(pagination.page + 1);
    }
  };

  const prevPage = () => {
    if (pagination.page > 1) {
      goToPage(pagination.page - 1);
    }
  };

  // ========================================================================
  // SEARCH HANDLER (Debounced)
  // ========================================================================

  useEffect(() => {
    const timer = setTimeout(() => {
      // Reset to page 1 when search changes
      setPagination(prev => ({ ...prev, page: 1 }));
    }, 500);
    
    return () => clearTimeout(timer);
  }, [search]);

  // ========================================================================
  // LOADING STATE
  // ========================================================================

  if (authLoading || loading && users.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  // ========================================================================
  // ERROR STATE
  // ========================================================================

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-700 mb-2">Error Loading Users</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchUsers}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Shield className="w-8 h-8 text-blue-600" />
            User Management
          </h1>
          <p className="text-gray-600">
            Manage user accounts, permissions, and activity
          </p>
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('admins')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'admins'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Admins
              </button>
              <button
                onClick={() => setFilter('online')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'online'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Online
              </button>
              <button
                onClick={() => setFilter('banned')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'banned'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Banned
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <div>
              Showing {users.length} of {pagination.total} users
            </div>
            <div className="flex items-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Page {pagination.page} of {pagination.totalPages}</span>
            </div>
          </div>
        </div>

        {/* User List */}
        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.full_name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <UserIcon className="w-6 h-6 text-blue-600" />
                    </div>
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  
                  {/* Name & Status */}
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {user.full_name || user.username}
                    </h3>
                    
                    {user.is_online && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        Online
                      </span>
                    )}
                    
                    {user.is_super_admin && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                        Super Admin
                      </span>
                    )}
                    
                    {user.is_banned && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                        Banned
                      </span>
                    )}
                  </div>

                  {/* Email & Username */}
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                    <div className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {user.email}
                    </div>
                    <div className="flex items-center gap-1">
                      <UserIcon className="w-4 h-4" />
                      @{user.username}
                    </div>
                  </div>

                  {/* Last Activity */}
                  <div className="flex items-center gap-4 text-sm">
                    {user.last_activity ? (
                      <div className="flex items-center gap-2 text-gray-700">
                        <Activity className="w-4 h-4 text-blue-500" />
                        <span className="font-medium">
                          {getActivityIcon(user.last_activity.type)} {user.last_activity.formatted}
                        </span>
                        <span className="text-gray-500">
                          • {formatTimestamp(user.last_activity.timestamp)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span>
                          Last login: {formatTimestamp(user.last_sign_in_at)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Admin Roles */}
                  {(user.admin_events || user.admin_bbs || user.admin_users) && (
                    <div className="mt-2 flex items-center gap-2">
                      {user.admin_events && (
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                          Events Admin
                        </span>
                      )}
                      {user.admin_bbs && (
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                          BBS Admin
                        </span>
                      )}
                      {user.admin_users && (
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                          Users Admin
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="flex-shrink-0 flex flex-col gap-2">
                  <button
                    onClick={() => setSelectedUser(user)}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Edit
                  </button>
                  
                  {!user.is_banned && !user.is_super_admin && (
                    <button
                      onClick={() => updatePermission(user.id, 'is_banned', true)}
                      className="px-3 py-1.5 bg-red-100 text-red-700 text-sm rounded-lg hover:bg-red-200 transition-colors flex items-center gap-1"
                    >
                      <Ban className="w-4 h-4" />
                      Ban
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {users.length === 0 && !loading && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <UserIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
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

        {/* User Detail Modal */}
        {selectedUser && (
          <UserDetailModal
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
            onUpdate={updatePermission}
            onRefresh={fetchUsers}
          />
        )}

      </div>
    </div>
  );
}

// ============================================================================
// USER DETAIL MODAL (Placeholder - implement full version later)
// ============================================================================

function UserDetailModal({
  user,
  onClose,
  onUpdate,
  onRefresh
}: {
  user: AdminUser;
  onClose: () => void;
  onUpdate: (userId: string, field: string, value: any) => Promise<void>;
  onRefresh: () => Promise<void>;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Edit User: {user.full_name}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Admin Toggles */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Admin Permissions</h3>
          
          <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span>Events Admin</span>
            <input
              type="checkbox"
              checked={user.admin_events}
              onChange={(e) => onUpdate(user.id, 'admin_events', e.target.checked)}
              className="w-5 h-5"
            />
          </label>
          
          <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span>BBS Admin</span>
            <input
              type="checkbox"
              checked={user.admin_bbs}
              onChange={(e) => onUpdate(user.id, 'admin_bbs', e.target.checked)}
              className="w-5 h-5"
            />
          </label>
          
          <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span>Users Admin</span>
            <input
              type="checkbox"
              checked={user.admin_users}
              onChange={(e) => onUpdate(user.id, 'admin_users', e.target.checked)}
              className="w-5 h-5"
            />
          </label>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Close
          </button>
          <button
            onClick={async () => {
              await onRefresh();
              onClose();
            }}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
