// ============================================================================
// ACTIVITY LOGGER SERVICE - Centralized User Activity Tracking
// ============================================================================
// Version: 1.0.0
// Created: 2025-12-18
// Purpose: Log user activities for admin panel "last activity" display
// ============================================================================

import { createClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export type ActivityType = 
  | 'post_created'
  | 'reply_posted'
  | 'event_created'
  | 'event_rsvp'
  | 'message_sent';

export interface ActivityDetails {
  // Common fields
  id?: string;
  title?: string;
  
  // Post/Reply specific
  post_id?: string;
  reply_id?: string;
  category?: string;
  
  // Event specific
  event_id?: string;
  event_title?: string;
  rsvp_status?: 'going' | 'interested' | 'not_going';
  
  // Message specific
  recipient_id?: string;
  recipient_name?: string;
  
  // Any additional context
  [key: string]: any;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  activity_type: ActivityType;
  activity_details: ActivityDetails;
  created_at: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

// Initialize Supabase client (uses environment variables)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use service role key to bypass RLS (activities inserted by server)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================================================
// ACTIVITY LOGGER CLASS
// ============================================================================

export class ActivityLogger {
  /**
   * Log a user activity
   * 
   * @param userId - UUID of the user performing the action
   * @param activityType - Type of activity (post_created, event_rsvp, etc.)
   * @param details - Activity-specific details (post title, event name, etc.)
   * @returns Promise<boolean> - true if logged successfully, false otherwise
   * 
   * @example
   * await ActivityLogger.log(
   *   userId,
   *   'post_created',
   *   { post_id: post.id, title: post.title, category: post.category }
   * );
   */
  static async log(
    userId: string,
    activityType: ActivityType,
    details: ActivityDetails = {}
  ): Promise<boolean> {
    try {
      // Validate inputs
      if (!userId || !activityType) {
        console.error('[ActivityLogger] Missing required parameters:', { userId, activityType });
        return false;
      }

      // Insert activity
      const { error } = await supabase
        .from('user_activities')
        .insert({
          user_id: userId,
          activity_type: activityType,
          activity_details: details
        });

      if (error) {
        console.error('[ActivityLogger] Error logging activity:', error);
        return false;
      }

      // Also update users.last_activity_at for quick "online" checks
      const { error: updateError } = await supabase
        .from('users')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', userId);

      if (updateError) {
        console.error('[ActivityLogger] Error updating last_activity_at:', updateError);
        // Don't return false here - activity was logged, this is just a bonus update
      }

      console.log(`[ActivityLogger] ✅ Logged: ${activityType} for user ${userId}`);
      return true;

    } catch (error) {
      console.error('[ActivityLogger] Unexpected error:', error);
      return false;
    }
  }

  /**
   * Log BBS post creation
   * 
   * @example
   * await ActivityLogger.logPostCreated(userId, post.id, post.title, post.category);
   */
  static async logPostCreated(
    userId: string,
    postId: string,
    title: string,
    category?: string
  ): Promise<boolean> {
    return this.log(userId, 'post_created', {
      post_id: postId,
      title,
      category
    });
  }

  /**
   * Log BBS reply posted
   * 
   * @example
   * await ActivityLogger.logReplyPosted(userId, reply.id, reply.post_id);
   */
  static async logReplyPosted(
    userId: string,
    replyId: string,
    postId: string,
    postTitle?: string
  ): Promise<boolean> {
    return this.log(userId, 'reply_posted', {
      reply_id: replyId,
      post_id: postId,
      title: postTitle
    });
  }

  /**
   * Log event creation
   * 
   * @example
   * await ActivityLogger.logEventCreated(userId, event.id, event.title);
   */
  static async logEventCreated(
    userId: string,
    eventId: string,
    title: string
  ): Promise<boolean> {
    return this.log(userId, 'event_created', {
      event_id: eventId,
      event_title: title
    });
  }

  /**
   * Log event RSVP
   * 
   * @example
   * await ActivityLogger.logEventRSVP(userId, event.id, event.title, 'going');
   */
  static async logEventRSVP(
    userId: string,
    eventId: string,
    eventTitle: string,
    status: 'going' | 'interested' | 'not_going'
  ): Promise<boolean> {
    return this.log(userId, 'event_rsvp', {
      event_id: eventId,
      event_title: eventTitle,
      rsvp_status: status
    });
  }

  /**
   * Log private message sent
   * 
   * @example
   * await ActivityLogger.logMessageSent(senderId, recipientId, recipientName);
   */
  static async logMessageSent(
    userId: string,
    recipientId: string,
    recipientName: string
  ): Promise<boolean> {
    return this.log(userId, 'message_sent', {
      recipient_id: recipientId,
      recipient_name: recipientName
    });
  }

  /**
   * Get latest activity for a user
   * Used for debugging or individual user profiles
   * 
   * @example
   * const activity = await ActivityLogger.getLatestForUser(userId);
   */
  static async getLatestForUser(userId: string): Promise<ActivityLog | null> {
    try {
      const { data, error } = await supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('[ActivityLogger] Error fetching activity:', error);
        return null;
      }

      return data as ActivityLog;
    } catch (error) {
      console.error('[ActivityLogger] Unexpected error:', error);
      return null;
    }
  }

  /**
   * Get recent activities for a user
   * Used for user activity timeline
   * 
   * @example
   * const activities = await ActivityLogger.getRecentForUser(userId, 10);
   */
  static async getRecentForUser(
    userId: string,
    limit: number = 10
  ): Promise<ActivityLog[]> {
    try {
      const { data, error } = await supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[ActivityLogger] Error fetching activities:', error);
        return [];
      }

      return data as ActivityLog[];
    } catch (error) {
      console.error('[ActivityLogger] Unexpected error:', error);
      return [];
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format activity for display in UI
 * 
 * @example
 * const display = formatActivityForDisplay(activity);
 * // Returns: "Posted 'Beach Cleanup' in Events & Happenings"
 */
export function formatActivityForDisplay(activity: ActivityLog): string {
  const details = activity.activity_details;

  switch (activity.activity_type) {
    case 'post_created':
      return `Posted "${details.title || 'Untitled'}"${details.category ? ` in ${details.category}` : ''}`;
    
    case 'reply_posted':
      return `Replied to "${details.title || 'a post'}"`;
    
    case 'event_created':
      return `Created event "${details.event_title || 'Untitled Event'}"`;
    
    case 'event_rsvp':
      return `RSVP'd ${details.rsvp_status === 'going' ? '✓ Going' : details.rsvp_status === 'interested' ? '★ Interested' : '✗ Not Going'} to "${details.event_title || 'event'}"`;
    
    case 'message_sent':
      return `Sent message to ${details.recipient_name || 'a user'}`;
    
    default:
      return 'Unknown activity';
  }
}

/**
 * Get activity icon for UI
 * 
 * @example
 * const icon = getActivityIcon(activity.activity_type);
 */
export function getActivityIcon(activityType: ActivityType): string {
  const icons: Record<ActivityType, string> = {
    post_created: '📝',
    reply_posted: '💬',
    event_created: '📅',
    event_rsvp: '✓',
    message_sent: '✉️'
  };
  return icons[activityType] || '•';
}

// ============================================================================
// EXPORT
// ============================================================================

export default ActivityLogger;

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*
// Example 1: Log a BBS post creation
import ActivityLogger from '@/lib/activity-logger';

// In your API route after creating a post:
const { data: post, error } = await supabase
  .from('bbs_posts')
  .insert({ ... })
  .select()
  .single();

if (post) {
  await ActivityLogger.logPostCreated(
    user.id,
    post.id,
    post.title,
    post.category
  );
}

// Example 2: Log an event RSVP
await ActivityLogger.logEventRSVP(
  user.id,
  event.id,
  event.title,
  'going'
);

// Example 3: Get user's recent activity
const activities = await ActivityLogger.getRecentForUser(user.id, 5);
activities.forEach(activity => {
  console.log(formatActivityForDisplay(activity));
});
*/
