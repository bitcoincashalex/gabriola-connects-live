// app/api/admin/users/[id]/route.ts
// API endpoint for updating individual user permissions and settings
// Version: 1.1.0 - Forum admins can ban / unban, set read-only and moderators; event admins can
//                  grant event creation. Super admins can change everything, plus force logout.
//                  Nobody but a super admin can change a super admin. Ban date and "banned by" are
//                  set here, not by the browser. (These pages used to update the database straight
//                  from the browser, which the database never allowed for other members.)
// Previous: 1.0.6 - Passes changed_by so the audit log knows which admin made the change
// Date: 2026-11-05

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get auth token
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify user is super admin
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // What this admin may change
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('is_super_admin, admin_forum, admin_bbs, admin_events')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    const isSuper = userData.is_super_admin === true;
    const isForumAdmin = userData.admin_forum === true || userData.admin_bbs === true;
    const isEventAdmin = userData.admin_events === true;
    if (!isSuper && !isForumAdmin && !isEventAdmin) {
      return NextResponse.json({ error: 'Unauthorized - admins only' }, { status: 403 });
    }

    // Get the update data
    const body = await request.json();
    const userId = params.id;

    // Only a super admin can change a super admin (or themselves into one)
    const { data: target } = await supabaseAdmin
      .from('users')
      .select('id, is_super_admin')
      .eq('id', userId)
      .single();
    if (!target) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    if (target.is_super_admin && !isSuper) {
      return NextResponse.json({ error: 'Only a super admin can change a super admin' }, { status: 403 });
    }
    if (body.is_banned === true && userId === user.id) {
      return NextResponse.json({ error: "You can't ban yourself" }, { status: 400 });
    }

    // Fields forum admins and event admins may change
    const forumFields = ['is_banned', 'banned_reason', 'forum_read_only', 'forum_moderator'];
    const eventFields = ['can_create_events'];
    if (!isSuper) {
      const mine = [...(isForumAdmin ? forumFields : []), ...(isEventAdmin ? eventFields : [])];
      const notAllowed = Object.keys(body).filter(k => !mine.includes(k));
      if (notAllowed.length > 0) {
        return NextResponse.json({ error: `You don't have permission to change: ${notAllowed.join(', ')}` }, { status: 403 });
      }
    }

    // Validate that we're only updating allowed fields
    const allowedFields = [
      // User role
      'role',
      // Admin roles
      'is_super_admin',
      'admin_events',
      'admin_forum',
      'admin_bbs',
      'admin_directory',
      'admin_alerts',
      'admin_alert_organizations',  // NEW: Alert organizations admin
      'admin_ferry',
      'admin_users',
      // Permissions
      'can_create_events',
      'can_issue_alerts',
      'alert_level_permission',  // Alert level (emergency, critical, etc)
      'alert_organization',       // Organization assignment for alerts
      'can_post',                // Forum posting
      'can_create_posts',        // BBS posting
      'can_reply',               // Forum replies
      'can_comment',             // Comments
      // Account status
      'is_banned',
      'is_suspended',
      'account_locked',
      'forum_read_only',
      'is_verified',
      'email_verified',
      // Forum moderation
      'banned_reason',
      'forum_moderator',
      // Force logout
      'current_session_id',
      'session_started_at'
    ];

    const updateData: any = {};
    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.includes(key)) {
        updateData[key] = value;
      }
    }

    // Ban details are set here, not trusted from the browser
    if (updateData.is_banned === true) {
      updateData.banned_at = new Date().toISOString();
      updateData.banned_by = user.id;
    } else if (updateData.is_banned === false) {
      updateData.banned_at = null;
      updateData.banned_by = null;
      updateData.banned_reason = null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Update the user using service role (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ ...updateData, changed_by: user.id })   // audit log: who did it (cleared by the database)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('[API] Update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      user: data 
    });

  } catch (error) {
    console.error('[API] Unexpected error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
