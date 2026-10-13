// app/admin/volunteer/page.tsx
// Version: 2.0.0 - Rebuilt: every listing with its status and interest count; Edit, Take down and
//                  Put back. (Listings go live straight away, so there is no approval queue.)
//                  Super admins and volunteer admins only.
// Previous: 1.0.5 - Clean rebuild with verified syntax
// Date: 2026-10-13
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import Footer from '@/components/Footer';
import { LISTING_COLUMNS, VolunteerListing, formatListingDate, statusLabel } from '@/lib/volunteer';

export default function AdminVolunteerPage() {
  const { user, loading: userLoading } = useUser();
  const [listings, setListings] = useState<VolunteerListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRemoved, setShowRemoved] = useState(false);

  const isAdmin = !!(user?.is_super_admin || (user as any)?.admin_volunteer);

  useEffect(() => {
    if (isAdmin) load();
    else if (!userLoading) setLoading(false);
  }, [isAdmin, userLoading]);

  const load = async () => {
    const { data, error } = await supabase
      .from('volunteer_opportunities')
      .select(LISTING_COLUMNS)
      .order('created_at', { ascending: false });
    if (error) console.error('Error loading volunteer listings:', error);
    setListings((data as VolunteerListing[]) || []);
    setLoading(false);
  };

  const takeDown = async (l: VolunteerListing) => {
    if (!confirm(`Take down "${l.title}"? It will disappear from the site. You can put it back later.`)) return;
    const { data, error } = await supabase
      .from('volunteer_opportunities')
      .update({ deleted_at: new Date().toISOString(), deleted_by: user!.id })
      .eq('id', l.id)
      .select('id');
    if (error || !data?.length) alert('Sorry, that didn\'t work.' + (error ? ' ' + error.message : ''));
    else load();
  };

  const putBack = async (l: VolunteerListing) => {
    const { data, error } = await supabase
      .from('volunteer_opportunities')
      .update({ deleted_at: null, deleted_by: null })
      .eq('id', l.id)
      .select('id');
    if (error || !data?.length) alert('Sorry, that didn\'t work.' + (error ? ' ' + error.message : ''));
    else load();
  };

  const current = listings.filter(l => !l.deleted_at);
  const removed = listings.filter(l => l.deleted_at);
  const btn = 'min-h-[40px] px-3 rounded-lg border border-[#CFC6B4] bg-white text-sm font-semibold hover:border-gabriola-green inline-flex items-center';

  const row = (l: VolunteerListing, removedRow: boolean) => {
    const status = statusLabel(l);
    return (
      <li key={l.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold mb-0.5">
            <span className={`px-2 py-0.5 rounded-full ${status === 'Live' ? 'bg-[#E6EFE8] text-gabriola-green-dark' : 'bg-[#EEE8DD] text-[#5B6660]'}`}>{status}</span>
            <span className="text-[#5B6660]">{formatListingDate(l.start_date) || 'Ongoing'}</span>
            <span className="text-[#5B6660]">· {l.application_count || 0} interested</span>
          </div>
          <Link href={`/volunteer/opportunities/${l.id}`} className="font-bold hover:underline">{l.title}</Link>
          {l.organization_name && <p className="text-sm text-[#5B6660]">{l.organization_name}</p>}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {removedRow ? (
            <button type="button" className={btn} onClick={() => putBack(l)}>Put back</button>
          ) : (
            <>
              <Link href={`/volunteer/opportunities/${l.id}/edit`} className={btn}>Edit</Link>
              <button type="button" className={`${btn} text-[#B42318]`} onClick={() => takeDown(l)}>Take down</button>
            </>
          )}
        </div>
      </li>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F6F2EA] text-[#1F2A24]">
      <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-4 space-y-3">
        <h1 className="font-display text-2xl font-bold text-gabriola-green-dark">Volunteer admin</h1>

        {loading || userLoading ? (
          <p className="text-center py-16 text-[#5B6660]" role="status">Loading...</p>
        ) : !isAdmin ? (
          <p className="bg-white border border-[#E3DCCF] rounded-2xl p-6">This page is for volunteer admins.</p>
        ) : (
          <>
            <p className="text-sm text-[#5B6660]">
              New listings go live as soon as they're posted. Take down anything that shouldn't be there.
            </p>
            <ul className="bg-white border border-[#E3DCCF] rounded-2xl divide-y divide-[#E3DCCF]">
              {current.length === 0 ? <li className="p-4 text-[#5B6660]">No listings.</li> : current.map(l => row(l, false))}
            </ul>

            {removed.length > 0 && (
              <div>
                <button type="button" onClick={() => setShowRemoved(s => !s)} className="text-sm font-semibold text-gabriola-green hover:underline">
                  {showRemoved ? 'Hide' : 'Show'} taken-down listings ({removed.length})
                </button>
                {showRemoved && (
                  <ul className="mt-2 bg-white border border-[#E3DCCF] rounded-2xl divide-y divide-[#E3DCCF]">
                    {removed.map(l => row(l, true))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
