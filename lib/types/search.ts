// lib/types/search.ts
// Complete database schemas for all searchable tables
// Version: 1.1.0 - Added missing FerrySchedule fields (day_of_week, route_name, from/to_location, notes, operating_days)
// Date: 2025-12-20
// Used by: /app/search/page.tsx and /app/community/search/page.tsx

// ============================================================================
// ALERTS (15 fields)
// ============================================================================
export interface Alert {
  // Core fields
  id: string;
  severity: string;
  title: string;
  message: string;
  
  // Issuer information
  issued_by: string;
  on_behalf_of_name: string | null;
  on_behalf_of_organization: string | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  
  // Status & targeting
  active: boolean;
  affected_areas: string[] | null;
  
  // Categorization
  category: string | null;
  contact_info: string | null;
  action_required: string | null;
}

// ============================================================================
// DIRECTORY BUSINESSES (74 fields)
// ============================================================================
export interface DirectoryBusiness {
  // Core fields (3)
  id: string;
  name: string;
  category: string;
  
  // Contact information (4)
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  
  // Business details (6)
  description: string | null;
  image: string | null;
  services: string | null;
  specialties: string | null;
  tagline: string | null;
  subcategory: string | null;
  
  // Location data (8)
  lat: number | null;
  lng: number | null;
  geom: any | null;  // PostGIS geometry type
  address_line2: string | null;
  postal_code: string | null;
  map_url: string | null;
  location_notes: string | null;
  
  // Owner/contact details (3)
  owner_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  
  // Social media (2)
  facebook_url: string | null;
  instagram_url: string | null;
  
  // Hours of operation (9)
  hours_monday: string | null;
  hours_tuesday: string | null;
  hours_wednesday: string | null;
  hours_thursday: string | null;
  hours_friday: string | null;
  hours_saturday: string | null;
  hours_sunday: string | null;
  hours_notes: string | null;
  
  // Seasonal/timing (3)
  is_year_round: boolean | null;
  seasonal_closure_notes: string | null;
  established_year: number | null;
  
  // Payment options (5)
  price_range: string | null;
  accepts_cash: boolean | null;
  accepts_credit: boolean | null;
  accepts_debit: boolean | null;
  accepts_etransfer: boolean | null;
  
  // Amenities & features (6)
  wheelchair_accessible: boolean | null;
  parking_available: boolean | null;
  wifi_available: boolean | null;
  pet_friendly: boolean | null;
  family_friendly: boolean | null;
  outdoor_seating: boolean | null;
  
  // Services offered (4)
  offers_delivery: boolean | null;
  offers_pickup: boolean | null;
  offers_shipping: boolean | null;
  offers_online_booking: boolean | null;
  
  // Business credentials (7)
  licensed: boolean | null;
  insured: boolean | null;
  organic_certified: boolean | null;
  local_business: boolean | null;
  islander_owned: boolean | null;
  chamber_member: boolean | null;
  is_official_organization: boolean | null;  // For verified orgs (Fire, Health, Government)
  
  // Media (4)
  logo_url: string | null;
  cover_image_url: string | null;
  gallery_images: string[] | null;
  video_url: string | null;
  
  // Status & admin (5)
  is_approved: boolean | null;
  is_featured: boolean | null;
  is_active: boolean | null;
  claimed_by_owner: string | null;
  verified_date: string | null;
  
  // Timestamps & tracking (6)
  created_at: string | null;
  updated_at: string | null;
  last_updated: string | null;
  created_by: string | null;
  view_count: number | null;
  click_count: number | null;
}

// ============================================================================
// EVENTS (62 fields)
// ============================================================================
export interface Event {
  // Core fields (3)
  id: string;
  title: string;
  description: string;
  
  // Date & time (5)
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  is_all_day: boolean | null;
  
  // Location (7)
  location: string | null;
  venue_name: string | null;
  venue_address: string | null;
  venue_city: string | null;
  venue_postal_code: string | null;
  venue_map_url: string | null;
  parking_info: string | null;
  
  // Category & status (4)
  category: string | null;
  status: string | null;
  is_featured: boolean | null;
  is_approved: boolean | null;
  
  // Recurrence (2)
  is_recurring: boolean | null;
  recurrence_pattern: string | null;
  
  // Registration & attendance (9)
  registration_required: boolean | null;
  registration_url: string | null;
  registration_deadline: string | null;
  max_attendees: number | null;
  min_attendees: number | null;
  rsvp_count: number | null;
  waitlist_enabled: boolean | null;
  waitlist_count: number | null;
  fees: string | null;
  
  // Organizer information (3)
  organizer_name: string | null;
  organizer_organization: string | null;
  organizer_website: string | null;
  
  // Contact (2)
  contact_email: string | null;
  contact_phone: string | null;
  
  // Additional details (6)
  image_url: string | null;
  additional_info: string | null;
  age_restrictions: string | null;
  accessibility_info: string | null;
  what_to_bring: string | null;
  dress_code: string | null;
  
  // Cancellation/postponement (4)
  cancelled_at: string | null;
  cancellation_reason: string | null;
  postponed_from_date: string | null;
  weather_dependent: boolean | null;
  
