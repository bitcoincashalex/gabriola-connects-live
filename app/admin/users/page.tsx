// app/admin/users/page.tsx
// v1.0 - Dec 8, 2025 - Admin user management with permission controls
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { User } from '@/lib/types';
import { Shield, Calendar, Edit, AlertTriangle, X } from 'lucide-react';

export default function AdminUsersPage() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

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
      fetchUsers();
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
                    className={`px-3 py-1 rounded text-xs font-medium ${
                      u.can_create_events 
                        ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {u.can_create_events ? 'Can Create Events' : 'Cannot Create Events'}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <Edit className={`w-4 h-4 ${u.can_moderate_events ? 'text-green-600' : 'text-gray-300'}`} />
                  <button
                    onClick={() => updatePermission(u.id, 'can_moderate_events', !u.can_moderate_events)}
                    className={`px-3 py-1 rounded text-xs font-medium ${
                      u.can_moderate_events 
                        ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {u.can_moderate_events ? 'Can Moderate Events' : 'Cannot Moderate Events'}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <AlertTriangle className={`w-4 h-4 ${u.can_issue_alerts ? 'text-orange-600' : 'text-gray-300'}`} />
                  <button
                    onClick={() => updatePermission(u.id, 'can_issue_alerts', !u.can_issue_alerts)}
                    className={`px-3 py-1 rounded text-xs font-medium ${
                      u.can_issue_alerts 
                        ? 'bg-orange-100 text-orange-800 hover:bg-orange-200' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {u.can_issue_alerts ? 'Can Issue Alerts' : 'Cannot Issue Alerts'}
                  </button>
                </div>

                {u.can_issue_alerts && (
                  <div className="ml-6">
                    <select
                      value={u.alert_level_permission}
                      onChange={(e) => updatePermission(u.id, 'alert_level_permission', e.target.value)}
                      className="px-2 py-1 text-xs border rounded"
                    >
                      <option value="none">No alerts</option>
                      <option value="minor">Minor</option>
                      <option value="moderate">Moderate</option>
                      <option value="major">Major</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedUser(u)}
                className="ml-4 px-4 py-2 bg-gabriola-green text-white rounded-lg hover:bg-gabriola-green-dark"
              >
                Edit All
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Edit: {selectedUser.full_name}</h2>
              <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
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

              <div className="flex items-center gap-3">
                <input type="checkbox" checked={selectedUser.is_super_admin} onChange={(e) => updatePermission(selectedUser.id, 'is_super_admin', e.target.checked)} className="w-5 h-5" />
                <label className="font-medium">Super Admin</label>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-bold mb-3">Event Permissions</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={selectedUser.can_create_events} onChange={(e) => updatePermission(selectedUser.id, 'can_create_events', e.target.checked)} className="w-5 h-5" />
                    <label>Can create events</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={selectedUser.can_moderate_events} onChange={(e) => updatePermission(selectedUser.id, 'can_moderate_events', e.target.checked)} className="w-5 h-5" />
                    <label>Can moderate events</label>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-bold mb-3">Alert Permissions</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={selectedUser.can_issue_alerts} onChange={(e) => updatePermission(selectedUser.id, 'can_issue_alerts', e.target.checked)} className="w-5 h-5" />
                    <label>Can issue alerts</label>
                  </div>
                  {selectedUser.can_issue_alerts && (
                    <div className="ml-8">
                      <label className="block text-sm mb-1">Max level</label>
                      <select value={selectedUser.alert_level_permission} onChange={(e) => updatePermission(selectedUser.id, 'alert_level_permission', e.target.value)} className="px-4 py-2 border rounded-lg">
                        <option value="none">None</option>
                        <option value="minor">Minor</option>
                        <option value="moderate">Moderate</option>
                        <option value="major">Major</option>
                        <option value="emergency">Emergency</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-bold mb-3">Other</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={selectedUser.can_post} onChange={(e) => updatePermission(selectedUser.id, 'can_post', e.target.checked)} className="w-5 h-5" />
                    <label>Can post</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={selectedUser.can_comment} onChange={(e) => updatePermission(selectedUser.id, 'can_comment', e.target.checked)} className="w-5 h-5" />
                    <label>Can comment</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={selectedUser.can_rsvp} onChange={(e) => updatePermission(selectedUser.id, 'can_rsvp', e.target.checked)} className="w-5 h-5" />
                    <label>Can RSVP</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={selectedUser.can_edit_directory} onChange={(e) => updatePermission(selectedUser.id, 'can_edit_directory', e.target.checked)} className="w-5 h-5" />
                    <label>Can edit directory</label>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={selectedUser.is_banned} onChange={(e) => updatePermission(selectedUser.id, 'is_banned', e.target.checked)} className="w-5 h-5" />
                  <label className="font-medium text-red-600">Ban user</label>
                </div>
              </div>
            </div>

            <button onClick={() => setSelectedUser(null)} className="mt-6 w-full bg-gabriola-green text-white py-3 rounded-lg font-bold">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
