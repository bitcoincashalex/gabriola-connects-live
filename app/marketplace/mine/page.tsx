// app/marketplace/mine/page.tsx
// My Buy, Sell & Free listings: live, sold and expired, with days left
// Version: 1.1.0 - Includes listings posted without a name (marked "Name not shown")
// Previous: 1.0.1 - Says rentals stay up for 60 days
// Previous: 1.0.0 (2026-10-20)
// Date: 2026-10-22
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, ImageOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import Footer from '@/components/Footer';
import { LISTING_COLUMNS, Listing, priceLabel, kindLabel, listingState, daysLeft, isLive } from '@/lib/marketplace';

export default function MyListingsPage() {
  const { user, loading: userLoading } = useUser();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    (async () => {
      // Listings posted without a name have no account on them: the database lists those for us
      const { data: anon } = await supabase.rpc('my_anonymous_listings');
      const anonIds: string[] = Array.isArray(anon) ? anon.map((r: any) => (typeof r === 'string' ? r : r.my_anonymous_listings)).filter(Boolean) : [];
      const mine = anonIds.length ? `user_id.eq.${user.id},id.in.(${anonIds.join(',')})` : `user_id.eq.${user.id}`;
      const { data } = await supabase
        .from('marketplace_listings')
        .select(LISTING_COLUMNS)
        .or(mine)
        .order('created_at', { ascending: false });
      setListings((data as Listing[]) || []);
      setLoading(false);
    })();
  }, [user?.id]);

  return (
    <div className="flex flex-col min-h-screen bg-[#F6F2EA] text-[#1F2A24]">
      <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-4 space-y-3">
        <Link href="/marketplace" className="inline-flex items-center gap-1 text-sm font-semibold text-gabriola-green">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Buy, Sell & Free
        </Link>
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-bold text-gabriola-green-dark">My listings</h1>
          {user && (
            <Link href="/marketplace/new"
              className="flex items-center gap-1.5 min-h-[44px] px-4 rounded-lg bg-gabriola-green text-white text-sm font-semibold hover:bg-gabriola-green-dark">
              <Plus className="w-4 h-4" aria-hidden="true" /> Post
            </Link>
          )}
        </div>

        {loading || userLoading ? (
          <p className="text-center py-16 text-[#5B6660]" role="status">Loading...</p>
        ) : !user ? (
          <div className="bg-white border border-[#E3DCCF] rounded-2xl p-6 text-center">
            <p className="mb-3">Please sign in to see your listings.</p>
            <Link href="/signin" className="inline-flex items-center min-h-[44px] px-4 rounded-lg bg-gabriola-green text-white font-semibold">Sign in</Link>
          </div>
        ) : listings.length === 0 ? (
          <div className="bg-white border border-[#E3DCCF] rounded-2xl p-6 text-center">
            <p className="font-semibold text-gabriola-green-dark mb-1">You haven't posted anything yet</p>
            <p className="text-sm text-[#5B6660]">Listings stay up for 30 days (rentals 60), and you can renew them from here.</p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {listings.map(l => {
              const state = listingState(l);
              return (
                <li key={l.id}>
                  <Link href={`/marketplace/${l.id}`}
                    className="flex gap-3 bg-white border border-[#E3DCCF] rounded-2xl p-3 hover:border-gabriola-green transition-colors">
                    <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-[#EEE8DD] flex items-center justify-center text-[#A39A88]">
                      {l.photos[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={l.photos[0]} alt="" className="w-full h-full object-cover" />
                      ) : <ImageOff className="w-6 h-6" aria-hidden="true" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gabriola-green">{kindLabel(l.kind)}{priceLabel(l) && l.kind !== 'free' ? ` · ${priceLabel(l)}` : ''}{l.is_anonymous ? ' · Name not shown' : ''}</p>
                      <h2 className="font-semibold leading-snug truncate">{l.title}</h2>
                      <p className={`text-sm mt-0.5 ${isLive(l) ? 'text-[#5B6660]' : 'font-semibold text-[#9A4A00]'}`}>
                        {isLive(l) ? `Live · ${daysLeft(l)}` : state}
                        {!isLive(l) && state === 'Expired' && ' · open it to put it back up'}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <Footer />
    </div>
  );
}
