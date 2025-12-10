// Path: app/admin/events/creators/page.tsx
// Version: 1.0.0 - Manage Authorized Event Creators
// Date: 2024-12-10

'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft,
  UserPlus,
  UserMinus,
  Search,
  Calendar,
  Mail
} from 'lucide-react';

interface AuthorizedUser {
  id: string;
  email: string;
  full_name: string;
  can_create_events: boolean;
  events_created_count: number;
}

export default function ManageEventCreators() {
  const { user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorizedUsers, setAuthorizedUsers] = useState<AuthorizedUser[]>([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState<AuthorizedUser[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/signin');
      return;
    }

    const isEventAdmin = user.is_super_admin || (user as any).admin_events;
    if (!isEventAdmin) {
      router.push('/');
      alert('Access denied: Event admins only');
      return;
    }

    fetchAuthorizedUsers();
  }, [user, router]);

  const fetchAuthorizedUsers = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, can_create_events, events_created_count')
      .eq('can_create_events', true)
      .order('full_name', { ascending: true });

    if (!error && data) {
      setAuthorizedUsers(data);
    }

    setLoading(false);
  };

  const handleSearch = async () => {
    if (!searchEmail.trim()) {
      alert('Please enter an email address');
      return;
    }

    setSearching(true);

    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, can_create_events, events_created_count')
      .ilike('email', `%${searchEmail.trim()}%`)
      .limit(10);

    if (!error && data) {
      setSearchResults(data);
    } else {
      alert('No users found');
      setSearchResults([]);
    }

    setSearching(false);
  };

  const handleGrantPermission = async (userId: string, userName: string) => {
    if (!confirm(`Grant event creation permission to ${userName}?`)) return;

    const { error } = await supabase
      .from('users')
      .update({ can_create_events: true })
      .eq('id', userId);

    if (error) {
      alert('Failed to grant permission');
    } else {
      setSearchEmail('');
      setSearchResults([]);
      fetchAuthorizedUsers();
    }
  };

  const handleRevokePermission = async (userId: string, userName: string) => {
    if (!confirm(`Revoke event creation permission from ${userName}?\n\nThey will no longer be able to create events without approval.`)) return;

    const { error } = await supabase
      .from('users')
      .update({ can_create_events: false })
      .eq('id', userId);

    if (error) {
      alert('Failed to revoke permission');
    } else {
      fetchAuthorizedUsers();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-xl text-gray-600">Loading authorized creators...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/admin/events"
            className="inline-flex items-center gap-2 text-blue-600 hover:underline mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Authorized Event Creators</h1>
              <p className="text-gray-600">Grant users permission to create events without approval</p>
            </div>
          </div>
        </div>

        {/* Search Box */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Grant Permission to User</h2>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={searchEmail}
                onChange={e => setSearchEmail(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search by email address..."
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={searching}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition disabled:bg-gray-300"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-gray-600">Search Results:</p>
              {searchResults.map(result => (
                <div key={result.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">
                      {result.full_name || 'No name'}
                    </p>
                    <p className="text-sm text-gray-600">{result.email}</p>
                  </div>
                  {result.can_create_events ? (
                    <span className="text-sm text-green-600 font-medium">Already authorized</span>
                  ) : (
                    <button
                      onClick={() => handleGrantPermission(result.id, result.full_name || result.email)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      <UserPlus className="w-4 h-4" />
                      Grant Permission
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Authorized Users List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">
              Authorized Creators ({authorizedUsers.length})
            </h2>
            <p className="text-gray-600 mt-1">Users who can create events without approval</p>
          </div>

          {authorizedUsers.length === 0 ? (
            <div className="p-12 text-center">
              <UserPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-xl text-gray-600">No authorized creators yet</p>
              <p className="text-gray-500 mt-2">Search for users above to grant permissions</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {authorizedUsers.map(creator => (
                <div key={creator.id} className="p-6 hover:bg-gray-50 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">
                          {creator.full_name || 'No name'}
                        </h3>
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          ✓ Authorized
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {creator.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {creator.events_created_count || 0} events created
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevokePermission(creator.id, creator.full_name || creator.email)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition text-sm font-medium"
                    >
                      <UserMinus className="w-4 h-4" />
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-blue-900 mb-2">ℹ️ About Authorized Creators</h3>
          <ul className="space-y-1 text-blue-800 text-sm">
            <li>• <strong>Authorized creators</strong> can publish events instantly without approval</li>
            <li>• <strong>Regular users</strong> must submit events for admin approval</li>
            <li>• <strong>Grant permission</strong> to trusted organizations and frequent event hosts</li>
            <li>• <strong>Revoke anytime</strong> - their existing events will remain published</li>
            <li>• Super admins and event admins always have full event creation access</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
