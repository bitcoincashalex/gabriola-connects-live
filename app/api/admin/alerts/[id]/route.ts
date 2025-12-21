// app/api/admin/alerts/[id]/route.ts
// Version: 1.1.0 - Fixed authentication using cookies() properly
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

// Create authenticated client from cookies
const createAuthClient = async () => {
  const cookieStore = await cookies();
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          cookie: cookieStore.toString()
        }
      }
    }
  );
};

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
    // Create authenticated client
    const supabase = await createAuthClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Not logged in' }, { status: 401 });
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
    // Create authenticated client
    const supabase = await createAuthClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Not logged in' }, { status: 401 });
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
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
