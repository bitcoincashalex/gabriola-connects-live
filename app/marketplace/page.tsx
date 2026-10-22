// app/marketplace/page.tsx
// Buy, Sell & Free: live listings as a photo grid, with For sale / Wanted / Free, category and search
// Version: 1.1.0 - "For rent" filter; rental cards show the kind of place and when it's available
// Previous: 1.0.0 (2026-10-20)
// Date: 2026-10-22
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, ImageOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import Footer from '@/components/Footer';
import {
  LISTING_COLUMNS, LISTING_CATEGORIES, LISTING_KINDS, Listing, ListingKind,
  categoryLabel, kindLabel, priceLabel, timeAgo, isRental, rentalTypeLabel, availableLabel,
} from '@/lib/marketplace';

export default function MarketplacePage() {
  const { user } = useUser();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [kind, setKind] = useState<'all' | ListingKind>('all');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    setFailed(false);
    const { data, error } = await supabase
      .from('marketplace_listings')
      .select(LISTING_COLUMNS)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(300);
    if (error) {
      console.error('Error loading listings:', error);
      setFailed(true);
    }
    setListings((data as Listing[]) || []);
    setLoading(false);
  };

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return listings.filter(l =>
      (kind === 'all' || l.kind === kind) &&
      (category === 'all' || l.category === category) &&
      (!q || l.title.toLowerCase().includes(q) || (l.description || '').toLowerCase().includes(q))
    );
  }, [listings, kind, category, search]);

  const usedCategories = LISTING_CATEGORIES.filter(c => listings.some(l => l.category === c.id));

  const chip = (selected: boolean) =>
    `flex-shrink-0 px-4 min-h-[40px] rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
      selected ? 'bg-gabriola-green text-white' : 'bg-white border border-[#CFC6B4] text-[#1F2A24] hover:border-gabriola-green'
    }`;

  const postHref = user ? '/marketplace/new' : '/signin';

  return (
    <div className="flex flex-col min-h-screen bg-[#F6F2EA] text-[#1F2A24]">
      <div className="flex-1">
        <div className="bg-white border-b border-[#E3DCCF]">
          <div className="max-w-5xl mx-auto px-4 pt-4 pb-3 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="font-display text-[26px] md:text-3xl font-bold text-gabriola-green-dark leading-tight">Buy, Sell & Free</h1>
                <p className="text-sm md:text-base text-[#5B6660]">Things for sale, places for rent, things wanted and things free to a good home, on Gabriola.</p>
              </div>
              <Link href={postHref}
                className="flex-shrink-0 flex items-center gap-1.5 min-h-[44px] px-4 rounded-lg bg-gabriola-green text-white text-sm font-semibold hover:bg-gabriola-green-dark transition-colors">
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">Post a listing</span>
                <span className="sm:hidden">Post</span>
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              {user && <Link href="/marketplace/mine" className="font-semibold text-gabriola-green hover:underline">My listings →</Link>}
              <Link href="/community" className="font-semibold text-[#5B6660] hover:underline">← Back to the forum</Link>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6660]" aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search listings..."
                aria-label="Search listings"
                className="w-full min-h-[44px] pl-9 pr-3 rounded-lg border border-[#CFC6B4] bg-white text-base focus:outline-none focus:ring-2 focus:ring-gabriola-green"
              />
            </div>

            <div className="-mx-4 px-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:px-0 md:flex-wrap md:overflow-visible" aria-label="Kind of listing">
              <button type="button" onClick={() => setKind('all')} className={chip(kind === 'all')}>All</button>
              {LISTING_KINDS.map(k => (
                <button key={k.id} type="button" onClick={() => setKind(k.id)} className={chip(kind === k.id)}>{k.label}</button>
              ))}
              {usedCategories.length > 1 && (
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  aria-label="Category"
                  className="flex-shrink-0 min-h-[40px] px-3 rounded-full border border-[#CFC6B4] bg-white text-sm font-semibold"
                >
                  <option value="all">All categories</option>
                  {usedCategories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-4">
          {loading ? (
            <p className="text-center py-16 text-[#5B6660]" role="status">Loading listings...</p>
          ) : failed ? (
            <div className="text-center py-16">
              <p className="text-[#5B6660] mb-3">Couldn't load the listings.</p>
              <button type="button" onClick={load} className="min-h-[44px] px-4 rounded-lg border border-[#CFC6B4] bg-white font-semibold">Try again</button>
            </div>
          ) : shown.length === 0 ? (
            <div className="text-center py-14 bg-white border border-[#E3DCCF] rounded-2xl px-4">
              <p className="font-semibold text-gabriola-green-dark mb-1">
                {listings.length === 0 ? 'Nothing listed yet' : 'Nothing matches that'}
              </p>
              <p className="text-sm text-[#5B6660] mb-4">
                {listings.length === 0
                  ? 'Got something to sell, give away, or something you\'re looking for? Post it here.'
                  : 'Try another search, or post what you\'re looking for as Wanted.'}
              </p>
              <Link href={postHref}
                className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-lg bg-gabriola-green text-white text-sm font-semibold hover:bg-gabriola-green-dark">
                <Plus className="w-4 h-4" aria-hidden="true" /> Post a listing
              </Link>
            </div>
          ) : (
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {shown.map(l => {
                const price = priceLabel(l);
                return (
                  <li key={l.id}>
                    <Link href={`/marketplace/${l.id}`}
                      className="block h-full bg-white border border-[#E3DCCF] rounded-2xl overflow-hidden hover:border-gabriola-green transition-colors">
                      <div className="relative aspect-square bg-[#EEE8DD]">
                        {l.photos[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={l.photos[0]} alt="" loading="lazy" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#A39A88]">
                            <ImageOff className="w-8 h-8" aria-hidden="true" />
                          </div>
                        )}
                        {l.kind !== 'sale' && (
                          <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                            l.kind === 'free' ? 'bg-gabriola-green text-white' : l.kind === 'rent' ? 'bg-[#9A4A00] text-white' : 'bg-[#002774] text-white'
                          }`}>
                            {l.kind === 'wanted' && isRental(l) ? 'Looking to rent' : kindLabel(l.kind)}
                          </span>
                        )}
                      </div>
                      <div className="p-3">
                        {price && l.kind !== 'free' && <p className="font-bold text-[#1F2A24]">{l.kind === 'wanted' ? `Budget ${price}` : price}</p>}
                        <h2 className="text-sm font-semibold text-[#1F2A24] leading-snug line-clamp-2">{l.title}</h2>
                        <p className="text-xs text-[#5B6660] mt-1">
                          {l.kind === 'rent'
                            ? `${rentalTypeLabel(l.rental_type)} · ${availableLabel(l.available_from)}`
                            : isRental(l)
                              ? `${rentalTypeLabel(l.rental_type)} · ${timeAgo(l.created_at)}`
                              : `${categoryLabel(l.category)} · ${timeAgo(l.created_at)}`}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
