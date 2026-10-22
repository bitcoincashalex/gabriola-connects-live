// app/api/cron/welcome-email/route.ts
// Emails a welcome to people who have just registered. Called every 5 minutes by Supabase
// pg_cron (timer 'welcome-email', see sql/2026-10-22-welcome-new-members.sql).
// Version: 1.0.0
// Date: 2026-10-22
//
// Sends through Hostinger from notices@gabriolaconnects.ca, using the login the notices
// reader already has, so no new secret is needed. Replies go to connects@gabriolaconnects.ca.
//
// Needs these Vercel environment variables (already set):
//   CRON_SECRET, NOTICES_EMAIL_PASSWORD, SUPABASE_SERVICE_ROLE_KEY
// Optional:
//   WELCOME_EMAIL_USER / WELCOME_EMAIL_PASSWORD - send from a different Hostinger mailbox
//   WELCOME_EMAIL_REPLY_TO                      - defaults to connects@gabriolaconnects.ca
//   WELCOME_EMAIL=off                           - stop sending without removing anything
//
// Rules:
//   - Only members with no welcome_email_sent_at, who joined in the last 7 days.
//     (The SQL marks everyone who was already a member as done.)
//   - At most 10 per run, at most 3 tries each.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_PER_RUN = 10;
const MAX_ATTEMPTS = 3;
const SITE = 'https://www.gabriolaconnects.ca';

function firstName(first?: string | null, full?: string | null): string | null {
  const name = (first || '').trim() || (full || '').trim().split(/\s+/)[0] || '';
  return name && name.toLowerCase() !== 'user' ? name : null;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const FEATURES = [
  'Ferry status, updated every 5 minutes',
  'Island alerts for power outages and island notices',
  'Events, all on one calendar',
  'The forum, where you can post without your name if you like',
  'The business directory, and you can add yours free',
  'The Island Map',
  'Volunteer opportunities',
  'Buy, Sell, Rent & Free',
];

function welcomeText(name: string | null, replyTo: string): string {
  return [
    `Hi ${name || 'there'},`,
    '',
    'Thank you for registering on Gabriola Connects. I built it so that everything happening on Gabriola is in one place, and it is free for every islander.',
    '',
    'Here is what you can use today:',
    '',
    ...FEATURES.map(f => `- ${f}`),
    '',
    `There is also a message waiting for you in your inbox on the site: ${SITE}/messages`,
    '',
    `If something doesn't work the way you expect, or you have an idea that would make it more useful, reply to this email and it comes straight to me (${replyTo}).`,
    '',
    'Alex',
    'gabriolaconnects.ca',
  ].join('\n');
}

function welcomeHtml(name: string | null): string {
  const p = 'margin:0 0 16px 0;';
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#F6F2EA;font-family:Arial,Helvetica,sans-serif;color:#1F2A24;font-size:16px;line-height:1.5">
<div style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #E3DCCF;border-radius:12px;padding:28px">
<p style="${p}">Hi ${escapeHtml(name || 'there')},</p>
<p style="${p}">Thank you for registering on Gabriola Connects. I built it so that everything happening on Gabriola is in one place, and it is free for every islander.</p>
<p style="${p}">Here is what you can use today:</p>
<ul style="margin:0 0 16px 0;padding-left:22px">${FEATURES.map(f => `<li style="margin:0 0 4px 0">${escapeHtml(f)}</li>`).join('')}</ul>
<p style="${p}">There is also a message waiting for you in your <a href="${SITE}/messages" style="color:#2D5F3F;font-weight:bold">inbox on the site</a>.</p>
<p style="${p}">If something doesn't work the way you expect, or you have an idea that would make it more useful, reply to this email and it comes straight to me.</p>
<p style="margin:0">Alex<br><a href="${SITE}" style="color:#2D5F3F">gabriolaconnects.ca</a></p>
</div></body></html>`;
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (process.env.WELCOME_EMAIL === 'off') {
    return NextResponse.json({ sent: 0, note: 'WELCOME_EMAIL is off' });
  }

  const user = process.env.WELCOME_EMAIL_USER || process.env.NOTICES_EMAIL_USER || 'notices@gabriolaconnects.ca';
  const pass = process.env.WELCOME_EMAIL_PASSWORD || process.env.NOTICES_EMAIL_PASSWORD;
  const replyTo = process.env.WELCOME_EMAIL_REPLY_TO || 'connects@gabriolaconnects.ca';
  if (!pass) {
    return NextResponse.json({ error: 'No mailbox password set (NOTICES_EMAIL_PASSWORD)' }, { status: 500 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: pending, error } = await supabase
    .from('users')
    .select('id, email, first_name, full_name, welcome_email_attempts')
    .is('welcome_email_sent_at', null)
    .lt('welcome_email_attempts', MAX_ATTEMPTS)
    .gte('created_at', since)
    .not('email', 'is', null)
    .order('created_at', { ascending: true })
    .limit(MAX_PER_RUN);

  if (error) {
    console.error('[welcome-email] could not read members:', error.message);
    return NextResponse.json({ error: 'Could not read members' }, { status: 500 });
  }
  if (!pending || pending.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const transport = nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true,
    auth: { user, pass },
  });

  const results: { id: string; status: string }[] = [];
  for (const m of pending) {
    // Count the try first, so a crash mid-send can't loop forever
    await supabase.from('users')
      .update({ welcome_email_attempts: (m.welcome_email_attempts || 0) + 1 })
      .eq('id', m.id);

    const name = firstName(m.first_name, m.full_name);
    try {
      await transport.sendMail({
        from: { name: 'Gabriola Connects', address: user },
        replyTo,
        to: m.email,
        subject: 'Welcome to Gabriola Connects',
        text: welcomeText(name, replyTo),
        html: welcomeHtml(name),
      });
      await supabase.from('users').update({ welcome_email_sent_at: new Date().toISOString() }).eq('id', m.id);
      results.push({ id: m.id, status: 'sent' });
    } catch (e: any) {
      console.error('[welcome-email] send failed for', m.id, e?.message || e);
      results.push({ id: m.id, status: 'failed' });
    }
  }

  transport.close();
  return NextResponse.json({ sent: results.filter(r => r.status === 'sent').length, results });
}
