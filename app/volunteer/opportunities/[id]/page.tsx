// app/volunteer/opportunities/[id]/page.tsx
// Version: 2.0.1 - Interest is saved under volunteer_id (the column the database actually uses)
// Previous: 2.0.0 - Rebuilt: "I'm interested" (with an optional note) messages the poster on Gabriola
//                  Connects; poster contact details show; Share; poster and admins can edit or close
// Previous: 1.0.5 - Clean rebuild with verified syntax
// Date: 2026-10-13
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, CalendarDays, Clock, Users, Mail, Phone, Check, Pencil } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import Footer from '@/components/Footer';
import ShareButton from '@/components/ShareButton';
import PostBody from '@/components/PostBody';
import SendMessageModal from '@/components/SendMessageModal';
import { LISTING_COLUMNS, VolunteerListing, categoryLabel, formatListingDate, statusLabel } from '@/lib/volunteer';

export default function VolunteerListingPage() {
  const { user } = useUser();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [listing, setListing] = useState<VolunteerListing | null>(null);
  const [posterName, setPosterName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [myInterest, setMyInterest] = useState<{ id: string } | null>(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [messaging, setMessaging] = useState(false);

  const isAdmin = !!(user?.is_super_admin || (user as any)?.admin_volunteer);
  const isPoster = !!user && listing?.posted_by === user.id;

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    if (user) loadMyInterest();
    else setMyInterest(null);
  }, [id, user?.id]);

  const load = async () => {
    const { data } = await supabase
      .from('volunteer_opportunities')
      .select(LISTING_COLUMNS)
      .eq('id', id)
      .maybeSingle();
    setListing((data as VolunteerListing) || null);
    setLoading(false);

    const { data: name } = await supabase.rpc('volunteer_poster_name', { listing_id: id });
    if (typeof name === 'string') setPosterName(name);
  };

  const loadMyInterest = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('volunteer_applications')
      .select('id')
      .eq('opportunity_id', id)
      .eq('volunteer_id', user.id)
      .maybeSingle();
    setMyInterest(data || null);
  };

  const sayInterested = async () => {
    if (!user) {
      router.push('/signin');
      return;
    }
    setSending(true);
    setError('');
    const { error } = await supabase
      .from('volunteer_applications')
      .insert({ opportunity_id: id, volunteer_id: user.id, status: 'pending', message: note.trim() || null });
    if (error && error.code !== '23505') {
      console.error('Error saying interested:', error);
      setError('Sorry, that didn\'t go through. Please try again.');
    } else {
      setNote('');
      await loadMyInterest();
    }
    setSending(false);
  };

  const withdraw = async () => {
    if (!myInterest) return;
    if (!confirm('Take back your interest in this opportunity?')) return;
    const { error } = await supabase.from('volunteer_applications').delete().eq('id', myInterest.id);
    if (!error) setMyInterest(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F6F2EA]">
        <p className="flex-1 text-center py-16 text-[#5B6660]" role="status">Loading...</p>
        <Footer />
      </div>
    );
  }

  const status = listing ? statusLabel(listing) : '';
  const isOpen = status === 'Live';

  if (!listing || (listing.deleted_at && !isAdmin && !isPoster)) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F6F2EA]">
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white border border-[#E3DCCF] rounded-2xl p-6 text-center max-w-sm">
            <h1 className="font-display text-xl font-bold text-gabriola-green-dark mb-1">Listing not found</h1>
            <p className="text-sm text-[#5B6660] mb-3">It may have been filled or taken down.</p>
            <Link href="/volunteer" className="text-sm font-semibold text-gabriola-green">← All volunteer opportunities</Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const date = formatListingDate(listing.start_date);
  const url = `https://www.gabriolaconnects.ca/volunteer/opportunities/${listing.id}`;

  return (
    <div className="flex flex-col min-h-screen bg-[#F6F2EA] text-[#1F2A24]">
      <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-4 space-y-3">
        <Link href="/volunteer" className="inline-flex items-center gap-1 text-sm font-semibold text-gabriola-green">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Volunteer
        </Link>

        <article className="bg-white border border-[#E3DCCF] rounded-2xl p-4 md:p-6">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold mb-2">
            <span className="text-gabriola-green">{categoryLabel(listing.category)}</span>
            {!isOpen && <span className="px-2 py-0.5 rounded-full bg-[#EEE8DD] text-[#5B6660]">{status}</span>}
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-gabriola-green-dark leading-tight mb-1">{listing.title}</h1>
          <p className="text-sm text-[#5B6660] mb-4">
            {listing.organization_name ? listing.organization_name : 'Posted by a neighbour'}
            {posterName && <> · posted by {posterName}</>}
          </p>

          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm mb-5">
            <div className="flex items-start gap-2">
              <CalendarDays className="w-4 h-4 mt-0.5 text-gabriola-green" aria-hidden="true" />
              <div><dt className="sr-only">Date</dt><dd>{date || 'Ongoing'}</dd></div>
            </div>
            {listing.time_commitment && (
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 mt-0.5 text-gabriola-green" aria-hidden="true" />
                <div><dt className="sr-only">When and how long</dt><dd>{listing.time_commitment}</dd></div>
              </div>
            )}
            {listing.location && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 text-gabriola-green" aria-hidden="true" />
                <div><dt className="sr-only">Where</dt><dd>{listing.location}</dd></div>
              </div>
            )}
            {!!listing.volunteers_needed && (
              <div className="flex items-start gap-2">
                <Users className="w-4 h-4 mt-0.5 text-gabriola-green" aria-hidden="true" />
                <div><dt className="sr-only">Volunteers needed</dt><dd>{listing.volunteers_needed} volunteer{listing.volunteers_needed === 1 ? '' : 's'} needed</dd></div>
              </div>
            )}
          </dl>

          <PostBody text={listing.description} className="text-[#1F2A24] leading-relaxed break-words" />

          {(listing.coordinator_email || listing.coordinator_phone) && (
            <div className="mt-5 pt-4 border-t border-[#E3DCCF] flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {listing.coordinator_email && (
                <a href={`mailto:${listing.coordinator_email}`} className="flex items-center gap-1.5 font-semibold text-gabriola-green hover:underline break-all">
                  <Mail className="w-4 h-4" aria-hidden="true" /> {listing.coordinator_email}
                </a>
              )}
              {listing.coordinator_phone && (
                <a href={`tel:${listing.coordinator_phone.replace(/[^\d+]/g, '')}`} className="flex items-center gap-1.5 font-semibold text-gabriola-green hover:underline">
                  <Phone className="w-4 h-4" aria-hidden="true" /> {listing.coordinator_phone}
                </a>
              )}
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-[#E3DCCF] flex flex-wrap items-center gap-2">
            <ShareButton url={url} title={listing.title} />
            {(isPoster || isAdmin) && (
              <Link href={`/volunteer/opportunities/${listing.id}/edit`}
                className="inline-flex items-center gap-1.5 min-h-[36px] px-2.5 rounded-lg font-semibold text-blue-700 hover:bg-blue-50">
                <Pencil className="w-4 h-4" aria-hidden="true" /> Edit
              </Link>
            )}
            {isPoster && (
              <Link href="/volunteer/mine" className="inline-flex items-center min-h-[36px] px-2.5 rounded-lg font-semibold text-gabriola-green hover:bg-[#E6EFE8]">
                See who's interested
              </Link>
            )}
          </div>
        </article>

        {/* I'm interested */}
        {!isPoster && isOpen && (
          <section className="bg-white border border-[#E3DCCF] rounded-2xl p-4 md:p-6" aria-label="Volunteer for this">
            {myInterest ? (
              <div className="space-y-2">
                <p className="flex items-center gap-2 font-semibold text-gabriola-green-dark">
                  <Check className="w-5 h-5" aria-hidden="true" /> You said you're interested.
                </p>
                <p className="text-sm text-[#5B6660]">The poster has been sent a message and will get in touch.</p>
                <div className="flex flex-wrap gap-3 pt-1">
                  <button type="button" onClick={() => setMessaging(true)} className="text-sm font-semibold text-gabriola-green hover:underline">Message the poster</button>
                  <button type="button" onClick={withdraw} className="text-sm font-semibold text-[#5B6660] hover:underline">Take back my interest</button>
                </div>
              </div>
            ) : user ? (
              <div className="space-y-3">
                <h2 className="font-bold text-lg">Want to help?</h2>
                <p className="text-sm text-[#5B6660]">
                  The poster gets a message on Gabriola Connects with your name and your note, and can reply to you there.
                </p>
                <label htmlFor="interest-note" className="block text-sm font-semibold">A note for the poster (optional)</label>
                <textarea id="interest-note" value={note} onChange={e => setNote(e.target.value)} maxLength={1000}
                  placeholder="e.g. I'm free that morning and have a truck."
                  className="w-full min-h-[90px] px-3 py-2 rounded-lg border border-[#CFC6B4] text-base focus:outline-none focus:ring-2 focus:ring-gabriola-green" />
                {error && <p className="text-sm font-semibold text-[#B42318]" role="alert">{error}</p>}
                <button type="button" onClick={sayInterested} disabled={sending}
                  className="min-h-[44px] px-5 rounded-lg bg-gabriola-green text-white font-semibold hover:bg-gabriola-green-dark disabled:opacity-60">
                  {sending ? 'Sending...' : "I'm interested"}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <h2 className="font-bold text-lg">Want to help?</h2>
                <p className="text-sm text-[#5B6660]">Sign in to let the poster know you're interested.</p>
                <div className="flex gap-2">
                  <Link href="/signin" className="inline-flex items-center min-h-[44px] px-4 rounded-lg bg-gabriola-green text-white font-semibold">Sign in</Link>
                  <Link href="/signup" className="inline-flex items-center min-h-[44px] px-4 rounded-lg border border-[#CFC6B4] bg-white font-semibold">Sign up free</Link>
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      {messaging && user && listing && (
        <SendMessageModal
          recipientId={listing.posted_by}
          recipientName={posterName || 'the poster'}
          currentUserId={user.id}
          onClose={() => setMessaging(false)}
        />
      )}
      <Footer />
    </div>
  );
}
