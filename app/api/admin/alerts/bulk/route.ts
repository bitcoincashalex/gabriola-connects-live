// app/api/admin/alerts/bulk/route.ts
// Version: 1.0.0 - Bulk operations on alerts (super admin only)
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Helper to verify super admin
async function verifySuperAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from('users')
    .select('is_super_admin')
    .eq('id', userId)
    .single();
  
  return data?.is_super_admin === true;
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const authCookie = cookieStore.get('sb-access-token');
    
    if (!authCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user } } = await supabase.auth.getUser(authCookie.value);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify super admin
    const isSuperAdmin = await verifySuperAdmin(user.id);
    
    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Super admin only' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, alert_ids } = body;

    if (action === 'archive') {
      // Archive specific alerts or all expired
      if (alert_ids && Array.isArray(alert_ids)) {
        // Archive specific alerts
        const { error } = await supabaseAdmin
          .from('alerts')
          .update({ active: false })
          .in('id', alert_ids);

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          count: alert_ids.length
        });
      } else {
        // Archive all expired alerts
        const { data, error } = await supabaseAdmin
          .from('alerts')
          .update({ active: false })
          .eq('active', true)
          .lt('expires_at', new Date().toISOString())
          .select('id');

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          count: data?.length || 0
        });
      }
    }

    if (action === 'delete') {
      // Delete specific alerts
      if (!alert_ids || !Array.isArray(alert_ids)) {
        return NextResponse.json(
          { error: 'alert_ids required for delete' },
          { status: 400 }
        );
      }

      const { error } = await supabaseAdmin
        .from('alerts')
        .delete()
        .in('id', alert_ids);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        count: alert_ids.length
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
