// app/admin/users/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Search, Shield, MessageSquare, Eye, Ban, 
  CheckCircle, AlertTriangle, Loader2, User 
} from 'lucide-react';
import { format } from 'date-fns';

export default function AdminUsersPage() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showBanModal, setShowBanModal] = useState(false);
  const [banType, setBanType] = useState<'forum' | 'messaging'>('forum');
  const [banReason, setBanReason] = useState('');

  useEffect(() => {
    if (!authLoading) {
      if (!user?.is_super_admin) {
        router.push('/');
      } else {
        fetchUsers();
      }
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = users.filter(u => 
        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.postal_code?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    setUsers(data || []);
    setFilteredUsers(data || []);
    setLoading(false);
  };

  const handleBanAction = async (userId: string, type: 'forum' | 'messaging', action: 'ban' | 'unban' | 'readonly') => {
    if (action === 'ban') {
      setSelectedUser(users.find(u => u.id === userId));
      setBanType(type);
      setShowBanModal(true);
      return;
    }

    // Unban or set read-only
    const updates: any = {};
    if (type === 'forum') {
      if (action === 'unban') {
        updates.forum_banned = false;
        updates.forum_read_only = false;
        updates.forum_banned_at = null;
        updates.forum_banned_by = null;
        updates.forum_banned_reason = null;
      } else if (action === 'readonly') {
        updates.forum_read_only = true;
        updates.forum_banned = false;
      }
    } else {
      updates.messaging_banned = false;
      updates.messaging_banned_at = null;
      updates.messaging_banned_by = null;
      updates.messaging_banned_reason = null;
    }

    await supabase.from('users').update(updates).eq('id', userId);
    fetchUsers();
  };

  const confirmBan = async () => {
    if (!selectedUser || !banReason.trim()) {
      alert('Please provide a reason for the ban');
      return;
    }

    const updates: any = {};
    if (banType === 'forum') {
      updates.forum_banned = true;
      updates.forum_read_only = false;
      updates.forum_banned_at = new Date().toISOString();
      updates.forum_banned_by = user!.id;
      updates.forum_banned_reason = banReason.trim();
    } else {
      updates.messaging_banned = true;
      updates.messaging_banned_at = new Date().toISOString();
      updates.messaging_banned_by = user!.id;
      updates.messaging_banned_reason = banReason.trim();
    }

    await supabase.from('users').update(updates).eq('id', selectedUser.id);
    
    setShowBanModal(false);
    setSelectedUser(null);
    setBanReason('');
    fetchUsers();
  };

  const updateTrustLevel = async (userId: string, newLevel: string) => {
    await supabase.from('users').update({ trust_level: newLevel }).eq('id', userId);
    fetchUsers();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-gabriola-green animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gabriola-green hover:underline mb-8 text-lg font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </Link>

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-red-600" />
              <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            </div>
            <div className="text-gray-600">
              {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or postal code..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
            />
          </div>
        </div>

        {/* Users List */}
        <div className="space-y-4">
          {filteredUsers.map(u => {
            const isBanned = u.forum_banned || u.messaging_banned;
            const isReadOnly = u.forum_read_only;

            return (
              <div key={u.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition">
                <div className="flex items-start justify-between gap-4">
                  {/* User Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">
                        {u.full_name || 'No name'}
                      </h3>
                      {u.is_super_admin && (
                        <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">
                          SUPER ADMIN
                        </span>
                      )}
                      {u.admin_forum && (
                        <span className="bg-purple-600 text-white px-2 py-1 rounded text-xs font-bold">
                          FORUM ADMIN
                        </span>
                      )}
                      {isBanned && (
                        <span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
                          BANNED
                        </span>
                      )}
                      {isReadOnly && (
                        <span className="bg-yellow-500 text-white px-2 py-1 rounded text-xs font-bold">
                          READ-ONLY
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-gray-600 space-y-1">
                      <p>📧 {u.email || 'No email'}</p>
                      {u.postal_code && <p>📍 {u.postal_code}</p>}
                      <p>👤 Role: <span className="font-bold">{u.user_role}</span></p>
                      <p>⭐ Trust: <span className="font-bold">{u.trust_level}</span> ({u.trust_score} points)</p>
                      <p>📅 Joined {format(new Date(u.created_at), 'MMM d, yyyy')}</p>
                    </div>

                    {/* Ban Reasons */}
                    {u.forum_banned && u.forum_banned_reason && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                        <p className="text-sm font-bold text-red-900">Forum Ban Reason:</p>
                        <p className="text-sm text-red-700">{u.forum_banned_reason}</p>
                      </div>
                    )}
                    {u.messaging_banned && u.messaging_banned_reason && (
                      <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded">
                        <p className="text-sm font-bold text-orange-900">Messaging Ban Reason:</p>
                        <p className="text-sm text-orange-700">{u.messaging_banned_reason}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    {/* Trust Level */}
                    <select
                      value={u.trust_level}
                      onChange={e => updateTrustLevel(u.id, e.target.value)}
                      className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm font-bold"
                    >
                      <option value="new">New</option>
                      <option value="verified">Verified</option>
                      <option value="trusted">Trusted</option>
                      <option value="leader">Leader</option>
                    </select>

                    {/* Forum Controls */}
                    <div className="flex gap-2">
                      {u.forum_banned ? (
                        <button
                          onClick={() => handleBanAction(u.id, 'forum', 'unban')}
                          className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Unban Forum
                        </button>
                      ) : u.forum_read_only ? (
                        <>
                          <button
                            onClick={() => handleBanAction(u.id, 'forum', 'unban')}
                            className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Full Access
                          </button>
                          <button
                            onClick={() => handleBanAction(u.id, 'forum', 'ban')}
                            className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700"
                          >
                            <Ban className="w-4 h-4" />
                            Ban
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleBanAction(u.id, 'forum', 'readonly')}
                            className="flex items-center gap-1 px-3 py-2 bg-yellow-600 text-white rounded-lg text-sm font-bold hover:bg-yellow-700"
                          >
                            <Eye className="w-4 h-4" />
                            Read-Only
                          </button>
                          <button
                            onClick={() => handleBanAction(u.id, 'forum', 'ban')}
                            className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700"
                          >
                            <Ban className="w-4 h-4" />
                            Ban Forum
                          </button>
                        </>
                      )}
                    </div>

                    {/* Messaging Controls */}
                    {u.messaging_banned ? (
                      <button
                        onClick={() => handleBanAction(u.id, 'messaging', 'unban')}
                        className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Unban Messaging
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBanAction(u.id, 'messaging', 'ban')}
                        className="flex items-center gap-1 px-3 py-2 bg-orange-600 text-white rounded-lg text-sm font-bold hover:bg-orange-700"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Ban Messaging
                      </button>
                    )}

                    {/* View Profile */}
                    <Link
                      href={`/profile/${u.id}`}
                      className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-200 text-center"
                    >
                      <User className="w-4 h-4" />
                      View Profile
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ban Modal */}
      {showBanModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Ban {selectedUser.full_name} from {banType === 'forum' ? 'Forum' : 'Messaging'}?
            </h2>
            <p className="text-gray-600 mb-4">
              This will prevent them from {banType === 'forum' ? 'posting or replying in the forum' : 'sending private messages'}.
            </p>
            <textarea
              placeholder="Reason for ban (required)..."
              value={banReason}
              onChange={e => setBanReason(e.target.value)}
              rows={4}
              className="w-full p-4 border-2 border-gray-200 rounded-lg mb-4 focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBanModal(false);
                  setSelectedUser(null);
                  setBanReason('');
                }}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg font-bold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmBan}
                disabled={!banReason.trim()}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 disabled:opacity-50"
              >
                Confirm Ban
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
