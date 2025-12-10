// Path: app/admin/users/page.tsx
// Version: 2.0.0 - Enhanced profile view with full date, email, postal code, resident status
// Date: 2024-12-10

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { User } from '@/lib/types';
import { Shield, Calendar, Edit, AlertTriangle, X, Eye, Mail, MapPin, CheckCircle, XCircle } from 'lucide-react';

export default function AdminUsersPage() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      // SUPER ADMIN ONLY - no other admins allowed
      if (!user?.is_super_admin) {
        router.push('/');
        alert('Access denied: Super Admin only');
      } else {
        fetchUsers();
      }
    }
  }, [user, authLoading, router]);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('users')
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

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.postal_code?.toLowerCase().includes(search.toLowerCase())
  );

  const selectedUser = selectedUserId ? users.find(u => u.id === selectedUserId) : null;

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="text-2xl text-gray-600">Loading...</div>
    </div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
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

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by name, email, or postal code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:outline-none"
        />
      </div>

      <div className="space-y-4">
        {filteredUsers.map(u => (
          <div key={u.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                {/* User Header Info */}
                <div className="flex items-start gap-4 mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{u.full_name || 'No name'}</h3>
                    
                    {/* Email */}
                    <div className="flex items-center gap-2 text-gray-600 mt-1">
                      <Mail className="w-4 h-4" />
                      <span>{u.email}</span>
                    </div>
                    
                    {/* Postal Code */}
                    {u.postal_code && (
                      <div className="flex items-center gap-2 text-gray-600 mt-1">
                        <MapPin className="w-4 h-4" />
                        <span>{u.postal_code}</span>
                      </div>
                    )}
                    
                    {/* Joined Date - Full Format */}
                    <div className="flex items-center gap-2 text-gray-600 mt-1">
                      <Calendar className="w-4 h-4" />
                      <span>Joined: {formatDate(u.created_at)}</span>
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
                </div>

                {/* Quick Alert Level Toggle (if can issue alerts) */}
                {u.can_issue_alerts && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-medium">Alert Level:</span>
                    <select
                      value={(u as any).alert_level_permission || 'none'}
                      onChange={(e) => updatePermission(u.id, 'alert_level_permission', e.target.value)}
                      className="px-3 py-1 border rounded"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="none">None</option>
                      <option value="info">Info (blue)</option>
                      <option value="advisory">Advisory (yellow)</option>
                      <option value="warning">Warning (orange)</option>
                      <option value="emergency">Emergency (red)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="ml-4 flex flex-col gap-2">
                <button
                  onClick={() => window.location.href = `mailto:${u.email}`}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Email User
                </button>
                <button
                  onClick={() => router.push(`/profile/${u.id}`)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View Profile
                </button>
                <button
                  onClick={() => setSelectedUserId(u.id)}
                  className="px-4 py-2 bg-gabriola-green text-white rounded-lg hover:bg-gabriola-green-dark"
                >
                  Edit All
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Full Edit Modal - Keep your existing modal code */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
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
                <div><strong>Resident:</strong> {selectedUser.is_resident ? '✅ Yes' : '❌ No'}</div>
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
                <p className="text-xs text-gray-500 mt-1">Note: Permissions below work independently of role</p>
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
                      id="forum-moderator"
                      checked={(selectedUser as any).forum_moderator || false}
                      onChange={(e) => updatePermission(selectedUser.id, 'forum_moderator', e.target.checked)}
                      className="w-5 h-5 cursor-pointer"
                    />
                    <label htmlFor="forum-moderator" className="cursor-pointer">Forum Moderator</label>
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
                    <label htmlFor="forum-read-only" className="cursor-pointer text-orange-700">Forum Read-Only (can view but not post)</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="is-banned"
                      checked={selectedUser.is_banned || false}
                      onChange={(e) => updatePermission(selectedUser.id, 'is_banned', e.target.checked)}
                      className="w-5 h-5 cursor-pointer"
                    />
                    <label htmlFor="is-banned" className="cursor-pointer text-red-700 font-bold">BANNED (blocks all forum access)</label>
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
                    <label htmlFor="admin-events" className="cursor-pointer">Event Admin (full event control)</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="create-events"
                      checked={selectedUser.can_create_events || false}
                      onChange={(e) => updatePermission(selectedUser.id, 'can_create_events', e.target.checked)}
                      className="w-5 h-5 cursor-pointer"
                    />
                    <label htmlFor="create-events" className="cursor-pointer">Can create events (instant publish)</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="moderate-events"
                      checked={selectedUser.can_moderate_events || false}
                      onChange={(e) => updatePermission(selectedUser.id, 'can_moderate_events', e.target.checked)}
                      className="w-5 h-5 cursor-pointer"
                    />
                    <label htmlFor="moderate-events" className="cursor-pointer">Can moderate events (edit/delete any)</label>
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
                        <option value="info">Info (community notices, blue)</option>
                        <option value="advisory">Advisory (awareness, yellow)</option>
                        <option value="warning">Warning (take action, orange)</option>
                        <option value="emergency">Emergency (life safety, red)</option>
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
