// lib/supabase.ts
// Version: 2.0.0 - Updated BBSPost type for voting system
// Date: 2025-12-11

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'apikey': supabaseAnonKey
    }
  }
});

// Database types for type safety
// Updated to match actual database schema
export interface BBSPost {
  id: string;
  user_id: string;
  title: string;
  body: string;
  content?: string; // Alias for body
  category: string;
  category_id?: string;
  
  // Media
  link_url?: string;
  image_url?: string;
  
  // Display
  display_name?: string;
  user_name: string;
  is_anonymous?: boolean;
  
  // Voting (NEW - for upvote/downvote system)
  vote_score: number;
  
  // Legacy (kept for backward compatibility)
  likes: number;
  like_count?: number;
  
  // Engagement
  reply_count?: number;
  view_count?: number;
  reported_count?: number;
  
  // Status
  is_active: boolean;
  is_pinned?: boolean;
  is_hidden?: boolean;
  global_pinned?: boolean;
  pin_order?: number;
  
  // Timestamps
  created_at: string;
  updated_at?: string;
  deleted_at?: string;
  deleted_by?: string;
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
  username?: string;
  created_at: string;
}
