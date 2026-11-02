// app/api/cron/weekly-digest/route.ts
// Friday mornings: emails the weekly update to members who ticked "Weekly email update".
// Called by Supabase pg_cron (timer 'weekly-digest', every 10 minutes 7:00-8:59 a.m. Gabriola time
// on Fridays) so a big list goes out in batches; each member gets it at most once a week.
// Version: 1.0.0
// Date: 2026-11-02
//
// Needs (already set): CRON_SECRET, NOTICES_EMAIL_PASSWORD, SUPABASE_SERVICE_ROLE_KEY
// Optional: WEEKLY_DIGEST=off - stop sending

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildDigest } from '@/lib/weeklyDigest';
import { digestTransport, stopToken, sendDigest } from '@/lib/digestSend';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_PER_RUN = 40;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (process.env.WEEKLY_DIGEST === 'off') return NextResponse.json({ sent: 0, note: 'WEEKLY_DIGEST is off' });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  // Members who want it and haven't had one in the last 6 days
  const sixDaysAgo = new Date(Date.now() - 6 * 86400000).toISOString();
  const { data: members, error } = await supabase
    .from('users')
    .select('id, email')
    .eq('digest_email', true)
    .not('email', 'is', null)
    .or(`digest_last_sent_at.is.null,digest_last_sent_at.lt.${sixDaysAgo}`)
    .limit(MAX_PER_RUN);
  if (error) {
    console.error('[weekly-digest] could not read members:', error.message);
    return NextResponse.json({ error: 'Could not read members' }, { status: 500 });
  }
  if (!members || members.length === 0) return NextResponse.json({ sent: 0 });

  const digest = await buildDigest(supabase);
  let mail;
  try {
    mail = digestTransport();
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  let sent = 0;
  for (const m of members) {
    // Mark first, so a crash part-way can't send anyone two in one week
    await supabase.from('users').update({ digest_last_sent_at: new Date().toISOString() }).eq('id', m.id);
    try {
      const token = await stopToken(supabase, m.id);
      if (!token) throw new Error('no stop link');
      await sendDigest(mail, digest, m.email, token);
      sent++;
    } catch (e: any) {
      console.error('[weekly-digest] send failed for', m.id, e?.message || e);
    }
  }
  mail.transport.close();
  return NextResponse.json({ sent, of: members.length });
}
