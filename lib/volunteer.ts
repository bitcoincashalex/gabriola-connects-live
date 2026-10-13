// lib/volunteer.ts
// Volunteer listings: categories, the columns pages read, and date helpers
// Version: 1.0.0
// Date: 2026-10-13

export interface VolunteerCategory {
  id: string;
  label: string;
}

// The categories people can pick when posting. "environmental" is kept as the id for
// Environment because that's what the existing listings were saved with.
export const VOLUNTEER_CATEGORIES: VolunteerCategory[] = [
  { id: 'community', label: 'Community' },
  { id: 'environmental', label: 'Environment' },
  { id: 'seniors', label: 'Seniors' },
  { id: 'youth', label: 'Youth & Education' },
  { id: 'health', label: 'Health & Wellness' },
  { id: 'animals', label: 'Animals' },
  { id: 'arts', label: 'Arts & Culture' },
  { id: 'events', label: 'Events' },
  { id: 'other', label: 'Other' },
];

// Older listings may use these ids; show them under the matching category
const CATEGORY_ALIASES: Record<string, string> = {
  environment: 'environmental',
  education: 'youth',
};

export function categoryId(raw: string | null | undefined): string {
  const id = (raw || 'other').toLowerCase();
  return CATEGORY_ALIASES[id] || id;
}

export function categoryLabel(raw: string | null | undefined): string {
  const id = categoryId(raw);
  return VOLUNTEER_CATEGORIES.find(c => c.id === id)?.label || 'Other';
}

export interface VolunteerListing {
  id: string;
  title: string;
  description: string;
  organization_name: string | null;
  posted_by: string;
  coordinator_email: string | null;
  coordinator_phone: string | null;
  category: string | null;
  location: string | null;
  time_commitment: string | null;
  start_date: string | null;
  volunteers_needed: number | null;
  status: string;
  application_count: number | null;
  created_at: string;
  deleted_at: string | null;
}

export const LISTING_COLUMNS =
  'id, title, description, organization_name, posted_by, coordinator_email, coordinator_phone, category, location, time_commitment, start_date, volunteers_needed, status, application_count, created_at, deleted_at';

// Today's date on Gabriola (Pacific time), as YYYY-MM-DD
export function pacificToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Vancouver' }).format(new Date());
}

// The date part of a stored date, whether it was saved as a date or a timestamp
export function dateOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.slice(0, 10);
}

// "Sat, Oct 18" for a one-day listing, or null for an ongoing one
export function formatListingDate(value: string | null | undefined): string | null {
  const d = dateOnly(value);
  if (!d) return null;
  const [y, m, day] = d.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, day, 12));
  return date.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

// A one-day listing is over once its date has passed
export function isPast(listing: { start_date: string | null }): boolean {
  const d = dateOnly(listing.start_date);
  return !!d && d < pacificToday();
}

export function statusLabel(listing: { status: string; start_date: string | null; deleted_at?: string | null }): string {
  if (listing.deleted_at) return 'Taken down';
  if (listing.status === 'filled') return 'Filled';
  if (listing.status === 'closed') return 'Closed';
  if (isPast(listing)) return 'Date passed';
  return 'Live';
}
