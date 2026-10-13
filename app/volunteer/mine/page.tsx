// app/volunteer/mine/page.tsx
// My volunteer listings: who's interested in each, and Edit / Mark filled / Close
// Version: 1.0.0
// Date: 2026-10-13
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Mail } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import Footer from '@/components/Footer';
import SendMessageModal from '@/components/SendMessageModal';
import { LISTING_COLUMNS, VolunteerListing, formatListingDate, statusLabel } from '@/lib/volunteer';

interface Interested {
  user_id: string;
  full_name: string | null;
  message: string | null;
  created_at: string;
}

export default function MyVolunteerListings() {
  const { user, loading: userLoading } = useUser();
  const [listings, setListings] = useState<VolunteerListing[]>([]);
  const [interested, setInterested] = useState<Record<string, Interested[]>>({});
  const [loading, setLoading] = useState(true);
  const [messaging, setMessaging] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (user) load();
    else if (!userLoading) setLoading(false);
  }, [user?.id, userLoading]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('volunteer_opportunities')
      .select(LISTING_COLUMNS)
      .eq('posted_by', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    const rows = (data as VolunteerListing[]) || [];
    setListings(rows);

    const byListing: Record<string, Interested[]> = {};
    await Promise.all(rows.map(async l => {
      const { data: people } = await supabase.rpc('volunteer_interested', { listing_id: l.id });
      byListing[l.id] = (people as Interested[]) || [];
    }));
    setInterested(byListing);
    setLoading(false);
  };

  const setStatus = async (id: string, status: 'active' | 'filled' | 'closed') => {
    const { error } = await supabase.from('volunteer_opportunities').update({ status }).eq('id', id);
    if (error) alert('Sorry, that didn\'t save: ' + error.message);
    else load();
  };

  const btn = 'min-h-[40px] px-3 rounded-lg border border-[#CFC6B4] bg-white text-sm font-semibold hover:border-gabriola-green';

  return (
    <div className="flex flex-col min-h-screen bg-[#F6F2EA] text-[#1F2A24]">
      <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-4 space-y-3">
        <Link href="/volunteer" className="inline-flex items-center gap-1 text-sm font-semibold text-gabriola-green">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Volunteer
        </Link>
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-bold text-gabriola-green-dark">My volunteer listings</h1>
          {user && (
            <Link href="/volunteer/new" className="flex items-center gap-1.5 min-h-[44px] px-4 rounded-lg bg-gabriola-green text-white text-sm font-semibold">
              <Plus className="w-4 h-4" aria-hidden="true" /> Post
            </Link>
          )}
        </div>

        {loading || userLoading ? (
          <p className="text-center py-16 text-[#5B6660]" role="status">Loading...</p>
        ) : !user ? (
          <div className="bg-white border border-[#E3DCCF] rounded-2xl p-6">
            <p className="mb-3">Please sign in to see your listings.</p>
            <Link href="/signin" className="inline-flex items-center min-h-[44px] px-4 rounded-lg bg-gabriola-green text-white font-semibold">Sign in</Link>
          </div>
        ) : listings.length === 0 ? (
          <div className="bg-white border border-[#E3DCCF] rounded-2xl p-6 text-center">
            <p className="text-[#5B6660]">You haven't posted any volunteer opportunities yet.</p>
          </div>
        ) : (
          listings.map(l => {
            const people = interested[l.id] || [];
            const status = statusLabel(l);
            return (
              <section key={l.id} className="bg-white border border-[#E3DCCF] rounded-2xl p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold mb-1">
                  <span className={`px-2 py-0.5 rounded-full ${status === 'Live' ? 'bg-[#E6EFE8] text-gabriola-green-dark' : 'bg-[#EEE8DD] text-[#5B6660]'}`}>{status}</span>
                  <span className="text-[#5B6660]">{formatListingDate(l.start_date) || 'Ongoing'}</span>
                </div>
                <Link href={`/volunteer/opportunities/${l.id}`} className="text-lg font-bold hover:underline">{l.title}</Link>

                <div className="mt-3">
                  <h2 className="text-sm font-bold text-gabriola-green-dark mb-2">
                    {people.length === 0 ? 'Nobody has said they\'re interested yet' : `${people.length} interested`}
                  </h2>
                  {people.length > 0 && (
                    <ul className="divide-y divide-[#E3DCCF] border border-[#E3DCCF] rounded-xl">
                      {people.map(p => (
                        <li key={p.user_id} className="p-3 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold">{p.full_name || 'A member'}
                              <span className="font-normal text-xs text-[#5B6660]"> · {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}</span>
                            </p>
                            {p.message && <p className="text-sm text-[#1F2A24] whitespace-pre-wrap break-words mt-0.5">{p.message}</p>}
                          </div>
                          <button type="button" onClick={() => setMessaging({ id: p.user_id, name: p.full_name || 'this member' })}
                            className="flex-shrink-0 flex items-center gap-1 min-h-[40px] px-3 rounded-lg bg-[#E6EFE8] text-gabriola-green-dark text-sm font-semibold">
                            <Mail className="w-4 h-4" aria-hidden="true" /> Message
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/volunteer/opportunities/${l.id}/edit`} className={`${btn} inline-flex items-center`}>Edit</Link>
                  {l.status === 'active' ? (
                    <>
                      <button type="button" className={btn} onClick={() => setStatus(l.id, 'filled')}>Mark as filled</button>
                      <button type="button" className={btn} onClick={() => setStatus(l.id, 'closed')}>Close</button>
                    </>
                  ) : (
                    <button type="button" className={btn} onClick={() => setStatus(l.id, 'active')}>Reopen</button>
                  )}
                </div>
              </section>
            );
          })
        )}
      </div>

      {messaging && user && (
        <SendMessageModal
          recipientId={messaging.id}
          recipientName={messaging.name}
          currentUserId={user.id}
          onClose={() => setMessaging(null)}
        />
      )}
      <Footer />
    </div>
  );
}
