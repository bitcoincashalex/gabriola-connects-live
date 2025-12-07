export interface Event {
  id: string;
  title: string;
  date: Date;
  endDate?: Date;
  endTime?: string;
  time: string;
  location: string;
  description: string;
  posterImage?: string;
  source: string;
  organizerEmail?: string;
  organizerPhone?: string;
  allDay?: boolean;
  fees?: string;
  recurring?: string;
  contactInfo?: string;
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

// COMPLETE USER INTERFACE - Merges old fields + new permission system
export interface User {
  // Core identity fields
  id: string;
  email?: string;
  full_name: string;
  username?: string;
  postal_code?: string;
  
  // Profile fields
  avatar_url?: string;
  bio?: string;
  phone?: string;
  website?: string;
  facebook_url?: string;
  
  // Residency
  is_resident: boolean;
  residency_verified_at?: string;
  resident_since?: string;
  
  // Legacy role field (kept for compatibility)
  role: string;
  
  // General permissions
  can_post: boolean;
  can_comment: boolean;
  can_rsvp: boolean;
  can_create_events: boolean;
  can_moderate_events: boolean;
  can_edit_directory: boolean;
  can_issue_alerts: boolean;
  
  // NEW: Super admin & module admins
  is_super_admin: boolean;
  admin_events: boolean;
  admin_forum: boolean;
  admin_alerts: boolean;
  admin_directory: boolean;
  admin_ferry: boolean;
  
  // NEW: Forum-specific roles
  forum_moderator: boolean;
  forum_banned: boolean;
  forum_read_only: boolean;
  forum_banned_reason?: string;
  forum_banned_at?: string;
  forum_banned_by?: string;
  
  // NEW: Special role badges
  is_fire: boolean;
  is_police: boolean;
  is_medic: boolean;
  is_coast_guard: boolean;
  
  // NEW: Events-specific permissions
  events_moderator: boolean;
  events_featured_creator: boolean;
  
  // NEW: Alerts-specific permissions
  alerts_max_severity: string; // 'none', 'info', 'advisory', 'important', 'critical'
  
  // NEW: Directory-specific permissions
  directory_verified: boolean;
  
  // Legacy alert permission (kept for compatibility)
  alert_level_permission: 'none' | 'minor' | 'moderate' | 'major' | 'emergency';
  
  // Ban status
  is_banned: boolean;
  banned_reason?: string;
  banned_at?: string;
  banned_by?: string;
  
  // Engagement metrics
  posts_count: number;
  events_created_count: number;
  
  // Notifications
  email_notifications: boolean;
  notification_preferences?: any;
  
  // Privacy
  privacy_settings?: any;
  
  // Business integration
  business_id?: string;
  stripe_customer_id?: string;
  
  // Timestamps
  created_at: string;
  updated_at?: string;
  last_active_at?: string;
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
