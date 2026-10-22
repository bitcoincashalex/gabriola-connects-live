// app/api/alerts/unsubscribe/route.ts
// "Stop alert emails" link at the bottom of every alert email.
// Version: 1.0.0
// Date: 2026-10-22
//
// GET shows a page with a button (so email scanners that open links don't unsubscribe people).
// POST turns alert emails off. Mail apps' one-click unsubscribe also POSTs here.
// The link carries the member's private code from alert_email_tokens, not their id or email.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const TOKEN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function page(title: string, body: string): NextResponse {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} - Gabriola Connects</title></head>
<body style="margin:0;padding:24px;background:#F6F2EA;font-family:Arial,Helvetica,sans-serif;color:#1F2A24;font-size:17px;line-height:1.5">
<div style="max-width:520px;margin:40px auto;background:#FFFFFF;border:1px solid #E3DCCF;border-radius:12px;padding:28px">
<h1 style="margin:0 0 12px 0;font-size:24px">${title}</h1>
${body}
<p style="margin:20px 0 0 0"><a href="https://www.gabriolaconnects.ca/" style="color:#2D5F3F;font-weight:bold">Go to Gabriola Connects</a></p>
</div></body></html>`;
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export async function GET(request: NextRequest) {
  const t = request.nextUrl.searchParams.get('t') || '';
  if (!TOKEN.test(t)) {
    return page('Link not recognised', '<p style="margin:0">This link isn\'t complete. You can change your alert emails on your profile, under Notification Preferences.</p>');
  }
  return page('Stop alert emails?', `<p style="margin:0 0 18px 0">You'll stop getting alert emails from Gabriola Connects. Alerts still show on the site, and you can turn emails back on in your profile any time.</p>
<form method="post" action="/api/alerts/unsubscribe?t=${t}">
<button type="submit" style="min-height:48px;padding:0 22px;border:0;border-radius:8px;background:#2D5F3F;color:#FFFFFF;font-size:17px;font-weight:bold;cursor:pointer">Stop alert emails</button>
</form>`);
}

export async function POST(request: NextRequest) {
  const t = request.nextUrl.searchParams.get('t') || '';
  if (!TOKEN.test(t)) {
    return page('Link not recognised', '<p style="margin:0">This link isn\'t complete. You can change your alert emails on your profile, under Notification Preferences.</p>');
  }
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { data: found } = await supabase.from('alert_email_tokens').select('user_id').eq('token', t).maybeSingle();
  if (!found) {
    return page('Link not recognised', '<p style="margin:0">We couldn\'t find that link. You can change your alert emails on your profile, under Notification Preferences.</p>');
  }
  const { data, error } = await supabase
    .from('users')
    .update({ notify_email: false, notify_prefs_saved_at: new Date().toISOString() })
    .eq('id', found.user_id)
    .select('id');
  if (error) {
    console.error('[alerts/unsubscribe]', error.message);
    return page('Something went wrong', '<p style="margin:0">Sorry, that didn\'t work. Please try again, or turn alert emails off on your profile under Notification Preferences.</p>');
  }
  if (!data || data.length === 0) {
    return page('Link not recognised', '<p style="margin:0">We couldn\'t find that link. You can change your alert emails on your profile, under Notification Preferences.</p>');
  }
  // Skip anything already queued for them
  await supabase.from('alert_deliveries').update({ status: 'skipped' }).eq('user_id', data[0].id).eq('status', 'pending');
  return page('Alert emails stopped', '<p style="margin:0">You won\'t get alert emails any more. Alerts still show on the site, and you can turn emails back on in your profile under Notification Preferences.</p>');
}
