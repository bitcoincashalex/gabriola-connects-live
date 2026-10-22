// app/marketplace/[id]/page.tsx
// One Buy, Sell & Free listing: photos, details, Message the seller, Share.
// The seller can edit, mark sold, renew or delete; admins can hide or show it.
// Version: 1.2.0 - Rentals: kind of place, rent per month, available from, furnished / pets /
//                  utilities, "Mark rented", renew for 60 days, the local-rules line
// Previous: 1.1.0 - Public questions and comments under the listing (ListingComments)
// Previous: 1.0.1 - Took out the meet-somewhere-public note
// Earlier: 1.0.0
// Date: 2026-10-22
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Pencil, Check, RotateCcw, Trash2, EyeOff, Eye, Mail, ImageOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import Footer from '@/components/Footer';
import ShareButton from '@/components/ShareButton';
import PostBody from '@/components/PostBody';
import SendMessageModal from '@/components/SendMessageModal';
import ListingComments from '@/components/ListingComments';
import {
  LISTING_COLUMNS, Listing, categoryLabel, kindLabel, priceLabel, timeAgo,
  isLive, listingState, daysLeft, removeListingPhotos,
  isRental, rentalTypeLabel, availableLabel, listingDays,
} from '@/lib/marketplace';

export default function ListingPage() {
  const { user } = useUser();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [photo, setPhoto] = useState(0);
  const [messaging, setMessaging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = !!(user?.is_super_admin || (user as any)?.role === 'admin');
  const isSeller = !!user && listing?.user_id === user.id;

  useEffect(() => {
    load();
  }, [id, user?.id]);

  const load = async () => {
    const { data } = await supabase.from('marketplace_listings').select(LISTING_COLUMNS).eq('id', id).maybeSingle();
    setListing((data as Listing) || null);
    setLoading(false);
  };

  const update = async (changes: Partial<Listing>, failMessage: string) => {
    setBusy(true);
    setError('');
    const { error } = await supabase.from('marketplace_listings').update(changes).eq('id', id);
    if (error) {
      console.error('Listing update failed:', error);
      setError(failMessage);
    } else {
      await load();
    }
    setBusy(false);
  };

  const markSold = () => update({ status: 'sold' }, 'Couldn\'t mark it sold. Please try again.');
  const relist = () => update(
    { status: 'active', expires_at: new Date(Date.now() + (listing ? listingDays(listing) : 30) * 86400000).toISOString() },
    'Couldn\'t put it back up. Please try again.'
  );
  const hide = () => update({ status: 'hidden' }, 'Couldn\'t hide it.');
  const unhide = () => update({ status: 'active' }, 'Couldn\'t show it again.');

  const remove = async () => {
    if (!listing) return;
    if (!confirm('Delete this listing? This can\'t be undone.')) return;
    setBusy(true);
    const { error } = await supabase.from('marketplace_listings').delete().eq('id', id);
    if (error) {
      setError('Couldn\'t delete it. Please try again.');
      setBusy(false);
      return;
    }
    if (isSeller) await removeListingPhotos(listing.photos);
    router.push(isSeller ? '/marketplace/mine' : '/marketplace');
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F6F2EA]">
        <p className="flex-1 text-center py-16 text-[#5B6660]" role="status">Loading...</p>
        <Footer />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F6F2EA]">
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white border border-[#E3DCCF] rounded-2xl p-6 text-center max-w-sm">
            <h1 className="font-display text-xl font-bold text-gabriola-green-dark mb-1">Listing not found</h1>
            <p className="text-sm text-[#5B6660] mb-3">It may have sold, expired or been taken down.</p>
            <Link href="/marketplace" className="text-sm font-semibold text-gabriola-green">← Buy, Sell & Free</Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const live = isLive(listing);
  const state = listingState(listing);
  const price = priceLabel(listing);
  const url = `https://www.gabriolaconnects.ca/marketplace/${listing.id}`;
  const btn = 'inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-lg font-semibold text-sm disabled:opacity-60';

  return (
    <div className="flex flex-col min-h-screen bg-[#F6F2EA] text-[#1F2A24]">
      <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-4 space-y-3">
        <Link href="/marketplace" className="inline-flex items-center gap-1 text-sm font-semibold text-gabriola-green">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Buy, Sell & Free
        </Link>

        <article className="bg-white border border-[#E3DCCF] rounded-2xl overflow-hidden">
          {/* Photos */}
          {listing.photos.length > 0 ? (
            <div>
              <div className="bg-[#1F2A24] flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={listing.photos[photo]} alt={listing.title} className="max-h-[70vh] w-auto max-w-full object-contain" />
              </div>
              {listing.photos.length > 1 && (
                <div className="flex gap-2 p-3 pb-0">
                  {listing.photos.map((p, i) => (
                    <button key={p} type="button" onClick={() => setPhoto(i)} aria-label={`Photo ${i + 1}`}
                      className={`w-16 h-16 rounded-lg overflow-hidden border-2 ${i === photo ? 'border-gabriola-green' : 'border-transparent'}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="h-40 bg-[#EEE8DD] flex items-center justify-center text-[#A39A88]">
              <ImageOff className="w-10 h-10" aria-hidden="true" />
            </div>
          )}

          <div className="p-4 md:p-6">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold mb-2">
              <span className={listing.kind === 'wanted' ? 'text-[#002774]' : listing.kind === 'rent' ? 'text-[#9A4A00]' : 'text-gabriola-green'}>
                {listing.kind === 'wanted' && isRental(listing) ? 'Looking to rent' : kindLabel(listing.kind)}
              </span>
              <span className="text-[#5B6660]">· {isRental(listing) ? rentalTypeLabel(listing.rental_type) : categoryLabel(listing.category)}</span>
              {state !== 'Live' && <span className="px-2 py-0.5 rounded-full bg-[#EEE8DD] text-[#5B6660]">{state}</span>}
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-gabriola-green-dark leading-tight">{listing.title}</h1>
            {price ? (
              <p className="text-xl font-bold mt-1">{listing.kind === 'wanted' ? `Budget ${price}` : price}</p>
            ) : listing.kind === 'sale' ? (
              <p className="text-base font-semibold text-[#5B6660] mt-1">Make an offer</p>
            ) : null}
            {listing.kind === 'rent' && (
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="px-2.5 py-1 rounded-full bg-[#F6F2EA] border border-[#E3DCCF] text-sm font-semibold">{availableLabel(listing.available_from)}</span>
                {listing.furnished && <span className="px-2.5 py-1 rounded-full bg-[#F6F2EA] border border-[#E3DCCF] text-sm">Furnished</span>}
                {listing.pets_ok && <span className="px-2.5 py-1 rounded-full bg-[#F6F2EA] border border-[#E3DCCF] text-sm">Pets OK</span>}
                {listing.utilities_included && <span className="px-2.5 py-1 rounded-full bg-[#F6F2EA] border border-[#E3DCCF] text-sm">Utilities included</span>}
              </div>
            )}
            <p className="text-sm text-[#5B6660] mt-2">
              Posted by {listing.seller_name || 'a neighbour'} · {timeAgo(listing.created_at)}
              {isSeller && live && <> · {daysLeft(listing)}</>}
            </p>

            {listing.description && (
              <PostBody text={listing.description} className="mt-4 text-[#1F2A24] leading-relaxed break-words" />
            )}
            {listing.kind === 'rent' && (
              <p className="mt-3 text-xs text-[#5B6660]">Listers are responsible for following local zoning and rental rules.</p>
            )}

            {error && <p className="mt-4 text-sm font-semibold text-[#B42318]" role="alert">{error}</p>}

            <div className="mt-5 pt-4 border-t border-[#E3DCCF] flex flex-wrap items-center gap-2">
              {!isSeller && live && (
                user ? (
                  <button type="button" onClick={() => setMessaging(true)}
                    className={`${btn} bg-gabriola-green text-white hover:bg-gabriola-green-dark min-h-[44px] px-4`}>
                    <Mail className="w-4 h-4" aria-hidden="true" /> Message {listing.seller_name || 'the seller'}
                  </button>
                ) : (
                  <Link href="/signin" className={`${btn} bg-gabriola-green text-white min-h-[44px] px-4`}>
                    <Mail className="w-4 h-4" aria-hidden="true" /> Sign in to message
                  </Link>
                )
              )}
              <ShareButton url={url} title={listing.title} />

              {(isSeller || isAdmin) && (
                <Link href={`/marketplace/${listing.id}/edit`} className={`${btn} text-blue-700 hover:bg-blue-50`}>
                  <Pencil className="w-4 h-4" aria-hidden="true" /> Edit
                </Link>
              )}
              {isSeller && live && (
                <button type="button" onClick={markSold} disabled={busy} className={`${btn} text-gabriola-green hover:bg-[#E6EFE8]`}>
                  <Check className="w-4 h-4" aria-hidden="true" /> {listing.kind === 'wanted' ? 'Found it' : listing.kind === 'rent' ? 'Mark rented' : 'Mark sold'}
                </button>
              )}
              {isSeller && listing.status !== 'hidden' && (
                <button type="button" onClick={relist} disabled={busy} className={`${btn} text-gabriola-green hover:bg-[#E6EFE8]`}>
                  <RotateCcw className="w-4 h-4" aria-hidden="true" /> {live ? `Renew for ${listingDays(listing)} days` : 'Put it back up'}
                </button>
              )}
              {isAdmin && listing.status !== 'hidden' && !isSeller && (
                <button type="button" onClick={hide} disabled={busy} className={`${btn} text-[#9A4A00] hover:bg-amber-50`}>
                  <EyeOff className="w-4 h-4" aria-hidden="true" /> Hide
                </button>
              )}
              {isAdmin && listing.status === 'hidden' && (
                <button type="button" onClick={unhide} disabled={busy} className={`${btn} text-[#9A4A00] hover:bg-amber-50`}>
                  <Eye className="w-4 h-4" aria-hidden="true" /> Show again
                </button>
              )}
              {(isSeller || isAdmin) && (
                <button type="button" onClick={remove} disabled={busy} className={`${btn} text-red-700 hover:bg-red-50`}>
                  <Trash2 className="w-4 h-4" aria-hidden="true" /> Delete
                </button>
              )}
            </div>

          </div>
        </article>

        <ListingComments
          listingId={listing.id}
          sellerId={listing.user_id}
          isOpen={live}
          closedReason={
            listing.status === 'sold' ? (listing.kind === 'wanted' ? 'They found what they were looking for, so comments are closed.' : listing.kind === 'rent' ? 'This place has been rented, so comments are closed.' : 'This item has sold, so comments are closed.')
              : listing.status === 'hidden' ? 'This listing is hidden, so comments are closed.'
              : 'This listing has expired, so comments are closed.'
          }
          userId={user?.id}
          isAdmin={isAdmin}
        />
      </div>

      {messaging && user && (
        <SendMessageModal
          recipientId={listing.user_id}
          recipientName={listing.seller_name || 'the seller'}
          currentUserId={user.id}
          initialMessage={`About your listing "${listing.title}" (${url}):\n\n`}
          onClose={() => setMessaging(false)}
        />
      )}
      <Footer />
    </div>
  );
}
