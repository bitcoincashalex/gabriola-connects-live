// lib/filters/searchFilters.ts
// Comprehensive filter definitions for search pages
// Used by: /app/search/page.tsx and /app/community/search/page.tsx
// Version: 1.0.0
// Date: 2025-12-18

export interface FilterOption {
  value: string;
  label: string;
}

// ============================================================================
// EVENT FILTERS
// ============================================================================

export const eventCategories: FilterOption[] = [
  { value: 'Arts & Culture', label: 'Arts & Culture' },
  { value: 'Community', label: 'Community' },
  { value: 'Education', label: 'Education' },
  { value: 'Entertainment', label: 'Entertainment' },
  { value: 'Food & Drink', label: 'Food & Drink' },
  { value: 'Health & Wellness', label: 'Health & Wellness' },
  { value: 'Music', label: 'Music' },
  { value: 'Outdoors', label: 'Outdoors' },
  { value: 'Sports & Recreation', label: 'Sports & Recreation' },
];

export const eventStatuses: FilterOption[] = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'postponed', label: 'Postponed' },
  { value: 'completed', label: 'Completed' },
];

export const eventCostTypes: FilterOption[] = [
  { value: 'free', label: 'Free Events' },
  { value: 'paid', label: 'Paid Events' },
];

// ============================================================================
// DIRECTORY FILTERS
// ============================================================================

export const directoryCategories: FilterOption[] = [
  { value: 'Food & Dining', label: 'Food & Dining' },
  { value: 'Services', label: 'Services' },
  { value: 'Retail', label: 'Retail' },
  { value: 'Health & Wellness', label: 'Health & Wellness' },
  { value: 'Arts & Crafts', label: 'Arts & Crafts' },
  { value: 'Accommodations', label: 'Accommodations' },
  { value: 'Recreation', label: 'Recreation' },
  { value: 'Professional Services', label: 'Professional Services' },
];

export const priceRanges: FilterOption[] = [
  { value: '$', label: '$ - Budget' },
  { value: '$$', label: '$$ - Moderate' },
  { value: '$$$', label: '$$$ - Upscale' },
  { value: '$$$$', label: '$$$$ - Premium' },
];

export const paymentMethods = {
  accepts_cash: 'Cash',
  accepts_credit: 'Credit Card',
  accepts_debit: 'Debit',
  accepts_etransfer: 'E-Transfer',
};

export const businessAmenities = {
  wheelchair_accessible: 'Wheelchair Accessible',
  parking_available: 'Parking Available',
  wifi_available: 'WiFi',
  pet_friendly: 'Pet Friendly',
  family_friendly: 'Family Friendly',
  outdoor_seating: 'Outdoor Seating',
};

export const businessServices = {
  offers_delivery: 'Delivery',
  offers_pickup: 'Pickup',
  offers_shipping: 'Shipping',
  offers_online_booking: 'Online Booking',
};

export const businessCredentials = {
  licensed: 'Licensed',
  insured: 'Insured',
  organic_certified: 'Organic Certified',
  local_business: 'Local Business',
  islander_owned: 'Islander Owned',
  chamber_member: 'Chamber Member',
  is_official_organization: 'Official Organization',
};

// ============================================================================
// FERRY FILTERS
// ============================================================================

export const ferryRoutes: FilterOption[] = [
  { value: 'Gabriola', label: 'From Gabriola' },
  { value: 'Nanaimo', label: 'From Nanaimo' },
];

export const daysOfWeek: FilterOption[] = [
  { value: 'Monday', label: 'Monday' },
  { value: 'Tuesday', label: 'Tuesday' },
  { value: 'Wednesday', label: 'Wednesday' },
  { value: 'Thursday', label: 'Thursday' },
  { value: 'Friday', label: 'Friday' },
  { value: 'Saturday', label: 'Saturday' },
  { value: 'Sunday', label: 'Sunday' },
];

export const timesOfDay: FilterOption[] = [
  { value: 'morning', label: 'Morning (5am-12pm)' },
  { value: 'afternoon', label: 'Afternoon (12pm-6pm)' },
  { value: 'evening', label: 'Evening (6pm-12am)' },
];

// ============================================================================
// ALERT FILTERS
// ============================================================================

export const alertSeverities: FilterOption[] = [
  { value: 'emergency', label: 'Emergency' },
  { value: 'warning', label: 'Warning' },
  { value: 'advisory', label: 'Advisory' },
  { value: 'info', label: 'Info' },
];

export const alertStatuses: FilterOption[] = [
  { value: 'active', label: 'Active Only' },
  { value: 'expired', label: 'Expired Only' },
  { value: 'all', label: 'All Alerts' },
];

export const affectedAreas: FilterOption[] = [
  { value: 'North End', label: 'North End' },
  { value: 'South End', label: 'South End' },
  { value: 'Central', label: 'Central' },
  { value: 'Village', label: 'Village' },
  { value: 'Silva Bay', label: 'Silva Bay' },
  { value: 'Descanso Bay', label: 'Descanso Bay' },
  { value: 'Island-wide', label: 'Island-wide' },
];

// ============================================================================
// FORUM/BBS FILTERS (Registered users only)
// ============================================================================

export const forumSortOptions: FilterOption[] = [
  { value: 'recent', label: 'Most Recent' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'active', label: 'Most Active' },
  { value: 'oldest', label: 'Oldest First' },
];

export const postActivityFilters = {
  has_replies: 'Has Replies',
  no_replies: 'No Replies Yet',
  has_images: 'Has Images',
  has_links: 'Has Links',
};

// ============================================================================
// LOCATION FILTERS (Shared across Events, Directory, Alerts)
// ============================================================================

export const locations: FilterOption[] = [
  { value: 'North End', label: 'North End' },
  { value: 'South End', label: 'South End' },
  { value: 'Central', label: 'Central' },
  { value: 'Village', label: 'Village' },
  { value: 'Silva Bay', label: 'Silva Bay' },
  { value: 'Descanso Bay', label: 'Descanso Bay' },
];

// ============================================================================
// SORT OPTIONS (Shared)
// ============================================================================

export const sortOptions: FilterOption[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'date', label: 'Date' },
  { value: 'name', label: 'Name (A-Z)' },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get time of day category based on hour
 */
export function getTimeOfDay(time: string): 'morning' | 'afternoon' | 'evening' | null {
  if (!time) return null;
  const hour = parseInt(time.split(':')[0]);
  
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 || hour < 5) return 'evening';
  return null;
}

/**
 * Check if event is free (no fees or fees field empty/null)
 */
export function isEventFree(fees: string | null): boolean {
  return !fees || fees.trim().length === 0 || fees.toLowerCase().includes('free');
}

/**
 * Check if alert is currently active
 */
export function isAlertActive(active: boolean, expiresAt: string | null): boolean {
  if (!active) return false;
  if (!expiresAt) return true; // No expiry = still active
  return new Date(expiresAt) > new Date();
}

/**
 * Filter operates_* boolean fields by day name
 */
export function operatesOnDay(ferry: any, dayName: string): boolean {
  const dayField = `operates_${dayName.toLowerCase()}`;
  return ferry[dayField] === true;
}
