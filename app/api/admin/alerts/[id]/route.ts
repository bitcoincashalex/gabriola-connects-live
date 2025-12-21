// app/api/admin/alerts/[id]/route.ts
// Version: 2.0.0 - MAJOR: Uses Authorization header instead of cookies (cookies not accessible in API routes)
// Date: 2025-12-20

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

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

// Get user from Authorization header
async function getUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('❌ No Authorization header found');
    return { user: null, error: 'No authorization header' };
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  console.log('✅ Found auth token in header');
  
  try {
    // Create a client and verify the token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) {
      console.error('❌ Error verifying token:', error);
      return { user: null, error: error.message };
    }
    
    console.log('✅ User verified:', user?.id);
    return { user, error: null };
  } catch (e: any) {
    console.error('❌ Failed to verify token:', e);
    return { user: null, error: e.message };
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
    // Get user from Authorization header
    const { user, error: authError } = await getUserFromRequest(request);
    
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
    // Get user from Authorization header
    const { user, error: authError } = await getUserFromRequest(request);
    
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
