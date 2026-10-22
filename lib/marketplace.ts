// lib/marketplace.ts
// Buy, Sell & Free: shared types, labels, photo upload and small helpers
// Version: 1.3.0 - is_anonymous: post without your name (user_id is empty on those listings)
// Previous: 1.2.0 - comments_enabled: the poster can turn public comments off
// Earlier: 1.1.0 - Rentals: "For rent" listings (home, suite or cabin, room, trailer / RV,
//                  RV pad) by the month, "Looking for a rental" under Wanted, 60-day listings
// Previous: 1.0.0 (2026-10-20)
// Date: 2026-10-22

import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/imageCompression';

export type ListingKind = 'sale' | 'rent' | 'wanted' | 'free';
export type ListingStatus = 'active' | 'sold' | 'hidden';

export interface Listing {
  id: string;
  user_id: string | null;          // empty when posted without a name
  seller_name: string | null;
  kind: ListingKind;
  title: string;
  description: string | null;
  price: number | null;
  category: string;
  photos: string[];
  status: ListingStatus;
  created_at: string;
  updated_at: string;
  expires_at: string;
  // Rentals (kind 'rent', or 'wanted' in the housing category)
  rental_type: string | null;
  available_from: string | null;   // YYYY-MM-DD, empty = now
  furnished: boolean | null;
  pets_ok: boolean | null;
  utilities_included: boolean | null;
  comments_enabled: boolean;       // false = the poster turned public comments off
  is_anonymous: boolean;           // posted without a name: shows "A neighbour"
}

export const LISTING_COLUMNS =
  'id, user_id, seller_name, kind, title, description, price, category, photos, status, created_at, updated_at, expires_at, rental_type, available_from, furnished, pets_ok, utilities_included, comments_enabled, is_anonymous';

// Rentals: monthly and up only (nightly and weekly stays belong on Airbnb)
export const HOUSING_CATEGORY = 'housing';
export const RENTAL_TYPES: { id: string; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'suite', label: 'Suite or cabin' },
  { id: 'room', label: 'Room' },
  { id: 'trailer', label: 'Trailer / RV' },
  { id: 'rv_pad', label: 'RV pad / space' },
];
export const rentalTypeLabel = (id?: string | null) => RENTAL_TYPES.find(t => t.id === id)?.label || 'Rental';

// A rental listing, or someone looking for one
export const isRental = (l: Pick<Listing, 'kind' | 'category'>) =>
  l.kind === 'rent' || (l.kind === 'wanted' && l.category === HOUSING_CATEGORY);

// How long a listing stays up (and what Renew gives): rentals 60 days, everything else 30
export const listingDays = (l: Pick<Listing, 'kind' | 'category'>) => (isRental(l) ? 60 : 30);

// "Available now" / "Available Nov 1"
export function availableLabel(date?: string | null): string {
  if (!date) return 'Available now';
  const d = new Date(`${date.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime()) || d.getTime() <= Date.now()) return 'Available now';
  return 'Available ' + d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

export const MAX_PHOTOS = 4;
export const PHOTO_BUCKET = 'marketplace';

export const LISTING_KINDS: { id: ListingKind; label: string; short: string }[] = [
  { id: 'sale', label: 'For sale', short: 'For sale' },
  { id: 'rent', label: 'For rent', short: 'For rent' },
  { id: 'wanted', label: 'Wanted', short: 'Wanted' },
  { id: 'free', label: 'Free', short: 'Free' },
];

export const LISTING_CATEGORIES: { id: string; label: string }[] = [
  { id: 'furniture', label: 'Furniture & Home' },
  { id: 'tools', label: 'Tools & Building' },
  { id: 'garden', label: 'Garden & Outdoor' },
  { id: 'firewood', label: 'Firewood' },
  { id: 'vehicles', label: 'Vehicles & Boats' },
  { id: 'electronics', label: 'Electronics' },
  { id: 'clothing', label: 'Clothing' },
  { id: 'kids', label: 'Kids & Toys' },
  { id: HOUSING_CATEGORY, label: 'Housing & rentals' },
  { id: 'other', label: 'Other' },
];

export const categoryLabel = (id: string) =>
  LISTING_CATEGORIES.find(c => c.id === id)?.label || 'Other';

export const kindLabel = (kind: ListingKind) =>
  LISTING_KINDS.find(k => k.id === kind)?.label || 'For sale';

// "$45", "$1,200", "$12.50", "$750/mo" for rentals, "Free", or "" when no price was given
export function priceLabel(l: Pick<Listing, 'kind' | 'price'> & { category?: string }): string {
  if (l.kind === 'free') return 'Free';
  if (l.price === null || l.price === undefined) return '';
  const n = Number(l.price);
  const amount = '$' + n.toLocaleString('en-CA', {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return isRental({ kind: l.kind, category: l.category || '' }) ? `${amount}/mo` : amount;
}

export const isExpired = (l: Pick<Listing, 'expires_at'>) => new Date(l.expires_at).getTime() <= Date.now();
export const isLive = (l: Pick<Listing, 'status' | 'expires_at'>) => l.status === 'active' && !isExpired(l);

// What the seller sees on their own listing
export function listingState(l: Pick<Listing, 'status' | 'expires_at'> & { kind?: ListingKind }): string {
  if (l.status === 'sold') return l.kind === 'rent' ? 'Rented' : l.kind === 'wanted' ? 'Found' : 'Sold';
  if (l.status === 'hidden') return 'Hidden by an admin';
  if (isExpired(l)) return 'Expired';
  return 'Live';
}

// "3 days left", "today", for the seller's own listings
export function daysLeft(l: Pick<Listing, 'expires_at'>): string {
  const ms = new Date(l.expires_at).getTime() - Date.now();
  if (ms <= 0) return 'expired';
  const days = Math.ceil(ms / 86400000);
  return days === 1 ? '1 day left' : `${days} days left`;
}

export function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

// Compress and upload one photo into the member's own folder; returns its public link
export async function uploadListingPhoto(userId: string, file: File): Promise<string> {
  const result = await compressImage(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.82, maxSizeMB: 10 });
  if (!result.success) throw new Error(result.error);
  const ext = result.file.type === 'image/png' ? 'png' : 'jpg';
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, result.file, {
    contentType: result.file.type || 'image/jpeg',
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

// Remove photos the member no longer uses (only works on their own folder; failures are ignored)
export async function removeListingPhotos(urls: string[]) {
  const marker = `/object/public/${PHOTO_BUCKET}/`;
  const paths = urls
    .map(u => (u.includes(marker) ? decodeURIComponent(u.split(marker)[1]) : ''))
    .filter(Boolean);
  if (paths.length) await supabase.storage.from(PHOTO_BUCKET).remove(paths);
}
