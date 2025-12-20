// app/api/stats/route.ts
// Version: 1.0.0 - Public community stats API
// Date: 2025-12-18
// Purpose: Provide public access to community stats counts without exposing user data

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key to bypass RLS for counting
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // Count verified residents
    const { count: residentCount } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_resident', true);

    // Count total members
    const { count: memberCount } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Count upcoming events (future events only)
    const today = new Date().toISOString().split('T')[0];
    const { count: eventCount } = await supabaseAdmin
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('is_approved', true)
      .gte('start_date', today);

    // Count businesses in directory
    const { count: businessCount } = await supabaseAdmin
      .from('directory_businesses')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      residents: residentCount || 0,
      totalMembers: memberCount || 0,
      upcomingEvents: eventCount || 0,
      businesses: businessCount || 0,
    });
  } catch (error) {
    console.error('[Stats API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
