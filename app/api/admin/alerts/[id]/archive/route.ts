// app/api/admin/alerts/[id]/archive/route.ts
// Version: 1.0.0 - Archive alert using service role to bypass RLS
// Date: 2025-12-20

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Service role client - bypasses RLS
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

// Regular client to verify user
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get user from session
    const cookieStore = cookies();
    const authCookie = cookieStore.get('sb-access-token');
    
    if (!authCookie) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user owns the alert or is super admin
    const { data: { user } } = await supabase.auth.getUser(authCookie.value);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's permissions
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('is_super_admin')
      .eq('id', user.id)
      .single();

    // Get the alert to check ownership
    const { data: alert } = await supabaseAdmin
      .from('alerts')
      .select('issued_by')
      .eq('id', params.id)
      .single();

    if (!alert) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }

    // Check permission: must be owner or super admin
    const canArchive = alert.issued_by === user.id || userData?.is_super_admin;

    if (!canArchive) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Archive the alert using service role (bypasses RLS)
    const { error } = await supabaseAdmin
      .from('alerts')
      .update({ active: false })
      .eq('id', params.id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
