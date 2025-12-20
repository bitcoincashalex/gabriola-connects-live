// app/api/admin/users/[id]/route.ts
// API endpoint for updating individual user permissions and settings
// Version: 1.0.2 - Added alert_level_permission field
// Date: 2025-12-20

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

    // Check if user is super admin
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('is_super_admin')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.is_super_admin) {
      return NextResponse.json({ error: 'Unauthorized - Super Admin only' }, { status: 403 });
    }

    // Get the update data
    const body = await request.json();
    const userId = params.id;

    // Validate that we're only updating allowed fields
    const allowedFields = [
      // Admin roles
      'is_super_admin',
      'admin_events',
      'admin_forum',
      'admin_bbs',
      'admin_directory',
      'admin_alerts',
      'admin_ferry',
      'admin_users',
      // Permissions
      'can_create_events',
      'can_issue_alerts',
      'alert_level_permission',  // Alert level (emergency, critical, etc)
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
      'email_verified'
    ];

    const updateData: any = {};
    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.includes(key)) {
        updateData[key] = value;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Update the user using service role (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
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
