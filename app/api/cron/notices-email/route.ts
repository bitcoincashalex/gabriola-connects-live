// app/api/cron/notices-email/route.ts
// Reads new mail in notices@gabriolaconnects.ca every 5 minutes (called by Supabase pg_cron),
// has the AI decide what each email means for Gabriola, and publishes alerts.
// Version: 1.0.0
// Date: 2026-10-10
//
// Needs these Vercel environment variables:
//   CRON_SECRET               - same secret as the ferry check
//   NOTICES_EMAIL_PASSWORD    - password of notices@gabriolaconnects.ca (Hostinger)
//   ANTHROPIC_API_KEY         - Claude API key
//   AUTO_ALERT_USER_ID        - users.id that automatic alerts are "issued by"
//   SUPABASE_SERVICE_ROLE_KEY - already set
// Optional:
//   NOTICES_EMAIL_USER        - defaults to notices@gabriolaconnects.ca
//   NOTICE_TRUSTED_DOMAINS    - extra trusted sender domains, comma separated
//   NOTICES_AUTO_PUBLISH=off  - hold everything for review instead of publishing
//
// Safety rules (enforced here in code, not left to the AI):
//   - Only senders on the trusted list whose email signature verifies can auto-publish.
//   - Everything else the AI thinks matters is held for review at /admin/notices.
//   - Every email is logged in inbound_notices, whatever happens to it.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { triageEmail, TRIAGE_MODEL } from '@/lib/noticeTriage';
import { checkSender } from '@/lib/senderTrust';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_PER_RUN = 5;      // emails handled per 5-minute run
const MAX_ATTEMPTS = 3;     // give up on an email after this many failures

function headerList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(v => (typeof v === 'string' ? v : JSON.stringify(v)));
  return [typeof value === 'string' ? value : JSON.stringify(value)];
}

function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/p>|<\/div>|<\/li>|<\/h\d>/gi, '\n')
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.NOTICES_EMAIL_PASSWORD || !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'NOTICES_EMAIL_PASSWORD or ANTHROPIC_API_KEY not set' }, { status: 500 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const issuer = process.env.AUTO_ALERT_USER_ID;
  const autoPublish = process.env.NOTICES_AUTO_PUBLISH !== 'off' && Boolean(issuer);

  const imap = new ImapFlow({
    host: 'imap.hostinger.com',
    port: 993,
    secure: true,
    auth: { user: process.env.NOTICES_EMAIL_USER || 'notices@gabriolaconnects.ca', pass: process.env.NOTICES_EMAIL_PASSWORD },
    logger: false,
  });

  const results: { subject: string; status: string }[] = [];

  try {
    await imap.connect();
    const lock = await imap.getMailboxLock('INBOX');
    try {
      const found = await imap.search({ seen: false }, { uid: true });
      const uids = (found || []).slice(0, MAX_PER_RUN);

      for (const uid of uids) {
        const msg = await imap.fetchOne(String(uid), { source: true }, { uid: true });
        if (!msg || !msg.source) continue;
        const parsed = await simpleParser(msg.source);

        const messageId = parsed.messageId || `uid-${uid}-${parsed.date?.toISOString() || ''}`;
        const fromAddress = parsed.from?.value?.[0]?.address || '';
        const subject = parsed.subject || '(no subject)';
        const text = (parsed.text && parsed.text.trim()) || (parsed.html ? htmlToText(String(parsed.html)) : '');

        // Already handled (or given up on)? Just mark it read.
        const { data: existing } = await supabase
          .from('inbound_notices').select('status, attempts').eq('message_id', messageId).maybeSingle();
        if (existing && existing.status !== 'error') {
          await imap.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true });
          continue;
        }
        const attempts = (existing?.attempts || 0) + 1;

        const trust = checkSender(fromAddress, headerList(parsed.headers.get('authentication-results')));

        const base = {
          message_id: messageId,
          received_at: (parsed.date || new Date()).toISOString(),
          from_address: fromAddress,
          from_domain: trust.fromDomain,
          subject: subject.slice(0, 300),
          body_excerpt: text.slice(0, 4000),
          sender_trusted: trust.trusted,
          auth_summary: trust.summary,
          attempts,
        };

        try {
          const ai = await triageEmail({ from: fromAddress, subject, date: base.received_at, text });

          let status: 'published' | 'held' | 'ignored';
          let alertId: string | null = null;

          if (ai.decision === 'ignore') {
            status = 'ignored';
          } else if (ai.decision === 'publish' && trust.trusted && autoPublish) {
            const { data: alert, error } = await supabase.from('alerts').insert({
              title: ai.title,
              message: ai.message,
              severity: ai.severity,
              category: ai.category,
              issued_by: issuer,
              on_behalf_of_name: ai.source_name || null,
              on_behalf_of_organization: ai.source_name || null,
              affected_areas: ['Gabriola Island'],
              active: true,
              expires_at: new Date(Date.now() + ai.expires_in_hours * 3600 * 1000).toISOString(),
              link_url: ai.link_url,
              link_text: ai.link_url ? 'More information' : null,
            }).select('id').single();
            if (error) throw new Error(`Alert insert failed: ${error.message}`);
            alertId = alert.id;
            status = 'published';
          } else {
            status = 'held'; // AI unsure, sender not verified, or auto-publish turned off
          }

          await supabase.from('inbound_notices').upsert({
            ...base,
            ai: { ...ai, model: TRIAGE_MODEL },
            status,
            alert_id: alertId,
            error: null,
          }, { onConflict: 'message_id' });

          await imap.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true });
          results.push({ subject, status });
        } catch (e: any) {
          const giveUp = attempts >= MAX_ATTEMPTS;
          await supabase.from('inbound_notices').upsert({
            ...base,
            status: 'error',
            error: String(e?.message || e).slice(0, 500),
          }, { onConflict: 'message_id' });
          // Leave unread to retry next run, unless we have tried too many times
          if (giveUp) await imap.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true });
          results.push({ subject, status: giveUp ? 'error (gave up)' : 'error (will retry)' });
        }
      }
    } finally {
      lock.release();
    }
    await imap.logout();
  } catch (e: any) {
    try { await imap.logout(); } catch {}
    console.error('[notices-email] mailbox error:', e?.message || e);
    return NextResponse.json({ ok: false, error: `Mailbox error: ${e?.message || e}` }, { status: 502 });
  }

  return NextResponse.json({ ok: true, processed: results.length, results, autoPublish });
}
