// Path: app/admin/new-users/page.tsx
// Version: 1.2.0 - Three choices for each new member: Verify Resident, Not a Resident (still a full
//                  member, no Resident badge) and Spam / Fake (banned). Undo puts them back to pending.
//                  Email opens a short note asking where they live. Needs sql/2026-11-05-resident-review.sql.
// Previous: 1.1.0 - Verify Resident works: uses the verify_resident() database function (the old
//                  direct update was quietly blocked by the database). Works with or without a postal code.
// Previous: 1.0.0 - New User Signup Notifications
// Date: 2026-10-11

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { UserPlus, Calendar, Mail, MapPin, CheckCircle, XCircle, Loader2, Shield, UserCheck, Ban, Undo2 } from 'lucide-react';
import Link from 'next/link';

type Review = 'pending' | 'resident' | 'not_resident' | 'spam';

const REVIEW_LABEL: Record<Review, string> = {
  pending: '⚠️ Pending review',
  resident: '✓ Verified Resident',
  not_resident: 'Member, not a resident',
  spam: 'Spam / fake (banned)',
};
const REVIEW_STYLE: Record<Review, { card: string; text: string }> = {
  pending: { card: 'border-orange-200', text: 'text-orange-700' },
  resident: { card: 'border-green-200 bg-green-50', text: 'text-green-700' },
  not_resident: { card: 'border-blue-200 bg-blue-50', text: 'text-blue-800' },
  spam: { card: 'border-red-200 bg-red-50', text: 'text-red-700' },
};

// Short note asking where they live, in Alex's words
function askEmail(u: { email: string; full_name: string | null }) {
  const first = (u.full_name || '').trim().split(/\s+/)[0] || 'there';
  const subject = 'Welcome to Gabriola Connects';
  const body =
    `Hi ${first},\n\n` +
    `Thanks for signing up to Gabriola Connects. I check each new member so people on the platform know who they're talking to.\n\n` +
    `Do you live on Gabriola, full time or part of the year, or are you connected to the island some other way? ` +
    `Either way you're welcome, I just want to mark your profile correctly.\n\n` +
    `Alex Strachan\nGabriolaConnects.ca`;
  return `mailto:${u.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

interface NewUser {
  id: string;
  email: string;
  full_name: string | null;
  postal_code: string | null;
  is_resident: boolean;
  resident_review: Review;
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
      .select('id, email, full_name, postal_code, is_resident, resident_review, created_at, last_sign_in_at')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (!error && data) {
      setNewUsers(data as NewUser[]);
    }
    setLoading(false);
  };

  const review = async (u: NewUser, choice: Review) => {
    if (choice === 'spam' && !confirm(`Mark ${u.full_name || u.email} as spam / fake? This bans the account. You can undo it.`)) {
      return;
    }
    const userId = u.id;
    setProcessing(userId);
    
    const { data: updated, error } = await supabase.rpc('set_resident_review', { target_user: userId, choice });

    if (error) {
      alert('Error saving the review: ' + error.message);
    } else if (!updated) {
      alert('That user could not be found. Refresh the page and try again.');
    } else {
      await fetchNewUsers();
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
  const statusOf = (u: NewUser): Review => u.resident_review || (u.is_resident ? 'resident' : 'pending');
  const pendingVerification = newUsers.filter(u => statusOf(u) === 'pending').length;
  const reviewedCount = newUsers.length - pendingVerification;

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
          <p className="text-gray-600 font-medium">Waiting for Review</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <span className="text-3xl font-bold text-gray-900">{reviewedCount}</span>
          </div>
          <p className="text-gray-600 font-medium">Reviewed (7 days)</p>
        </div>
      </div>

      {/* Pending Verification Alert */}
      {pendingVerification > 0 && (
        <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-6 mb-8">
          <div className="flex items-start gap-4">
            <XCircle className="w-8 h-8 text-orange-600 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold text-orange-900 mb-2">
                ⚠️ {pendingVerification} New Member{pendingVerification !== 1 ? 's' : ''} Waiting for Review
              </h2>
              <p className="text-orange-800">
                Mark each one as a Gabriola resident, a member who isn&apos;t a resident, or spam.
                Residents and non-residents can both post and comment; only residents get the Resident badge.
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
          newUsers.map(u => {
            const status = statusOf(u);
            const busy = processing === u.id;
            return (
            <div 
              key={u.id} 
              className={`bg-white rounded-lg shadow-md p-6 border-2 ${REVIEW_STYLE[status].card}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  {/* User Header */}
                  <div className="flex items-center gap-3 mb-3">
                    {status === 'resident' ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : status === 'not_resident' ? (
                      <UserCheck className="w-6 h-6 text-blue-700" />
                    ) : status === 'spam' ? (
                      <Ban className="w-6 h-6 text-red-600" />
                    ) : (
                      <XCircle className="w-6 h-6 text-orange-600" />
                    )}
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {u.full_name || 'No name provided'}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${REVIEW_STYLE[status].text}`}>
                          {REVIEW_LABEL[status]}
                        </span>
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
                  {!u.postal_code && status === 'pending' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-3">
                      <p className="text-sm text-yellow-800">
                        ⚠️ No postal code provided - may not be a resident
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="ml-4 flex flex-col gap-2">
                  {busy && (
                    <div className="px-4 py-2 flex items-center justify-center gap-2 text-gray-700" role="status">
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                    </div>
                  )}
                  {!busy && status === 'pending' && (
                    <>
                      <button
                        onClick={() => review(u, 'resident')}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 whitespace-nowrap"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Verify Resident
                      </button>
                      <button
                        onClick={() => review(u, 'not_resident')}
                        className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 flex items-center gap-2 whitespace-nowrap"
                      >
                        <UserCheck className="w-4 h-4" />
                        Not a Resident
                      </button>
                      <button
                        onClick={() => review(u, 'spam')}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 whitespace-nowrap"
                      >
                        <Ban className="w-4 h-4" />
                        Spam / Fake
                      </button>
                    </>
                  )}
                  {!busy && status !== 'pending' && (
                    <button
                      onClick={() => review(u, 'pending')}
                      className="px-4 py-2 bg-white border-2 border-gray-400 text-gray-800 rounded-lg hover:bg-gray-100 flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <Undo2 className="w-4 h-4" />
                      Undo
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
                    onClick={() => window.location.href = askEmail(u)}
                    title="Opens a short note asking where they live"
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <Mail className="w-4 h-4" />
                    Email
                  </button>
                </div>
              </div>
            </div>
            );
          })
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
          <li>• <strong>Verify Resident:</strong> Resident badge, can post and comment</li>
          <li>• <strong>Not a Resident:</strong> still a full member who can post and comment, no Resident badge. Limit their forum use on Admin &gt; Users if needed</li>
          <li>• <strong>Spam / Fake:</strong> bans the account. Undo lifts the ban. Deleting an account is still done in Supabase</li>
        </ul>
      </div>
    </div>
  );
}
