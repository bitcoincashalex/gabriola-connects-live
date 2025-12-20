// lib/filters/simpleFilters.ts
// Mobile-first simple filter definitions
// Used by: /app/search/page.tsx and /app/community/search/page.tsx
// Version: 1.0.0 - Simple Mobile-First Approach
// Date: 2025-12-18

export interface FilterOption {
  value: string;
  label: string;
}

// ============================================================================
// CORE FILTERS (Always Visible - Mobile First)
// ============================================================================

export const eventCategories: FilterOption[] = [
  { value: 'all', label: 'All Categories' },
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

export const directoryCategories: FilterOption[] = [
  { value: 'all', label: 'All Categories' },
  { value: 'Food & Dining', label: 'Food & Dining' },
  { value: 'Services', label: 'Services' },
  { value: 'Retail', label: 'Retail' },
  { value: 'Health & Wellness', label: 'Health & Wellness' },
  { value: 'Arts & Crafts', label: 'Arts & Crafts' },
  { value: 'Accommodations', label: 'Accommodations' },
  { value: 'Recreation', label: 'Recreation' },
  { value: 'Professional Services', label: 'Professional Services' },
];

export const locations: FilterOption[] = [
  { value: 'all', label: 'All Locations' },
  { value: 'North End', label: 'North End' },
  { value: 'South End', label: 'South End' },
  { value: 'Central', label: 'Central' },
  { value: 'Village', label: 'Village' },
  { value: 'Silva Bay', label: 'Silva Bay' },
  { value: 'Descanso Bay', label: 'Descanso Bay' },
];

export const ferryRoutes: FilterOption[] = [
  { value: 'all', label: 'All Routes' },
  { value: 'Gabriola', label: 'From Gabriola' },
  { value: 'Nanaimo', label: 'From Nanaimo' },
];

export const daysOfWeek: FilterOption[] = [
  { value: 'all', label: 'All Days' },
  { value: 'Monday', label: 'Monday' },
  { value: 'Tuesday', label: 'Tuesday' },
  { value: 'Wednesday', label: 'Wednesday' },
  { value: 'Thursday', label: 'Thursday' },
  { value: 'Friday', label: 'Friday' },
  { value: 'Saturday', label: 'Saturday' },
  { value: 'Sunday', label: 'Sunday' },
];

export const alertSeverities: FilterOption[] = [
  { value: 'all', label: 'All Severities' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'warning', label: 'Warning' },
  { value: 'advisory', label: 'Advisory' },
  { value: 'info', label: 'Info' },
];

// ============================================================================
// ADVANCED FILTERS (Behind "More Filters" Toggle - Progressive Disclosure)
// ============================================================================

export const eventAdvancedFilters = {
  registration_required: 'Registration Required',
  is_recurring: 'Recurring Events',
  weather_dependent: 'Weather Dependent',
  free_only: 'Free Events Only',
};

export const directoryAdvancedFilters = {
  islander_owned: 'Islander Owned',
  local_business: 'Local Business',
  wheelchair_accessible: 'Wheelchair Accessible',
  parking_available: 'Parking Available',
  accepts_cash: 'Accepts Cash',
  accepts_credit: 'Accepts Credit',
  offers_delivery: 'Offers Delivery',
};

export const ferryAdvancedFilters = {
  active_only: 'Active Schedule Only',
  upcoming_today: 'Upcoming Sailings Today',
};

export const alertAdvancedFilters = {
  official_org_only: 'Official Organizations Only',
  has_action_required: 'Action Required',
  affected_areas: 'Filter by Area',
};

// ============================================================================
// FORUM FILTERS (Community Search Only)
// ============================================================================

export const forumFilters = {
  has_replies: 'Has Replies',
  pinned_only: 'Pinned Posts',
  my_posts: 'My Posts', // Registered users only
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if event is free
 */
export function isEventFree(fees: string | null): boolean {
  if (!fees) return true;
  const feeText = fees.toLowerCase().trim();
  return feeText === '' || feeText === 'free' || feeText === 'no fee' || feeText === '$0';
}

/**
 * Check if alert is currently active
 */
export function isAlertActive(active: boolean, expiresAt: string | null): boolean {
  if (!active) return false;
  if (!expiresAt) return true;
  return new Date(expiresAt) > new Date();
}

/**
 * Check if business operates on a specific day
 */
export function operatesOnDay(ferry: any, dayName: string): boolean {
  const dayField = `operates_${dayName.toLowerCase()}`;
  return ferry[dayField] === true;
}

/**
 * Get sailings for today that haven't departed yet
 */
export function isUpcomingToday(departureTime: string): boolean {
  const now = new Date();
  const [hours, minutes] = departureTime.split(':').map(Number);
  const sailingTime = new Date();
  sailingTime.setHours(hours, minutes, 0);
  return sailingTime > now;
}
