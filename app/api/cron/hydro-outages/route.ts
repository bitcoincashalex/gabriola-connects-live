// app/api/cron/hydro-outages/route.ts
// Checks BC Hydro's Gabriola Island outage feed every 5 minutes (called by Supabase pg_cron)
// and keeps power outage alerts on the site up to date.
// Version: 1.0.0
// Date: 2026-10-17
//
// Needs these Vercel environment variables (already set for the ferry check):
//   CRON_SECRET, AUTO_ALERT_USER_ID, SUPABASE_SERVICE_ROLE_KEY
// Optional:
//   HYDRO_MIN_CUSTOMERS - only outages affecting at least this many customers get an alert
//                         (default 10, so a single house losing power doesn't become island news)
//
// What it does:
//   - a new current outage (at or above the threshold) -> posts an alert (category 'hydro', 'warning')
//   - while it lasts -> keeps the alert's numbers, cause and expiry up to date
//   - once BC Hydro lists it as restored, or it drops off the feed -> the alert changes to
//     "Power restored" (severity 'info') and expires 2 hours later

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { HYDRO_FEED_URL, HYDRO_MAP_URL, parseHydroFeed, friendlyArea, friendlyTime, HydroOutage } from '@/lib/hydroOutages';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const USER_AGENT = 'GabriolaConnects/1.0 (+https://www.gabriolaconnects.ca; community outage alerts, checks every 5 minutes)';
const HOURS = 60 * 60 * 1000;

function outageMessage(o: HydroOutage): string {
  const parts = [
    `BC Hydro reports a power outage on Gabriola affecting ${o.customers} customer${o.customers === 1 ? '' : 's'} in the area of ${friendlyArea(o.area)}.`,
    o.timeOff ? `Power went off at ${friendlyTime(o.timeOff)}.` : '',
    o.cause ? `Cause: ${o.cause.charAt(0).toUpperCase() + o.cause.slice(1).toLowerCase()}.` : '',
    'To report an outage, call BC Hydro at 1-888-769-3766.',
  ];
  return parts.filter(Boolean).join(' ');
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const issuer = process.env.AUTO_ALERT_USER_ID;
  if (!issuer) return NextResponse.json({ error: 'AUTO_ALERT_USER_ID not set' }, { status: 500 });
  const minCustomers = Number(process.env.HYDRO_MIN_CUSTOMERS || 10);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  // Read the feed. If it can't be read, change nothing.
  let outages: HydroOutage[] | null = null;
  try {
    const res = await fetch(HYDRO_FEED_URL, { headers: { 'User-Agent': USER_AGENT }, cache: 'no-store' });
    if (res.ok) outages = parseHydroFeed(await res.text());
  } catch (e: any) {
    console.error('[hydro-outages] feed error:', e?.message || e);
  }
  if (!outages) return NextResponse.json({ ok: false, error: 'Could not read the BC Hydro feed' }, { status: 502 });

  const { data: tracked } = await supabase.from('hydro_outages').select('*').eq('status', 'current');
  const open = new Map((tracked || []).map((t: any) => [t.outage_key, t]));
  const now = new Date();
  const posted: string[] = [];
  const updated: string[] = [];
  const restored: string[] = [];

  // Current outages: post or update
  for (const o of outages.filter(o => o.status === 'current')) {
    const existing = open.get(o.key);
    const title = `Power outage: ${friendlyArea(o.area)}`.slice(0, 200);
    const message = outageMessage(o);
    const expires = new Date(now.getTime() + 12 * HOURS).toISOString();

    if (existing) {
      if (existing.alert_id) {
        await supabase.from('alerts').update({ title, message, expires_at: expires, active: true }).eq('id', existing.alert_id);
      }
      await supabase.from('hydro_outages').update({ customers: o.customers, last_seen: now.toISOString() }).eq('outage_key', o.key);
      updated.push(o.area);
      continue;
    }
    if (o.customers < minCustomers) continue;

    const { data: alert, error } = await supabase.from('alerts').insert({
      title, message,
      severity: 'warning',
      category: 'hydro',
      issued_by: issuer,
      on_behalf_of_name: 'BC Hydro',
      on_behalf_of_organization: 'BC Hydro',
      affected_areas: ['Gabriola Island'],
      active: true,
      expires_at: expires,
      link_url: o.link.startsWith('http') ? o.link : HYDRO_MAP_URL,
      link_text: 'BC Hydro outage map',
    }).select('id').single();
    if (error) {
      console.error('[hydro-outages] alert insert failed:', error.message);
      continue;
    }
    await supabase.from('hydro_outages').upsert({
      outage_key: o.key, alert_id: alert.id, area: o.area, customers: o.customers,
      time_off: o.timeOff, status: 'current', first_seen: now.toISOString(), last_seen: now.toISOString(),
    }, { onConflict: 'outage_key' });
    posted.push(o.area);
  }

  // Outages we posted that are now restored, or no longer listed at all
  const stillCurrent = new Set(outages.filter(o => o.status === 'current').map(o => o.key));
  const restoredItems = new Map(outages.filter(o => o.status === 'restored').map(o => [o.key, o]));
  for (const t of tracked || []) {
    if (stillCurrent.has(t.outage_key)) continue;
    const r = restoredItems.get(t.outage_key);
    const area = friendlyArea(t.area);
    const when = r?.restoredAt ? ` at ${friendlyTime(r.restoredAt)}` : '';
    if (t.alert_id) {
      await supabase.from('alerts').update({
        title: `Power restored: ${area}`.slice(0, 200),
        message: `BC Hydro reports power has been restored${when} in the area of ${area}. If your power is still out, call BC Hydro at 1-888-769-3766.`,
        severity: 'info',
        expires_at: new Date(now.getTime() + 2 * HOURS).toISOString(),
      }).eq('id', t.alert_id);
    }
    await supabase.from('hydro_outages').update({ status: 'restored', restored_at: now.toISOString() }).eq('outage_key', t.outage_key);
    restored.push(t.area);
  }

  return NextResponse.json({
    ok: true,
    listed: outages.length,
    current: outages.filter(o => o.status === 'current').length,
    posted, updated, restored, minCustomers,
  });
}
