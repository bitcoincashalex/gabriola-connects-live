// app/api/cron/alert-notifications/route.ts
// Sends alerts to members by the ways and levels they chose on their profile.
// Called every minute by Supabase pg_cron (timer 'alert-notifications',
// see sql/2026-10-22-alert-notifications.sql).
// Version: 1.1.0 - Push notifications to members' phones and computers
// Previous: 1.0.0 - Email (2026-10-22)
// Date: 2026-10-23
//
// Each run:
//   1. queue_alert_notifications() (database) finds alerts that are new or were raised to a
//      higher level, sends the site inbox messages, and queues one email and/or push per member.
//   2. Pushes go out first (up to MAX_PUSH_PER_RUN members), to every device the member turned
//      them on for. A device the push service says is gone (404/410) is removed.
//   3. Then up to MAX_PER_RUN emails through Hostinger (notices@gabriolaconnects.ca, same login
//      as the welcome email). Replies go to connects@.
//
// Needs these Vercel environment variables:
//   CRON_SECRET, NOTICES_EMAIL_PASSWORD, SUPABASE_SERVICE_ROLE_KEY (already set)
//   NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (push keys; pushes are skipped without them)
// Optional:
//   WELCOME_EMAIL_USER / WELCOME_EMAIL_PASSWORD / WELCOME_EMAIL_REPLY_TO - same as welcome email
//   ALERT_EMAILS=off - stop alert emails (inbox messages still go)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import webpush from 'web-push';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_PER_RUN = 40;
const MAX_ATTEMPTS = 3;
const MAX_PUSH_PER_RUN = 100;
const SITE = 'https://www.gabriolaconnects.ca';

const LEVEL: Record<string, string> = { emergency: 'Emergency', warning: 'Warning', advisory: 'Advisory', info: 'Info' };

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

interface AlertRow {
  id: string;
  title: string;
  message: string | null;
  severity: string;
  link_url: string | null;
  link_text: string | null;
  on_behalf_of_name: string | null;
}

function alertText(a: AlertRow, level: string, stopUrl: string): string {
  return [
    `${level} alert: ${a.title}`,
    '',
    a.message || '',
    '',
    a.on_behalf_of_name ? `From: ${a.on_behalf_of_name}` : '',
    a.link_url ? `${a.link_text || 'More information'}: ${a.link_url}` : '',
    `All current alerts: ${SITE}/alerts`,
    '',
    '--',
    'You get these because of your Notification Preferences on Gabriola Connects.',
    `Change them: ${SITE}/profile/edit`,
    `Stop alert emails: ${stopUrl}`,
  ].filter((l, i, arr) => l !== '' || arr[i - 1] !== '').join('\n');
}

