// app/admin/directory/claims/page.tsx
// Ownership requests: members asking to be connected to a business in the Directory.
// Approve makes them the owner (they get the Edit button); they get a message either way.
// Version: 1.0.0
// Date: 2026-10-22
// Needs sql/2026-10-22-directory-claims.sql
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { ArrowLeft, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface Claim {
  id: string;
  business_id: string;
  business_name: string;
  current_owner: string | null;
  user_id: string;
  member_name: string | null;
  member_email: string | null;
  member_joined: string | null;
  note: string | null;
  status: 'pending' | 'approved' | 'declined';
  created_at: string;
  reviewed_at: string | null;
}

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Vancouver' }) : '';

export default function DirectoryClaimsPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  const isAdmin = !!(user?.is_super_admin || (user as any)?.admin_directory);

  const load = async () => {
    const { data, error } = await supabase.rpc('admin_directory_claims');
    if (error) {
      console.error('Error loading claims:', error);
      setError('Couldn\'t load the requests. Has sql/2026-10-22-directory-claims.sql been run?');
    } else {
      setClaims((data as Claim[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (userLoading) return;
    if (!isAdmin) {
      router.push('/');
      return;
    }
    load();
  }, [userLoading, isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  const review = async (c: Claim, approve: boolean) => {
    const question = approve
      ? `Make ${c.member_name || c.member_email} the owner of "${c.business_name}"? They'll be able to edit it.`
      : `Decline ${c.member_name || c.member_email}'s request for "${c.business_name}"?`;
    if (!confirm(question)) return;
    setBusy(c.id);
    const { error } = await supabase.rpc('review_directory_claim', { p_claim: c.id, p_approve: approve });
    if (error) {
      console.error('Error reviewing claim:', error);
      alert('Sorry, that didn\'t work: ' + error.message);
    }
    await load();
    setBusy(null);
  };

  const pending = claims.filter(c => c.status === 'pending');
  const done = claims.filter(c => c.status !== 'pending');

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/admin/directory" className="inline-flex items-center gap-1 text-sm font-semibold text-gabriola-green mb-4">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Directory Management
      </Link>
      <h1 className="text-3xl font-bold text-gabriola-green mb-1">Ownership requests</h1>
      <p className="text-gray-600 mb-6">
        Members asking to be connected to a business so they can edit its listing. Check they really
        run it before approving.
      </p>

      {loading || userLoading ? (
        <p className="text-gray-600" role="status">Loading...</p>
      ) : error ? (
        <p className="font-semibold text-red-700" role="alert">{error}</p>
      ) : (
        <>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Waiting ({pending.length})</h2>
          {pending.length === 0 ? (
            <p className="text-gray-600 mb-8">No requests waiting.</p>
          ) : (
            <ul className="space-y-3 mb-8">
              {pending.map(c => (
                <li key={c.id} className="bg-white border-2 border-gray-200 rounded-xl p-4">
                  <p className="text-lg font-bold text-gray-900">{c.business_name}</p>
                  <p className="text-sm text-gray-700 mt-1">
                    <span className="font-semibold">{c.member_name || 'No name'}</span>
                    {c.member_email && <> · <a href={`mailto:${c.member_email}`} className="text-blue-700 hover:underline">{c.member_email}</a></>}
                    {c.member_joined && <> · member since {fmt(c.member_joined)}</>}
                  </p>
                  <p className="text-sm text-gray-600">Asked {fmt(c.created_at)}{c.current_owner ? ` · listing currently under ${c.current_owner}` : ''}</p>
                  {c.note && (
                    <p className="mt-2 p-3 bg-gray-50 rounded-lg text-gray-800 whitespace-pre-line break-words">{c.note}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => review(c, true)}
                      disabled={busy === c.id}
                      className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-lg bg-gabriola-green text-white font-semibold hover:bg-gabriola-green-dark disabled:opacity-60"
                    >
                      {busy === c.id ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <CheckCircle className="w-4 h-4" aria-hidden="true" />}
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => review(c, false)}
                      disabled={busy === c.id}
                      className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-lg border-2 border-gray-300 font-semibold hover:border-red-400 hover:text-red-700 disabled:opacity-60"
                    >
                      <XCircle className="w-4 h-4" aria-hidden="true" />
                      Decline
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {done.length > 0 && (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-3">Last 30 days</h2>
              <ul className="divide-y divide-gray-200 bg-white border-2 border-gray-200 rounded-xl">
                {done.map(c => (
                  <li key={c.id} className="px-4 py-3 text-sm flex flex-wrap gap-x-2">
                    <span className="font-semibold">{c.business_name}</span>
                    <span>· {c.member_name || c.member_email}</span>
                    <span className={c.status === 'approved' ? 'text-green-700 font-semibold' : 'text-gray-600 font-semibold'}>
                      · {c.status === 'approved' ? 'Approved' : 'Declined'} {fmt(c.reviewed_at)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
