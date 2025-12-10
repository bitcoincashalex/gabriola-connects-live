// Path: app/admin/users/bulk/page.tsx
// Version: 1.0.0 - Bulk User Admin Update Module
// Date: 2024-12-10

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { Shield, Users, CheckSquare, Square, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  full_name: string;
  is_resident: boolean;
  is_super_admin: boolean;
  is_banned: boolean;
  can_post: boolean;
  can_create_events: boolean;
  can_issue_alerts: boolean;
  [key: string]: any;
}

export default function BulkUserAdminPage() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [search, setSearch] = useState('');

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

  const toggleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUserIds);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUserIds(newSelected);
  };

  const selectAll = () => {
    const allIds = filteredUsers.map(u => u.id);
    setSelectedUserIds(new Set(allIds));
  };

  const deselectAll = () => {
    setSelectedUserIds(new Set());
  };

  const bulkUpdate = async (field: string, value: any) => {
    if (selectedUserIds.size === 0) {
      alert('Please select at least one user');
      return;
    }

    const confirmMsg = `Are you sure you want to update ${selectedUserIds.size} user(s)?\n\nSetting ${field} = ${value}`;
    if (!confirm(confirmMsg)) return;

    setProcessing(true);

    const userIdsArray = Array.from(selectedUserIds);
    
    const { error } = await supabase
      .from('users')
      .update({ [field]: value })
      .in('id', userIdsArray);

    if (error) {
      alert('Error updating users: ' + error.message);
    } else {
      alert(`Successfully updated ${selectedUserIds.size} user(s)!`);
      await fetchUsers();
      setSelectedUserIds(new Set());
    }

    setProcessing(false);
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

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
            <Users className="w-10 h-10" />
            Bulk User Updates
          </h1>
          <p className="text-gray-600 mt-2">
            Select multiple users and update permissions at once
          </p>
        </div>
        <Link
          href="/admin/users"
          className="text-blue-600 hover:underline"
        >
          ← Back to User Management
        </Link>
      </div>

      {/* Selection Info */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold text-blue-900">
              {selectedUserIds.size} user(s) selected
            </p>
            <p className="text-sm text-blue-700">
              Select users below, then choose an action
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Select All ({filteredUsers.length})
            </button>
            <button
              onClick={deselectAll}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
            >
              Deselect All
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedUserIds.size > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Bulk Actions</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Forum Permissions */}
            <div className="border-2 border-gray-200 rounded-lg p-4">
              <h3 className="font-bold mb-3 text-gray-900">Forum Permissions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => bulkUpdate('can_post', true)}
                  disabled={processing}
                  className="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm"
                >
                  ✅ Enable Posting
                </button>
                <button
                  onClick={() => bulkUpdate('can_post', false)}
                  disabled={processing}
                  className="w-full px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-sm"
                >
                  ❌ Disable Posting
                </button>
                <button
                  onClick={() => bulkUpdate('forum_read_only', true)}
                  disabled={processing}
                  className="w-full px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 text-sm"
                >
                  👁️ Set Read-Only
                </button>
                <button
                  onClick={() => bulkUpdate('is_banned', true)}
                  disabled={processing}
                  className="w-full px-3 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50 text-sm"
                >
                  ⛔ BAN Users
                </button>
              </div>
            </div>

            {/* Event Permissions */}
            <div className="border-2 border-gray-200 rounded-lg p-4">
              <h3 className="font-bold mb-3 text-gray-900">Event Permissions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => bulkUpdate('can_create_events', true)}
                  disabled={processing}
                  className="w-full px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 text-sm"
                >
                  ✅ Grant Event Creation
                </button>
                <button
                  onClick={() => bulkUpdate('can_create_events', false)}
                  disabled={processing}
                  className="w-full px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 text-sm"
                >
                  ❌ Revoke Event Creation
                </button>
                <button
                  onClick={() => bulkUpdate('admin_events', true)}
                  disabled={processing}
                  className="w-full px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 text-sm"
                >
                  🛡️ Make Event Admin
                </button>
              </div>
            </div>

            {/* Alert Permissions */}
            <div className="border-2 border-gray-200 rounded-lg p-4">
              <h3 className="font-bold mb-3 text-gray-900">Alert Permissions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => bulkUpdate('can_issue_alerts', true)}
                  disabled={processing}
                  className="w-full px-3 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 text-sm"
                >
                  ✅ Grant Alert Permission
                </button>
                <button
                  onClick={() => bulkUpdate('can_issue_alerts', false)}
                  disabled={processing}
                  className="w-full px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 text-sm"
                >
                  ❌ Revoke Alert Permission
                </button>
                <button
                  onClick={() => bulkUpdate('alert_level_permission', 'info')}
                  disabled={processing}
                  className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  📘 Set Level: Info
                </button>
                <button
                  onClick={() => bulkUpdate('alert_level_permission', 'warning')}
                  disabled={processing}
                  className="w-full px-3 py-2 bg-yellow-700 text-white rounded hover:bg-yellow-800 disabled:opacity-50 text-sm"
                >
                  ⚠️ Set Level: Warning
                </button>
              </div>
            </div>
          </div>

          {processing && (
            <div className="mt-4 flex items-center justify-center gap-3 text-blue-600">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="font-medium">Processing updates...</span>
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:outline-none"
        />
      </div>

      {/* User List */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Select Users ({filteredUsers.length})</h2>
        
        <div className="space-y-2">
          {filteredUsers.map(u => (
            <div
              key={u.id}
              onClick={() => toggleSelectUser(u.id)}
              className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                selectedUserIds.has(u.id)
                  ? 'border-gabriola-green bg-green-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedUserIds.has(u.id) ? (
                    <CheckSquare className="w-6 h-6 text-gabriola-green" />
                  ) : (
                    <Square className="w-6 h-6 text-gray-400" />
                  )}
                  <div>
                    <p className="font-bold text-gray-900">{u.full_name || 'No name'}</p>
                    <p className="text-sm text-gray-600">{u.email}</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {u.is_super_admin && (
                    <span className="px-2 py-1 bg-red-600 text-white rounded text-xs font-bold">
                      Super Admin
                    </span>
                  )}
                  {u.is_banned && (
                    <span className="px-2 py-1 bg-red-600 text-white rounded text-xs font-bold">
                      Banned
                    </span>
                  )}
                  {u.can_create_events && (
                    <span className="px-2 py-1 bg-purple-600 text-white rounded text-xs">
                      Event Creator
                    </span>
                  )}
                  {u.can_issue_alerts && (
                    <span className="px-2 py-1 bg-orange-600 text-white rounded text-xs">
                      Can Alert
                    </span>
                  )}
                  {!u.is_resident && (
                    <span className="px-2 py-1 bg-gray-400 text-white rounded text-xs">
                      Not Resident
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
