// Path: app/admin/new-users/page.tsx
// Version: 1.0.0 - New User Signup Notifications
// Date: 2024-12-10

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { UserPlus, Calendar, Mail, MapPin, CheckCircle, XCircle, Loader2, Shield } from 'lucide-react';
import Link from 'next/link';

interface NewUser {
  id: string;
  email: string;
  full_name: string | null;
  postal_code: string | null;
  is_resident: boolean;
  created_at: string;
  last_sign_in_at: string | null;
}

export default function NewUsersPage() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const [newUsers, setNewUsers] = useState<NewUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user?.is_super_admin) {
        router.push('/');
        alert('Access denied: Super Admin only');
      } else {
        fetchNewUsers();
        
        // Set up real-time subscription for new signups
        const subscription = supabase
          .channel('new_users_notifications')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'users',
            },
            () => {
              fetchNewUsers();
            }
          )
          .subscribe();

        return () => {
          subscription.unsubscribe();
        };
      }
    }
  }, [user, authLoading, router]);

  const fetchNewUsers = async () => {
    // Get users from last 7 days who haven't been verified as residents
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, postal_code, is_resident, created_at, last_sign_in_at')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (!error && data) {
      setNewUsers(data as NewUser[]);
    }
    setLoading(false);
  };

  const verifyAsResident = async (userId: string) => {
    setProcessing(userId);
    
    const { error } = await supabase
      .from('users')
      .update({ 
        is_resident: true,
        can_post: true,
        can_comment: true
      })
      .eq('id', userId);

    if (!error) {
      await fetchNewUsers();
    } else {
      alert('Error verifying user: ' + error.message);
    }
    
    setProcessing(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFullDate = (dateString: string) => {
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

  // Calculate stats
  const pendingVerification = newUsers.filter(u => !u.is_resident).length;
  const verifiedToday = newUsers.filter(u => {
    const today = new Date();
    const userDate = new Date(u.created_at);
    return u.is_resident && 
           userDate.toDateString() === today.toDateString();
  }).length;

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
            <UserPlus className="w-10 h-10" />
            New User Signups
          </h1>
          <p className="text-gray-600 mt-2">
            Review and verify new community members (last 7 days)
          </p>
        </div>
        <Link
          href="/admin/users"
          className="text-blue-600 hover:underline"
        >
          ← Back to User Management
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <UserPlus className="w-8 h-8 text-blue-600" />
            <span className="text-3xl font-bold text-gray-900">{newUsers.length}</span>
          </div>
          <p className="text-gray-600 font-medium">Total New Users (7 days)</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <XCircle className="w-8 h-8 text-orange-600" />
            <span className="text-3xl font-bold text-gray-900">{pendingVerification}</span>
          </div>
          <p className="text-gray-600 font-medium">Pending Verification</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <span className="text-3xl font-bold text-gray-900">{verifiedToday}</span>
          </div>
          <p className="text-gray-600 font-medium">Verified Today</p>
        </div>
      </div>

      {/* Pending Verification Alert */}
      {pendingVerification > 0 && (
        <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-6 mb-8">
          <div className="flex items-start gap-4">
            <XCircle className="w-8 h-8 text-orange-600 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold text-orange-900 mb-2">
                ⚠️ {pendingVerification} User{pendingVerification !== 1 ? 's' : ''} Awaiting Verification
              </h2>
              <p className="text-orange-800">
                These users have signed up but are not yet verified as residents. 
                Review their information and verify if they're legitimate Gabriola residents.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* User List */}
      <div className="space-y-4">
        {newUsers.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <UserPlus className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl text-gray-600">No new users in the last 7 days</p>
          </div>
        ) : (
          newUsers.map(u => (
            <div 
              key={u.id} 
              className={`bg-white rounded-lg shadow-md p-6 border-2 ${
                u.is_resident ? 'border-green-200 bg-green-50' : 'border-orange-200'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  {/* User Header */}
                  <div className="flex items-center gap-3 mb-3">
                    {u.is_resident ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <XCircle className="w-6 h-6 text-orange-600" />
                    )}
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {u.full_name || 'No name provided'}
                      </h3>
                      <div className="flex items-center gap-2">
                        {u.is_resident ? (
                          <span className="text-sm font-medium text-green-700">
                            ✓ Verified Resident
                          </span>
                        ) : (
                          <span className="text-sm font-medium text-orange-700">
                            ⚠️ Pending Verification
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* User Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    <div className="flex items-center gap-2 text-gray-700">
                      <Mail className="w-4 h-4" />
                      <span>{u.email}</span>
                    </div>
                    
                    {u.postal_code && (
                      <div className="flex items-center gap-2 text-gray-700">
                        <MapPin className="w-4 h-4" />
                        <span>{u.postal_code}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-gray-700">
                      <Calendar className="w-4 h-4" />
                      <span>Signed up: {formatFullDate(u.created_at)}</span>
                    </div>
                    
                    {u.last_sign_in_at && (
                      <div className="flex items-center gap-2 text-gray-700">
                        <Calendar className="w-4 h-4" />
                        <span>Last active: {formatDate(u.last_sign_in_at)}</span>
                      </div>
                    )}
                  </div>

                  {/* Warning if no postal code */}
                  {!u.postal_code && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-3">
                      <p className="text-sm text-yellow-800">
                        ⚠️ No postal code provided - may not be a resident
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="ml-4 flex flex-col gap-2">
                  {!u.is_resident && (
                    <button
                      onClick={() => verifyAsResident(u.id)}
                      disabled={processing === u.id}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                    >
                      {processing === u.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Verify Resident
                        </>
                      )}
                    </button>
                  )}
                  
                  <Link
                    href={`/admin/users`}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <Shield className="w-4 h-4" />
                    Full Admin
                  </Link>
                  
                  <button
                    onClick={() => window.location.href = `mailto:${u.email}`}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <Mail className="w-4 h-4" />
                    Email
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Help Section */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-blue-900 mb-4">💡 Verification Tips</h2>
        <ul className="space-y-2 text-blue-800">
          <li>• <strong>Check postal code:</strong> Gabriola postal codes start with V0R 1X</li>
          <li>• <strong>Look for full name:</strong> Anonymous users are suspicious</li>
          <li>• <strong>Email domain:</strong> Local email addresses are more trustworthy</li>
          <li>• <strong>When in doubt:</strong> Email them to confirm residency</li>
          <li>• <strong>After verification:</strong> Users get posting and commenting rights</li>
        </ul>
      </div>
    </div>
  );
}
