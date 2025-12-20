// app/api/track-view/route.ts
// Version: 2.1.2 - Optimized to only get specific Supabase auth cookies
// Date: 2025-12-18

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Use service role key to bypass RLS (allows anonymous view tracking)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { postId, type } = await request.json();

    if (type !== 'post') {
      return NextResponse.json({ success: true });
    }

    // ========================================================================
    // 1. GET POST AUTHOR
    // ========================================================================
    const { data: post, error: postError } = await supabaseAdmin
      .from('bbs_posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      console.error('[Track View] Post not found:', postError);
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const authorId = post.user_id;

    // ========================================================================
    // 2. GET CURRENT VIEWER (if authenticated)
    // ========================================================================
    let viewerId: string | null = null;
    
    try {
      const cookieStore = cookies();
      
      // Supabase stores auth in cookies named: sb-{project-ref}-auth-token
      // Extract project ref from Supabase URL
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
      
      if (projectRef) {
        // Get the specific Supabase auth token cookie(s)
        // May be chunked: sb-{ref}-auth-token.0, sb-{ref}-auth-token.1, etc.
        const cookieBaseName = `sb-${projectRef}-auth-token`;
        
        // Try to get main token first
        let authToken = cookieStore.get(cookieBaseName)?.value;
        
        // If not found, try chunked cookies (.0, .1, .2, etc)
        if (!authToken) {
          const chunks: string[] = [];
          let chunkIndex = 0;
          let chunk = cookieStore.get(`${cookieBaseName}.${chunkIndex}`);
          
          while (chunk) {
            chunks.push(chunk.value);
            chunkIndex++;
            chunk = cookieStore.get(`${cookieBaseName}.${chunkIndex}`);
          }
          
          if (chunks.length > 0) {
            authToken = chunks.join('');
          }
        }
        
        // Verify token and get user
        if (authToken) {
          const { data: { user }, error } = await supabaseAdmin.auth.getUser(authToken);
          if (!error && user) {
            viewerId = user.id;
          }
        }
      }
    } catch (err) {
      // Not authenticated or error getting user - track as anonymous
      console.log('[Track View] Tracking as anonymous user');
    }

    // ========================================================================
    // 3. CHECK IF VIEWER IS AUTHOR - Don't track if true
    // ========================================================================
    if (viewerId && viewerId === authorId) {
      console.log('[Track View] Skipping: Author viewing own post');
      return NextResponse.json({ success: true, skipped: 'author' });
    }

    // ========================================================================
    // 4. GET IP ADDRESS
    // ========================================================================
    const ip = 
      request.headers.get('x-real-ip') ||
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-vercel-forwarded-for') ||
      request.ip ||
      '0.0.0.0';

    // ========================================================================
    // 5. TRACK VIEW (by user_id if logged in, by IP if anonymous)
    // ========================================================================
    const viewDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const { error: insertError } = await supabaseAdmin.from('post_views').insert({
      post_id: postId,
      user_id: viewerId, // NULL for anonymous users
      ip_address: ip,
      view_date: viewDate,
    });

    // ========================================================================
    // 6. UPDATE VIEW COUNT ON POST
    // ========================================================================
    if (!insertError) {
      // Count unique views (by user_id OR ip_address per day)
      const { count } = await supabaseAdmin
        .from('post_views')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);

      await supabaseAdmin
        .from('bbs_posts')
        .update({ view_count: count || 0 })
        .eq('id', postId);

      console.log(`[Track View] Tracked view for post ${postId}, total: ${count}`);
    } else {
      // Duplicate view (same user/IP already viewed today) - this is fine
      console.log('[Track View] Duplicate view (already tracked today)');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Track View] Error:', error);
    return NextResponse.json({ error: 'Failed to track view' }, { status: 500 });
  }
}
