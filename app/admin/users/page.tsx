// app/admin/users/page.tsx
// v1.1 - Dec 8, 2025 - FIXED: Working toggles, alert levels, profile viewing
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { User } from '@/lib/types';
import { Shield, Calendar, Edit, AlertTriangle, X, Eye } from 'lucide-react';

export default function AdminUsersPage() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user?.is_super_admin) {
        router.push('/');
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
      // Refresh users list to update UI
      await fetchUsers();
    } else {
      alert('Error updating permission: ' + error.message);
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.postal_code?.toLowerCase().includes(search.toLowerCase())
  );

  // Get selected user from current users state (always fresh)
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
          <div key={u.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-800">{u.full_name}</h3>
                <div className="mt-2 space-y-1 text-sm text-gray-600">
                  <div>📧 {u.email}</div>
                  <div>👤 @{u.username}</div>
                  <div>📍 {u.postal_code}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      u.role === 'admin' ? 'bg-red-100 text-red-800' :
                      u.role === 'moderator' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {u.role.toUpperCase()}
                    </span>
                    {u.is_super_admin && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                        SUPER ADMIN
                      </span>
                    )}
                    {u.is_banned && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-red-600 text-white">
                        BANNED
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="ml-6 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className={`w-4 h-4 ${u.can_create_events ? 'text-green-600' : 'text-gray-300'}`} />
                  <button
                    onClick={() => updatePermission(u.id, 'can_create_events', !u.can_create_events)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      u.can_create_events 
                        ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {u.can_create_events ? '✓ Create Events' : 'Create Events'}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <Edit className={`w-4 h-4 ${u.can_moderate_events ? 'text-green-600' : 'text-gray-300'}`} />
                  <button
                    onClick={() => updatePermission(u.id, 'can_moderate_events', !u.can_moderate_events)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      u.can_moderate_events 
                        ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {u.can_moderate_events ? '✓ Moderate Events' : 'Moderate Events'}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <AlertTriangle className={`w-4 h-4 ${u.can_issue_alerts ? 'text-orange-600' : 'text-gray-300'}`} />
                  <button
                    onClick={() => updatePermission(u.id, 'can_issue_alerts', !u.can_issue_alerts)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      u.can_issue_alerts 
                        ? 'bg-orange-100 text-orange-800 hover:bg-orange-200' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {u.can_issue_alerts ? '✓ Issue Alerts' : 'Issue Alerts'}
                  </button>
                </div>

                {u.can_issue_alerts && (
                  <div className="ml-6">
                    <label className="text-xs text-gray-600 block mb-1">Max Alert Level:</label>
                    <select
                      value={u.alert_level_permission}
                      onChange={(e) => updatePermission(u.id, 'alert_level_permission', e.target.value)}
                      className="px-2 py-1 text-xs border rounded w-full"
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

              <div className="ml-4 flex flex-col gap-2">
                <button
                  onClick={() => router.push(`/profile/${u.id}`)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
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

      {/* Full Edit Modal */}
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

              {/* Event Permissions */}
              <div className="border-t pt-4">
                <h3 className="font-bold mb-3">Event Permissions</h3>
                <p className="text-sm text-gray-600 mb-3">✓ Users can manage events without being Admin/Moderator</p>
                <div className="space-y-2">
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
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="moderate-events"
                      checked={selectedUser.can_moderate_events || false}
                      onChange={(e) => updatePermission(selectedUser.id, 'can_moderate_events', e.target.checked)}
                      className="w-5 h-5 cursor-pointer"
                    />
                    <label htmlFor="moderate-events" className="cursor-pointer">Can moderate events (edit/delete ANY event)</label>
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
                        value={selectedUser.alert_level_permission}
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

              {/* Other Permissions */}
              <div className="border-t pt-4">
                <h3 className="font-bold mb-3">Other Permissions</h3>
                <div className="space-y-2">
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
                      id="can-comment"
                      checked={selectedUser.can_comment || false}
                      onChange={(e) => updatePermission(selectedUser.id, 'can_comment', e.target.checked)}
                      className="w-5 h-5 cursor-pointer"
                    />
                    <label htmlFor="can-comment" className="cursor-pointer">Can comment/reply</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="can-rsvp"
                      checked={selectedUser.can_rsvp || false}
                      onChange={(e) => updatePermission(selectedUser.id, 'can_rsvp', e.target.checked)}
                      className="w-5 h-5 cursor-pointer"
                    />
                    <label htmlFor="can-rsvp" className="cursor-pointer">Can RSVP to events</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="can-edit-dir"
                      checked={selectedUser.can_edit_directory || false}
                      onChange={(e) => updatePermission(selectedUser.id, 'can_edit_directory', e.target.checked)}
                      className="w-5 h-5 cursor-pointer"
                    />
                    <label htmlFor="can-edit-dir" className="cursor-pointer">Can edit directory</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="can-send-msgs"
                      checked={selectedUser.can_send_messages || false}
                      onChange={(e) => updatePermission(selectedUser.id, 'can_send_messages', e.target.checked)}
                      className="w-5 h-5 cursor-pointer"
                    />
                    <label htmlFor="can-send-msgs" className="cursor-pointer">Can send private messages</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="can-receive-msgs"
                      checked={selectedUser.can_receive_messages || false}
                      onChange={(e) => updatePermission(selectedUser.id, 'can_receive_messages', e.target.checked)}
                      className="w-5 h-5 cursor-pointer"
                    />
                    <label htmlFor="can-receive-msgs" className="cursor-pointer">Can receive private messages</label>
                  </div>
                </div>
              </div>

              {/* Ban */}
              <div className="border-t pt-4">
                <h3 className="font-bold mb-3 text-red-600">Account Status</h3>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is-banned"
                    checked={selectedUser.is_banned || false}
                    onChange={(e) => updatePermission(selectedUser.id, 'is_banned', e.target.checked)}
                    className="w-5 h-5 cursor-pointer"
                  />
                  <label htmlFor="is-banned" className="font-medium text-red-600 cursor-pointer">Ban this user (blocks all access)</label>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedUserId(null)}
              className="mt-6 w-full bg-gabriola-green text-white py-3 rounded-lg font-bold hover:bg-gabriola-green-dark"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
