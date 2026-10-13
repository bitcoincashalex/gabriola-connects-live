// app/volunteer/page.tsx
// Version: 2.0.0 - Rebuilt: current listings only (one-day listings drop off after their date),
//                  categories that match the listings, Post an opportunity, forum look
// Previous: 1.0.5 - Clean rebuild with verified syntax
// Date: 2026-10-13
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, MapPin, CalendarDays, Clock, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import Footer from '@/components/Footer';
import {
  VOLUNTEER_CATEGORIES, LISTING_COLUMNS, VolunteerListing,
  categoryId, categoryLabel, formatListingDate, pacificToday,
} from '@/lib/volunteer';

export default function VolunteerPage() {
  const { user } = useUser();
  const [listings, setListings] = useState<VolunteerListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [category, setCategory] = useState('all');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    setFailed(false);
    const { data, error } = await supabase
      .from('volunteer_opportunities')
      .select(LISTING_COLUMNS)
      .eq('status', 'active')
      .eq('is_approved', true)
      .is('deleted_at', null)
      .or(`start_date.is.null,start_date.gte.${pacificToday()}`)
      .order('start_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading volunteer listings:', error);
      setFailed(true);
    }
    setListings((data as VolunteerListing[]) || []);
    setLoading(false);
  };

  const shown = category === 'all' ? listings : listings.filter(l => categoryId(l.category) === category);
  const usedCategories = VOLUNTEER_CATEGORIES.filter(c => listings.some(l => categoryId(l.category) === c.id));

  const chip = (selected: boolean) =>
    `flex-shrink-0 px-4 min-h-[40px] rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
      selected ? 'bg-gabriola-green text-white' : 'bg-white border border-[#CFC6B4] text-[#1F2A24] hover:border-gabriola-green'
    }`;

  return (
    <div className="flex flex-col min-h-screen bg-[#F6F2EA] text-[#1F2A24]">
      <div className="flex-1">
        <div className="bg-white border-b border-[#E3DCCF]">
          <div className="max-w-5xl mx-auto px-4 pt-4 pb-3 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="font-display text-[26px] md:text-3xl font-bold text-gabriola-green-dark leading-tight">Volunteer</h1>
                <p className="text-sm md:text-base text-[#5B6660]">Lend a hand on Gabriola. Groups and neighbours post what they need help with.</p>
              </div>
              <Link
                href={user ? '/volunteer/new' : '/signin'}
                className="flex-shrink-0 flex items-center gap-1.5 min-h-[44px] px-4 rounded-lg bg-gabriola-green text-white text-sm font-semibold hover:bg-gabriola-green-dark transition-colors"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">Post an opportunity</span>
                <span className="sm:hidden">Post</span>
              </Link>
            </div>

            {user && (
              <Link href="/volunteer/mine" className="inline-block text-sm font-semibold text-gabriola-green hover:underline">
                My listings and who's interested →
              </Link>
            )}

            {usedCategories.length > 1 && (
              <div className="-mx-4 px-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:px-0 md:flex-wrap md:overflow-visible" aria-label="Categories">
                <button type="button" onClick={() => setCategory('all')} className={chip(category === 'all')}>All</button>
                {usedCategories.map(c => (
                  <button key={c.id} type="button" onClick={() => setCategory(c.id)} className={chip(category === c.id)}>
                    {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-4">
          {loading ? (
            <p className="text-center py-16 text-[#5B6660]" role="status">Loading opportunities...</p>
          ) : failed ? (
            <div className="text-center py-16">
              <p className="text-[#5B6660] mb-3">Couldn't load the listings.</p>
              <button type="button" onClick={load} className="min-h-[44px] px-4 rounded-lg border border-[#CFC6B4] bg-white font-semibold">Try again</button>
            </div>
          ) : shown.length === 0 ? (
            <div className="text-center py-14 bg-white border border-[#E3DCCF] rounded-2xl px-4">
              <p className="font-semibold text-gabriola-green-dark mb-1">No volunteer opportunities right now</p>
              <p className="text-sm text-[#5B6660] mb-4">Does your group need a hand? Post it here and islanders can let you know they're interested.</p>
              <Link
                href={user ? '/volunteer/new' : '/signin'}
                className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-lg bg-gabriola-green text-white text-sm font-semibold hover:bg-gabriola-green-dark"
              >
                <Plus className="w-4 h-4" aria-hidden="true" /> Post an opportunity
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {shown.map(l => {
                const date = formatListingDate(l.start_date);
                return (
                  <Link
                    key={l.id}
                    href={`/volunteer/opportunities/${l.id}`}
                    className="block bg-white border border-[#E3DCCF] rounded-2xl p-4 hover:border-gabriola-green transition-colors"
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold mb-1">
                      <span className="text-gabriola-green">{categoryLabel(l.category)}</span>
                      {l.organization_name && <span className="text-[#5B6660]">· {l.organization_name}</span>}
                    </div>
                    <h2 className="text-lg font-bold text-[#1F2A24] leading-snug mb-1.5">{l.title}</h2>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#5B6660]">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-4 h-4" aria-hidden="true" />
                        {date || 'Ongoing'}
                      </span>
                      {l.time_commitment && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" aria-hidden="true" />
                          {l.time_commitment}
                        </span>
                      )}
                      {l.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" aria-hidden="true" />
                          {l.location}
                        </span>
                      )}
                      {!!l.volunteers_needed && (
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" aria-hidden="true" />
                          {l.volunteers_needed} needed
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
