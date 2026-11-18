// components/CommunityHubCards.tsx
// The six Community Hub cards, each showing what's live in its section right now: the newest
// forum discussions and Community Voices column, the emergency numbers people look up most,
// open volunteer listings, what's on Buy, Sell, Rent & Free, and the latest Island News.
// Version: 1.0.0
// Date: 2026-11-18
//
// Each card's heading links to its page; the live lines under it are links of their own (a link
// can't sit inside another link). On phones the forum card shows one discussion, not three, so
// the cards stay short. If something can't be loaded, that card just shows its description.

'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { MessageSquare, AlertCircle, Map, Newspaper, Heart, Tag, ChevronRight, PenLine, type LucideIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { NEWS_AUTHOR_ID, COMMUNITY_VOICES } from '@/lib/forum';
import { isRental, isLostFound, type ListingKind } from '@/lib/marketplace';
import { RCMP_NON_EMERGENCY, MEDICAL_CLINIC } from '@/lib/emergencyContacts';
import { GABRIOLA_TZ } from '@/lib/gabriolaTime';
import { pacificToday } from '@/lib/volunteer';

interface Post { id: string; title: string }
interface Live {
  discussions: Post[];
  voices: Post | null;
  volunteerCount: number;
  volunteerNewest: { id: string; title: string; organization_name: string | null } | null;
  market: { sale: number; rent: number; wanted: number; free: number; lostFound: number };
  marketNewest: Post | null;
  news: (Post & { created_at: string }) | null;
}

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-CA', { timeZone: GABRIOLA_TZ, month: 'short', day: 'numeric' });