  // Source & sync (6)
  source_name: string | null;
  source_url: string | null;
  source_type: string | null;
  external_event_id: string | null;
  external_calendar_url: string | null;
  last_synced_at: string | null;
  
  // Search & metadata (3)
  tags: string[] | null;
  keywords: string | null;
  search_vector: any | null;  // tsvector type
  
  // Timestamps & users (6)
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  deleted_by: string | null;  // ADMIN ONLY
  deleted_at: string | null;   // ADMIN ONLY
}

// ============================================================================
// FERRY SCHEDULE (28 fields)
// Note: Table name is 'ferry_schedule' (singular), not 'ferry_schedules'
// ============================================================================
export interface FerrySchedule {
  // Core fields
  id: string;
  departure_terminal: string;
  arrival_terminal: string;
  departure_time: string;  // time without time zone
  arrival_time: string;    // time without time zone
  
  // Route information (added fields used in search/filters)
  route_name: string | null;
  from_location: string | null;
  to_location: string | null;
  day_of_week: string | null;  // "Monday", "Tuesday", etc.
  operating_days: string | null;  // Text description of operating days
  notes: string | null;
  
  // Display formatting
  time_display: string;
  departure_display: string;
  arrival_display: string;
  
  // Schedule versioning (supports multiple seasonal schedules)
  schedule_name: string;  // e.g., "Summer 2024", "Winter 2024"
  valid_from: string;     // date
  valid_until: string | null;  // date
  
  // Days of operation (7 booleans)
  operates_monday: boolean | null;
  operates_tuesday: boolean | null;
  operates_wednesday: boolean | null;
  operates_thursday: boolean | null;
  operates_friday: boolean | null;
  operates_saturday: boolean | null;
  operates_sunday: boolean | null;
  
  // Admin fields
  sort_order: number;
  is_active: boolean | null;
  
  // Timestamps
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
}

// ============================================================================
// BBS POSTS (Forum Posts) (25 fields)
// ============================================================================
export interface BBSPost {
  // Core fields
  id: string;
  user_id: string;
  title: string;
  body: string;
  
  // Categorization
  category: string;  // Legacy text field
  category_id: string;  // New UUID reference to bbs_categories
  
  // Display & anonymity
  display_name: string | null;
  is_anonymous: boolean | null;
  
  // Media
  link_url: string | null;
  image_url: string | null;
  
  // Pinning
  is_pinned: boolean | null;
  global_pinned: boolean | null;
  pin_order: number | null;
  
  // Visibility & status
  is_hidden: boolean | null;
  is_active: boolean | null;
  
  // Engagement metrics
  view_count: number | null;
  reply_count: number | null;
  like_count: number | null;
  vote_score: number | null;
  reported_count: number | null;  // MODERATOR ONLY
  
  // Timestamps
  last_activity_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;  // MODERATOR ONLY
  deleted_by: string | null;  // MODERATOR ONLY
}

// ============================================================================
// BBS REPLIES (Forum Replies) (18 fields)
// ============================================================================
export interface BBSReply {
  // Core fields
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  parent_reply_id: string | null;  // For threaded replies
  
  // Display & anonymity
  display_name: string | null;
  is_anonymous: boolean | null;
  
  // Media
  image_url: string | null;
  link_url: string | null;
  
  // Visibility & status
  is_hidden: boolean | null;
  is_active: boolean | null;
  
  // Engagement metrics
  like_count: number | null;
  vote_score: number | null;
  reported_count: number | null;  // MODERATOR ONLY
  
  // Timestamps
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;  // MODERATOR ONLY
  deleted_by: string | null;  // MODERATOR ONLY
}

// ============================================================================
// BBS CATEGORIES (Forum Categories) (24 fields)
// ============================================================================
export interface BBSCategory {
  // Core fields
  id: string;
  parent_id: string | null;  // For subcategories
  slug: string;
  name: string;
  description: string | null;
  
  // Visual styling
  icon: string | null;
  color: string | null;
  emoji: string | null;
  
  // Ordering & status
  display_order: number | null;
  is_featured: boolean | null;
  is_active: boolean | null;
  is_archived: boolean | null;
  
  // Permissions (role-based access)
  min_role_to_post: string | null;
  min_role_to_view: string | null;
  requires_approval: boolean | null;
  
  // Statistics
  thread_count: number | null;
  reply_count: number | null;
  last_post_at: string | null;
  last_post_by: string | null;
  
  // Admin fields
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;  // MODERATOR ONLY
  deleted_by: string | null;  // MODERATOR ONLY
}

// ============================================================================
// SUMMARY
// ============================================================================
// Total fields across all types: 15 + 74 + 62 + 28 + 25 + 18 + 24 = 246 fields
//
// Moderator/Admin-only fields (should be filtered from anonymous queries):
// - Event: deleted_by, deleted_at
// - BBSPost: reported_count, deleted_at, deleted_by
// - BBSReply: reported_count, deleted_at, deleted_by
// - BBSCategory: deleted_at, deleted_by
