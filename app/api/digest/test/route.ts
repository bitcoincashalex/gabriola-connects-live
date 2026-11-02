// app/api/digest/test/route.ts
// "Send me this week's now" on Edit Profile (super admins): emails this week's update to yourself,
// so you can see it before Friday. Doesn't change when your regular one goes out.
// Version: 1.0.0
// Date: 2026-11-02

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildDigest } from '@/lib/weeklyDigest';
import { digestTransport, stopToken, sendDigest } from '@/lib/digestSend';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ error: 'Please sign in' }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: 'Please sign in' }, { status: 401 });

  const { data: me } = await supabase.from('users').select('email, is_super_admin').eq('id', user.id).maybeSingle();
  if (!me?.is_super_admin) return NextResponse.json({ error: 'Super admins only' }, { status: 403 });
  if (!me.email) return NextResponse.json({ error: 'No email on your account' }, { status: 400 });

  try {
    const digest = await buildDigest(supabase);
    const mail = digestTransport();
    const stop = await stopToken(supabase, user.id);
    if (!stop) throw new Error('no stop link');
    await sendDigest(mail, digest, me.email, stop);
    mail.transport.close();
    return NextResponse.json({ sent: 1, to: me.email });
  } catch (e: any) {
    console.error('[digest/test]', e?.message || e);
    return NextResponse.json({ error: 'Could not send' }, { status: 500 });
  }
}
