export interface Event {
  // Core identification
  id: string;
  title: string;
  description: string;
  category?: string;
  
  // Date & Time
  start_date: Date;
  end_date?: Date;
  start_time?: string;
  end_time?: string;
  is_all_day?: boolean;
  
  // Recurrence
  is_recurring?: boolean;
  recurrence_pattern?: string;
  
  // Location
  location: string;
  venue_name?: string;
  venue_address?: string;
  venue_city?: string;
  venue_postal_code?: string;
  venue_map_url?: string;
  parking_info?: string;
  
  // Cost & Registration
  fees?: string;
  registration_url?: string;
  registration_required?: boolean;
  registration_deadline?: string;
  
  // Capacity
  max_attendees?: number;
  min_attendees?: number;
  rsvp_count?: number;
  waitlist_enabled?: boolean;
  waitlist_count?: number;
  
  // Organizer Contact
  organizer_name?: string;
  organizer_organization?: string;
  organizer_website?: string;
  contact_email?: string;
  contact_phone?: string;
  
  // Additional Info
  additional_info?: string;
  age_restrictions?: string;
  accessibility_info?: string;
  what_to_bring?: string;
  dress_code?: string;
  
  // Media
  image_url?: string;
  
  // Status & Lifecycle
  status?: 'scheduled' | 'cancelled' | 'postponed' | 'completed' | 'in_progress';
  is_approved?: boolean;
  is_featured?: boolean;
  cancelled_at?: string;
  cancellation_reason?: string;
  postponed_from_date?: Date;
  weather_dependent?: boolean;
  
  // Source Tracking
  source_name?: string;
  source_url?: string;
  source_type?: string;
  external_event_id?: string;
  external_calendar_url?: string;
  last_synced_at?: string;
  
  // Search & Discovery
  tags?: string[];
  keywords?: string;
  
  // Metadata
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

export interface BBSPost {
  id: string;
  name: string;
  title: string;
  message: string;
  category: BBSCategory;
  newsLink?: string;
  imageUrl?: string;
  imageStatus?: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  replies: BBSReply[];
}

export interface BBSReply {
  id: string;
  name: string;
  message: string;
  createdAt: Date;
  replies: BBSReply[];
}

export type BBSCategory = 
  | 'Announcements'
  | 'Lost & Found'
  | 'Buy & Sell'
  | 'Housing'
  | 'Jobs & Volunteers'
  | 'Recommendations'
  | 'Complaints'
  | 'Ferry'
  | 'Events Chat'
  | 'Arts & Culture'
  | 'Food & Dining'
  | 'Gardening'
  | 'Wildlife & Nature'
  | 'Pets'
  | 'Photography'
  | 'Health'
  | 'Local Government'
  | 'Politics'
  | 'Other';

export interface DirectoryListing {
  id: string;
  name: string;
  category: string;
  address: string;
  phone?: string;
  email?: string;
  website?: string;
  lat: number;
  lng: number;
  description?: string;
  image?: string;
}

export interface FerryStatus {
  nextDeparture: string;
  nextArrival: string;
  status: 'On Time' | 'Delayed';
  delayMinutes?: number;
  lastKnownLocation?: string;
  lastUpdated: Date;
}

export interface EmergencyAlert {
  id: string;
  message: string;
  issuer: string;
  timestamp: Date;
  active: boolean;
}

// Alert System Types
export type AlertSeverity = 'info' | 'minor' | 'moderate' | 'major' | 'emergency';

export type AlertCategory = 
  | 'general'
  | 'ferry'
  | 'highway'
  | 'hydro'
  | 'water'
  | 'weather'
  | 'wildfire'
  | 'health'
  | 'emergency'
  | 'evacuation'
  | 'community';

export interface Alert {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  category: AlertCategory;
  
  issued_by: string;
  issuer_name: string;
  issuer_organization?: string;
  
  is_active: boolean;
  resolved_at?: string;
  resolved_by?: string;
  
  starts_at: string;
  expires_at?: string;
  
  send_push_notification: boolean;
  send_email_notification: boolean;
  
  action_required?: string;
  affected_areas?: string[];
  external_link?: string;
  contact_info?: string;
  
  created_at: string;
  updated_at?: string;
}

export interface CreateAlertData {
  title: string;
  message: string;
  severity: AlertSeverity;
  category: AlertCategory;
  issuer_organization?: string;
  expires_at?: string;
  send_push_notification?: boolean;
  send_email_notification?: boolean;
  action_required?: string;
  affected_areas?: string[];
  external_link?: string;
  contact_info?: string;
}

// User types
export type UserRole = 'user' | 'moderator' | 'admin';

export interface User {
  // Core fields
  id: string;
  full_name: string;

  // These three lines have been REMOVED — they were duplicates
  // real_name?: string;
  // can_post?: boolean;
  // is_moderator?: boolean;

  username: string;
  email?: string;
  postal_code: string;
  
  // Profile fields
  avatar_url?: string;
  bio?: string;
  facebook_url?: string;
  phone?: string;
  website?: string;
  
  // Residency
  is_resident: boolean;
  residency_verified_at?: string;
  resident_since?: string;
  
  // Permissions
  role: UserRole;
  is_super_admin: boolean;
  can_post: boolean;
  can_comment: boolean;
  can_rsvp: boolean;
  can_create_events: boolean;
  can_moderate_events: boolean;
  can_edit_directory: boolean;
  can_issue_alerts: boolean;
  alert_level_permission: 'none' | 'minor' | 'moderate' | 'major' | 'emergency';
  is_banned: boolean;
  banned_at?: string;
  banned_reason?: string;
  banned_by?: string;
  
  // Engagement
  posts_count: number;
  events_created_count: number;
  last_active_at?: string;
  email_notifications: boolean;
  
  // Future fields
  stripe_customer_id?: string;
  notification_preferences?: any;
  privacy_settings?: any;
  business_id?: string;
  
  // Timestamps
  created_at: string;
  updated_at?: string;
}

export interface UserProfile {
  id: string;
  full_name: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  is_resident: boolean;
  role: UserRole;
  is_banned: boolean;
  posts_count: number;
  events_created_count: number;
  created_at: string;
}

export interface SignUpData {
  email: string;
  password: string;
  full_name: string;
  username: string;
  postal_code: string;
}

export interface SignInData {
  email: string;
  password: string;
}