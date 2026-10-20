// lib/marketplace.ts
// Buy, Sell & Free: shared types, labels, photo upload and small helpers
// Version: 1.0.0
// Date: 2026-10-20

import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/imageCompression';

export type ListingKind = 'sale' | 'wanted' | 'free';
export type ListingStatus = 'active' | 'sold' | 'hidden';

export interface Listing {
  id: string;
  user_id: string;
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
}

export const LISTING_COLUMNS =
  'id, user_id, seller_name, kind, title, description, price, category, photos, status, created_at, updated_at, expires_at';

export const MAX_PHOTOS = 4;
export const PHOTO_BUCKET = 'marketplace';

export const LISTING_KINDS: { id: ListingKind; label: string; short: string }[] = [
  { id: 'sale', label: 'For sale', short: 'For sale' },
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
  { id: 'other', label: 'Other' },
];

export const categoryLabel = (id: string) =>
  LISTING_CATEGORIES.find(c => c.id === id)?.label || 'Other';

export const kindLabel = (kind: ListingKind) =>
  LISTING_KINDS.find(k => k.id === kind)?.label || 'For sale';

// "$45", "$1,200", "$12.50", "Free", or "" when no price was given
export function priceLabel(l: Pick<Listing, 'kind' | 'price'>): string {
  if (l.kind === 'free') return 'Free';
  if (l.price === null || l.price === undefined) return '';
  const n = Number(l.price);
  return '$' + n.toLocaleString('en-CA', {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export const isExpired = (l: Pick<Listing, 'expires_at'>) => new Date(l.expires_at).getTime() <= Date.now();
export const isLive = (l: Pick<Listing, 'status' | 'expires_at'>) => l.status === 'active' && !isExpired(l);

// What the seller sees on their own listing
export function listingState(l: Pick<Listing, 'status' | 'expires_at'>): string {
  if (l.status === 'sold') return 'Sold';
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