function alertHtml(a: AlertRow, level: string, stopUrl: string): string {
  const colour = a.severity === 'emergency' ? '#B42318' : a.severity === 'warning' ? '#C4320A' : a.severity === 'advisory' ? '#9A6700' : '#1D4ED8';
  const body = escapeHtml(a.message || '').replace(/\n/g, '<br>');
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#F6F2EA;font-family:Arial,Helvetica,sans-serif;color:#1F2A24;font-size:16px;line-height:1.5">
<div style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #E3DCCF;border-radius:12px;padding:28px">
<p style="margin:0 0 8px 0;font-size:13px;font-weight:bold;letter-spacing:0.06em;text-transform:uppercase;color:${colour}">${escapeHtml(level)} alert</p>
<h1 style="margin:0 0 14px 0;font-size:22px;line-height:1.25">${escapeHtml(a.title)}</h1>
${body ? `<p style="margin:0 0 16px 0">${body}</p>` : ''}
${a.on_behalf_of_name ? `<p style="margin:0 0 16px 0;color:#5B6660;font-size:14px">From: ${escapeHtml(a.on_behalf_of_name)}</p>` : ''}
${a.link_url ? `<p style="margin:0 0 16px 0"><a href="${escapeHtml(a.link_url)}" style="color:#2D5F3F;font-weight:bold">${escapeHtml(a.link_text || 'More information')}</a></p>` : ''}
<p style="margin:0"><a href="${SITE}/alerts" style="color:#2D5F3F">All current alerts on Gabriola Connects</a></p>
</div>
<p style="max-width:560px;margin:16px auto 0 auto;font-size:13px;color:#5B6660;line-height:1.5">You get these because of your Notification Preferences on Gabriola Connects.
<a href="${SITE}/profile/edit" style="color:#5B6660">Change them</a> or <a href="${escapeHtml(stopUrl)}" style="color:#5B6660">stop alert emails</a>.</p>
</body></html>`;
}

// Push notifications. Returns how many devices got one.
async function sendPushes(supabase: any): Promise<number> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  const { data: pending, error } = await supabase
    .from('alert_deliveries')
    .select('id, attempts, severity, alert_id, user_id')
    .eq('status', 'pending')
    .eq('channel', 'push')
    .order('created_at', { ascending: true })
    .limit(MAX_PUSH_PER_RUN);
  if (error) {
    console.error('[alert-notifications] could not read push queue:', error.message);
    return 0;
  }
  if (!pending || pending.length === 0) return 0;
  if (!publicKey || !privateKey) {
    console.error('[alert-notifications] push keys not set (NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY); pushes waiting');
    return 0;
  }
  webpush.setVapidDetails('mailto:connects@gabriolaconnects.ca', publicKey, privateKey);

  const alertIds = Array.from(new Set(pending.map((p: any) => p.alert_id)));
  const userIds = Array.from(new Set(pending.map((p: any) => p.user_id)));
  const [{ data: alerts }, { data: subs }] = await Promise.all([
    supabase.from('alerts').select('id, title, message, severity, active, expires_at').in('id', alertIds),
    supabase.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth, failures').in('user_id', userIds),
  ]);
  const alertById = new Map((alerts || []).map((a: any) => [a.id, a]));

  let devices = 0;
  for (const d of pending) {
    const a: any = alertById.get(d.alert_id);
    const mine = (subs || []).filter((s: any) => s.user_id === d.user_id);
    const stale = !a || !a.active || (a.expires_at && new Date(a.expires_at).getTime() <= Date.now());
    if (stale || mine.length === 0) {
      await supabase.from('alert_deliveries').update({ status: 'skipped' }).eq('id', d.id);
      continue;
    }

    const level = LEVEL[d.severity] || 'Info';
    const body = (a.message || '').replace(/\s+/g, ' ').trim();
    const payload = JSON.stringify({
      title: `${level}: ${a.title}`,
      body: body.length > 180 ? body.slice(0, 177) + '...' : body,
      url: `${SITE}/alerts`,
      tag: `alert-${a.id}`,
      urgent: d.severity === 'emergency' || d.severity === 'warning',
    });

    let delivered = 0;
    for (const s of mine) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          { TTL: 6 * 60 * 60, urgency: d.severity === 'emergency' || d.severity === 'warning' ? 'high' : 'normal' }
        );
        delivered++;
        await supabase.from('push_subscriptions').update({ last_success_at: new Date().toISOString(), failures: 0 }).eq('id', s.id);
      } catch (e: any) {
        const code = e?.statusCode;
        if (code === 404 || code === 410) {
          // The phone or browser no longer accepts them (uninstalled, turned off, signed out)
          await supabase.from('push_subscriptions').delete().eq('id', s.id);
        } else {
          console.error('[alert-notifications] push failed', code, e?.body || e?.message || e);
          if ((s.failures || 0) + 1 >= 10) {
            await supabase.from('push_subscriptions').delete().eq('id', s.id);
          } else {
            await supabase.from('push_subscriptions').update({ failures: (s.failures || 0) + 1 }).eq('id', s.id);
          }
        }
      }
    }
    devices += delivered;

    const attempts = (d.attempts || 0) + 1;
    if (delivered > 0) {
      await supabase.from('alert_deliveries').update({ status: 'sent', attempts, sent_at: new Date().toISOString() }).eq('id', d.id);
    } else {
      await supabase.from('alert_deliveries').update({ status: attempts >= MAX_ATTEMPTS ? 'failed' : 'pending', attempts }).eq('id', d.id);
    }
  }
  return devices;
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  // 1. New or raised alerts: inbox messages go now, emails are queued
  const { data: handled, error: queueError } = await supabase.rpc('queue_alert_notifications');
  if (queueError) {
    console.error('[alert-notifications] queue failed:', queueError.message);
    return NextResponse.json({ error: 'Queue failed' }, { status: 500 });
  }

  const pushed = await sendPushes(supabase);

  if (process.env.ALERT_EMAILS === 'off') {
    return NextResponse.json({ alerts: handled, pushed, emailed: 0, note: 'ALERT_EMAILS is off' });
  }

  // 2. Queued emails
  const { data: pending, error } = await supabase
    .from('alert_deliveries')
    .select('id, attempts, severity, alert_id, user_id')
    .eq('status', 'pending')
    .eq('channel', 'email')
    .order('created_at', { ascending: true })
    .limit(MAX_PER_RUN);
  if (error) {
    console.error('[alert-notifications] could not read queue:', error.message);
    return NextResponse.json({ error: 'Could not read queue' }, { status: 500 });
  }
  if (!pending || pending.length === 0) {
    return NextResponse.json({ alerts: handled, pushed, emailed: 0 });
  }

  const pass = process.env.WELCOME_EMAIL_PASSWORD || process.env.NOTICES_EMAIL_PASSWORD;
  if (!pass) {
    return NextResponse.json({ error: 'No mailbox password set (NOTICES_EMAIL_PASSWORD)' }, { status: 500 });
  }
  const user = process.env.WELCOME_EMAIL_USER || process.env.NOTICES_EMAIL_USER || 'notices@gabriolaconnects.ca';
  const replyTo = process.env.WELCOME_EMAIL_REPLY_TO || 'connects@gabriolaconnects.ca';

  const alertIds = Array.from(new Set(pending.map(p => p.alert_id)));
  const userIds = Array.from(new Set(pending.map(p => p.user_id)));
  const [{ data: alerts }, { data: members }, { data: tokens }] = await Promise.all([
    supabase.from('alerts').select('id, title, message, severity, link_url, link_text, on_behalf_of_name, active, expires_at').in('id', alertIds),
    supabase.from('users').select('id, email, notify_email').in('id', userIds),
    supabase.from('alert_email_tokens').select('user_id, token').in('user_id', userIds),
  ]);
  const alertById = new Map((alerts || []).map((a: any) => [a.id, a]));
  const memberById = new Map((members || []).map((m: any) => [m.id, m]));
  const tokenByMember = new Map((tokens || []).map((t: any) => [t.user_id, t.token as string]));

  const transport = nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true,
    pool: true,
    maxConnections: 2,
    auth: { user, pass },
  });

  let emailed = 0;
  for (const d of pending) {
    const a = alertById.get(d.alert_id) as (AlertRow & { active: boolean; expires_at: string | null }) | undefined;
    const m = memberById.get(d.user_id) as { email: string | null; notify_email: boolean | null } | undefined;
    const token = tokenByMember.get(d.user_id);

    // Taken down, expired, or the member turned email off since it was queued: don't send
    const stale = !a || !a.active || (a.expires_at && new Date(a.expires_at).getTime() <= Date.now());
    if (stale || !m || !m.email || m.notify_email !== true || !token) {
      await supabase.from('alert_deliveries').update({ status: 'skipped' }).eq('id', d.id);
      continue;
    }

    const attempts = (d.attempts || 0) + 1;
    await supabase.from('alert_deliveries').update({ attempts }).eq('id', d.id);

    const level = LEVEL[d.severity] || 'Info';
    const stopUrl = `${SITE}/api/alerts/unsubscribe?t=${token}`;
    try {
      await transport.sendMail({
        from: { name: 'Gabriola Connects', address: user },
        replyTo,
        to: m.email,
        subject: `${level} alert: ${a!.title}`,
        text: alertText(a!, level, stopUrl),
        html: alertHtml(a!, level, stopUrl),
        list: { unsubscribe: { url: stopUrl, comment: 'Stop alert emails' } },
        headers: { 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      });
      await supabase.from('alert_deliveries').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', d.id);
      emailed++;
    } catch (e: any) {
      console.error('[alert-notifications] send failed for', d.id, e?.message || e);
      if (attempts >= MAX_ATTEMPTS) {
        await supabase.from('alert_deliveries').update({ status: 'failed' }).eq('id', d.id);
      }
    }
  }

  transport.close();
  return NextResponse.json({ alerts: handled, pushed, emailed });
}
