// lib/digestSend.ts
// Sends the weekly email update to one member (used by the Friday timer and "send me one now").
// Version: 1.0.0
// Date: 2026-11-02
//
// Same mailbox as the welcome and alert emails: notices@gabriolaconnects.ca on Hostinger,
// replies to connects@. Each email carries the member's private "stop" link
// (alert_email_tokens, shared with the alert emails; ?w=digest stops only this email).

import nodemailer from 'nodemailer';
import { Digest, SITE, digestSubject, digestText, digestHtml } from '@/lib/weeklyDigest';

export function digestTransport() {
  const pass = process.env.WELCOME_EMAIL_PASSWORD || process.env.NOTICES_EMAIL_PASSWORD;
  if (!pass) throw new Error('No mailbox password set (NOTICES_EMAIL_PASSWORD)');
  const user = process.env.WELCOME_EMAIL_USER || process.env.NOTICES_EMAIL_USER || 'notices@gabriolaconnects.ca';
  const transport = nodemailer.createTransport({
    host: 'smtp.hostinger.com', port: 465, secure: true, pool: true, maxConnections: 2,
    auth: { user, pass },
  });
  return { transport, from: user, replyTo: process.env.WELCOME_EMAIL_REPLY_TO || 'connects@gabriolaconnects.ca' };
}

// The member's private code for "stop" links (made the first time it's needed)
export async function stopToken(supabase: any, userId: string): Promise<string | null> {
  await supabase.from('alert_email_tokens').upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true });
  const { data } = await supabase.from('alert_email_tokens').select('token').eq('user_id', userId).maybeSingle();
  return data?.token || null;
}

export async function sendDigest(
  mail: ReturnType<typeof digestTransport>, digest: Digest, to: string, token: string,
) {
  const stopUrl = `${SITE}/api/alerts/unsubscribe?w=digest&t=${token}`;
  await mail.transport.sendMail({
    from: { name: 'Gabriola Connects', address: mail.from },
    replyTo: mail.replyTo,
    to,
    subject: digestSubject(digest),
    text: digestText(digest, stopUrl),
    html: digestHtml(digest, stopUrl),
    list: { unsubscribe: { url: stopUrl, comment: 'Stop the weekly email' } },
    headers: { 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  });
}