function Card({ href, icon: Icon, title, text, chip, children }: {
  href: string; icon: LucideIcon; title: string; text: string; chip: string; children?: ReactNode;
}) {
  return (
    <div className="bg-white border border-[#E3DCCF] rounded-2xl shadow-sm hover:shadow-md hover:border-[#CFC6B4] transition-shadow">
      <Link href={href} className={`group flex items-center gap-3 px-3.5 pt-2.5 md:px-5 md:pt-5 min-h-[56px] ${children ? 'pb-2 md:pb-3' : 'pb-2.5 md:pb-5'}`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${chip}`}>
          <Icon className="w-[22px] h-[22px]" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-[18px] md:text-[21px] font-bold leading-tight text-gabriola-green-dark">{title}</h2>
          <p className="text-[13px] md:text-sm text-[#5B6660] leading-snug mt-0.5">{text}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-[#5B6660] flex-shrink-0 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
      </Link>
      {children && (
        <div className="px-3.5 pb-3 md:px-5 md:pb-5 md:pl-[72px] pl-[66px] space-y-1 text-[14px] md:text-[15px] leading-snug">
          {children}
        </div>
      )}
    </div>
  );
}

const lineLink = 'block truncate text-[#1F2A24] hover:text-gabriola-green hover:underline';

export default function CommunityHubCards() {
  const [live, setLive] = useState<Live | null>(null);

  useEffect(() => {
    (async () => {
      const nowIso = new Date().toISOString();
      const [disc, voices, vol, market, news] = await Promise.all([
        supabase.from('bbs_posts').select('id, title')
          .eq('is_active', true).is('deleted_at', null)
          .neq('user_id', NEWS_AUTHOR_ID)
          .or(`category.is.null,category.neq.${COMMUNITY_VOICES}`)
          .order('created_at', { ascending: false }).limit(3),
        supabase.from('bbs_posts').select('id, title')
          .eq('category', COMMUNITY_VOICES).eq('is_active', true).is('deleted_at', null)
          .order('created_at', { ascending: false }).limit(1),
        supabase.from('volunteer_opportunities').select('id, title, organization_name')
          .eq('status', 'active').eq('is_approved', true).is('deleted_at', null)
          .or(`start_date.is.null,start_date.gte.${pacificToday()}`)
          .order('created_at', { ascending: false }),
        supabase.from('marketplace_listings').select('id, title, kind, category')
          .eq('status', 'active').gt('expires_at', nowIso)
          .order('created_at', { ascending: false }).limit(300),
        supabase.from('bbs_posts').select('id, title, created_at')
          .eq('user_id', NEWS_AUTHOR_ID).eq('is_active', true).is('deleted_at', null)
          .order('created_at', { ascending: false }).limit(1),
      ]);

      const listings = (market.data as { id: string; title: string; kind: ListingKind; category: string }[]) || [];
      const counts = { sale: 0, rent: 0, wanted: 0, free: 0, lostFound: 0 };
      for (const l of listings) {
        if (isRental(l)) counts.rent++;
        else if (isLostFound(l.kind)) counts.lostFound++;
        else if (l.kind === 'sale') counts.sale++;
        else if (l.kind === 'wanted') counts.wanted++;
        else if (l.kind === 'free') counts.free++;
      }
      const vols = (vol.data as Live['volunteerNewest'][]) || [];

      setLive({
        discussions: (disc.data as Post[]) || [],
        voices: (voices.data as Post[])?.[0] || null,
        volunteerCount: vols.length,
        volunteerNewest: vols[0] || null,
        market: counts,
        marketNewest: listings[0] ? { id: listings[0].id, title: listings[0].title } : null,
        news: (news.data as Live['news'][])?.[0] || null,
      });
    })().catch(err => console.error('[community hub] load failed:', err));
  }, []);

  const m = live?.market;
  const marketParts = m ? [
    m.sale && `${m.sale} for sale`,
    m.rent && `${m.rent} for rent`,
    m.wanted && `${m.wanted} wanted`,
    m.free && `${m.free} free`,
    m.lostFound && `${m.lostFound} lost & found`,
  ].filter(Boolean) as string[] : [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
      <Card href="/community" icon={MessageSquare} title="Forum" chip="bg-[#E6EFE8] text-gabriola-green"
        text="Connect with your community, ask questions, share information">
        {live && (live.voices || live.discussions.length > 0) && (<>
        {live.voices && (
          <Link href={`/community/thread/${live.voices.id}`} className={`${lineLink} flex items-center gap-1.5`}>
            <span className="inline-flex items-center gap-1 flex-shrink-0 px-1.5 py-0.5 rounded bg-[#F3E8F1] text-[#7A3E72] text-[11px] font-bold">
              <PenLine className="w-3 h-3" aria-hidden="true" />OPINION
            </span>
            <span className="truncate">{live.voices.title}</span>
          </Link>
        )}
        {live.discussions.map((p, i) => (
          <Link key={p.id} href={`/community/thread/${p.id}`} className={`${lineLink} ${i > 0 ? 'hidden md:block' : ''}`}>
            {p.title}
          </Link>
        ))}
        </>)}
      </Card>

      <Card href="/emergency" icon={AlertCircle} title="Emergency Contacts" chip="bg-red-50 text-red-600"
        text="Important phone numbers for Gabriola Island emergencies">
        <p className="flex flex-wrap gap-x-3 gap-y-1">
          <a href="tel:911" className="font-bold text-red-600 hover:underline">Emergency: 911</a>
          <a href={`tel:${RCMP_NON_EMERGENCY.phone}`} className="text-[#1F2A24] hover:underline">
            RCMP non-emergency <span className="font-semibold whitespace-nowrap">{RCMP_NON_EMERGENCY.phone}</span>
          </a>
          <a href={`tel:${MEDICAL_CLINIC.phone}`} className="text-[#1F2A24] hover:underline">
            Medical clinic <span className="font-semibold whitespace-nowrap">{MEDICAL_CLINIC.phone}</span>
          </a>
        </p>
      </Card>

      <Card href="/volunteer" icon={Heart} title="Volunteer Opportunities" chip="bg-[#E6EFE8] text-gabriola-green"
        text="Help out in your community and make a difference">
        {live && live.volunteerCount > 0 && (
          <>
            <p className="text-[#5B6660]">
              {live.volunteerCount} {live.volunteerCount === 1 ? 'listing' : 'listings'} looking for help
            </p>
            {live.volunteerNewest && (
              <Link href={`/volunteer/opportunities/${live.volunteerNewest.id}`} className={lineLink}>
                Newest: {live.volunteerNewest.title}
                {live.volunteerNewest.organization_name ? ` (${live.volunteerNewest.organization_name})` : ''}
              </Link>
            )}
          </>
        )}
      </Card>

      <Card href="/map" icon={Map} title="Island Map" chip="bg-amber-50 text-[#9A4A00]"
        text="Parks, beaches, trails, businesses, venues and the ferry, with you on the map" />

      <Card href="/marketplace" icon={Tag} title="Buy, Sell, Rent & Free" chip="bg-[#E3E8F4] text-[#002774]"
        text="Things for sale, places for rent, things wanted, and things free to a good home">
        {live?.marketNewest && (<>
          {marketParts.length > 0 && <p className="text-[#5B6660]">{marketParts.join(' · ')}</p>}
          <Link href={`/marketplace/${live.marketNewest.id}`} className={lineLink}>
            Newest: {live.marketNewest.title}
          </Link>
        </>)}
      </Card>

      <Card href="/news" icon={Newspaper} title="Island News" chip="bg-[#E3E8F4] text-[#002774]"
        text="Stay updated with community announcements and local news">
        {live?.news && (
          <Link href={`/community/thread/${live.news.id}`} className={lineLink}>
            <span className="text-[#5B6660]">{dateLabel(live.news.created_at)} · </span>{live.news.title}
          </Link>
        )}
      </Card>
    </div>
  );
}
