// app/api/admin/alerts/[id]/route.ts
// Version: 1.2.0 - Fixed auth by parsing Supabase auth cookie directly
// Date: 2025-12-20

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Service role client - bypasses RLS
const createAdminClient = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Get user from session stored in cookies
async function getUserFromCookies() {
  const cookieStore = await cookies();
  
  // Get all Supabase auth cookies
  const allCookies = cookieStore.getAll();
  
  // Find the access token cookie (Supabase stores it as sb-{project-ref}-auth-token)
  const authTokenCookie = allCookies.find(cookie => 
    cookie.name.includes('sb-') && cookie.name.includes('-auth-token')
  );
  
  if (!authTokenCookie) {
    return { user: null, error: 'No auth token found' };
  }
  
  try {
    // Parse the auth token JSON
    const authData = JSON.parse(authTokenCookie.value);
    const accessToken = authData.access_token;
    
    if (!accessToken) {
      return { user: null, error: 'No access token in cookie' };
    }
    
    // Create a client and verify the token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    return { user, error };
  } catch (e) {
    return { user: null, error: 'Failed to parse auth cookie' };
  }
}

// Helper to verify super admin
async function verifySuperAdmin(userId: string) {
  const supabaseAdmin = createAdminClient();
  const { data } = await supabaseAdmin
    .from('users')
    .select('is_super_admin')
    .eq('id', userId)
    .single();
  
  return data?.is_super_admin === true;
}

// PATCH - Update alert (super admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get user from cookies
    const { user, error: authError } = await getUserFromCookies();
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ 
        error: 'Unauthorized - Not logged in',
        details: authError 
      }, { status: 401 });
    }

    // Verify super admin
    const isSuperAdmin = await verifySuperAdmin(user.id);
    
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super admin only' }, { status: 403 });
    }

    const body = await request.json();

    // Update using service role
    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin
      .from('alerts')
      .update(body)
      .eq('id', params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('PATCH error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete alert (super admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get user from cookies
    const { user, error: authError } = await getUserFromCookies();
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ 
        error: 'Unauthorized - Not logged in',
        details: authError 
      }, { status: 401 });
    }

    // Verify super admin
    const isSuperAdmin = await verifySuperAdmin(user.id);
    
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super admin only' }, { status: 403 });
    }

    // Delete using service role
    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin
      .from('alerts')
      .delete()
      .eq('id', params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
