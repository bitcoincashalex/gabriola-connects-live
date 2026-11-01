// app/api/cron/ferry-status/route.ts
// Reads BC Ferries live status every 5 minutes (called by Supabase pg_cron),
// stores it, and posts automatic ferry alerts.
// Version: 1.0.2 - Gabriola time is fixed UTC-7 (lib/gabriolaTime.ts): B.C. no longer falls back, but many devices think it does
// Previous: 1.0.1 - Setting renamed to AUTO_ALERT_USER_ID (shared with the notices email reader)
// Previous: 1.0.0
// Date: 2026-11-01
//
// Needs these Vercel environment variables:
//   CRON_SECRET               - long random string, same one used in the Supabase cron job
//   AUTO_ALERT_USER_ID       - users.id that automatic alerts are "issued by" (a super admin)
//   SUPABASE_SERVICE_ROLE_KEY - already set
//
// Alerts it posts (category 'ferry', on behalf of BC Ferries):
//   - a sailing from Nanaimo Harbour is cancelled            -> severity 'warning'
//   - sailings leaving Nanaimo 30+ minutes late (one rolling alert per day, kept up to date)
//                                                            -> severity 'advisory'
//   - a route service notice about cancellations/disruptions -> severity 'advisory'

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { BCF_STATUS_URL, parseBcFerriesStatus, LiveSailing } from '@/lib/bcferriesStatus';
import { GABRIOLA_TZ } from '@/lib/gabriolaTime';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const ROUTE = 'NAH-GAB';
const DELAY_ALERT_MINUTES = 30;
const NOTICE_ALERT_WORDS = /cancel|disrupt|out of service|suspend|not operating|reduced service|delay/i;
const USER_AGENT = 'GabriolaConnects/1.0 (+https://www.gabriolaconnects.ca; community ferry status, checks every 5 minutes)';

function pacificNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: GABRIOLA_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (t: string) => parts.find(p => p.type === t)?.value || '00';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

// Turn a Gabriola date + minutes after midnight into a real timestamp (handles daylight saving)
function pacificToIso(date: string, minutes: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const asUtc = Date.UTC(y, m - 1, d, 0, minutes);
  // What does the Pacific clock read at that UTC instant? The difference is the offset.
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: GABRIOLA_TZ, hourCycle: 'h23',
    year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric',
  }).formatToParts(new Date(asUtc));
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value);
  const pacificClockAsUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
  const offsetMs = asUtc - pacificClockAsUtc; // 7h in summer, 8h in winter
  return new Date(asUtc + offsetMs).toISOString();
}

function toSqlTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = pacificNow();

  // No sailings between midnight and 5:15 am, so don't bother BC Ferries then
  if (now.minutes < 4 * 60 + 45) {
    return NextResponse.json({ skipped: 'overnight' });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const checkedAt = new Date().toISOString();

  // 1. Read BC Ferries
  let html = '';
  try {
    const res = await fetch(BCF_STATUS_URL, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html' },
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`BC Ferries returned HTTP ${res.status}`);
    html = await res.text();
  } catch (e: any) {
    await supabase.from('ferry_live_meta').upsert({ route: ROUTE, last_checked_at: checkedAt, last_error: `Fetch failed: ${e?.message || e}` });
    return NextResponse.json({ ok: false, error: 'fetch failed' }, { status: 502 });
  }

  const parsed = parseBcFerriesStatus(html);
  if (!parsed.ok) {
    await supabase.from('ferry_live_meta').upsert({ route: ROUTE, last_checked_at: checkedAt, last_error: parsed.error || 'Parse failed' });
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 502 });
  }

  // 2. Store today's sailings
  const rows = parsed.sailings.map((s: LiveSailing) => ({
    route: ROUTE,
    sailing_date: now.date,
    scheduled_time: toSqlTime(s.scheduledMinutes),
    actual_departure: s.actualMinutes !== null ? toSqlTime(s.actualMinutes) : null,
    delay_minutes: s.delayMinutes,
    status: s.status,
    status_text: s.statusText,
    reason: s.reason,
    vessel: s.vessel,
    updated_at: checkedAt,
  }));
  if (rows.length > 0) {
    const { error } = await supabase.from('ferry_live_sailings').upsert(rows);
    if (error) console.error('[ferry-status] save sailings failed:', error.message);
  }

  await supabase.from('ferry_live_meta').upsert({
    route: ROUTE,
    last_checked_at: checkedAt,
    last_success_at: checkedAt,
    bc_last_updated: parsed.bcLastUpdated,
    notices: parsed.notices,
    last_error: null,
  });

  // 3. Automatic alerts
  const alertsPosted: string[] = [];
  const issuer = process.env.AUTO_ALERT_USER_ID;
  if (issuer) {
    const postOnce = async (key: string, alert: Record<string, any>) => {
      const { data: seen } = await supabase.from('ferry_auto_alerts').select('alert_id').eq('alert_key', key).maybeSingle();
      if (seen) return seen.alert_id as string | null;
      const { data, error } = await supabase.from('alerts').insert({
        link_url: BCF_STATUS_URL,
        link_text: 'BC Ferries current conditions',
        ...alert,
        category: 'ferry',
        issued_by: issuer,
        on_behalf_of_name: 'BC Ferries',
        on_behalf_of_organization: 'BC Ferries',
        affected_areas: ['Gabriola Island'],
        active: true,
      }).select('id').single();
      if (error) {
        console.error('[ferry-status] alert insert failed:', error.message);
        return null;
      }
      await supabase.from('ferry_auto_alerts').insert({ alert_key: key, alert_id: data.id });
      alertsPosted.push(key);
      return data.id as string;
    };

    // Cancellations: one alert per cancelled sailing
    for (const s of parsed.sailings.filter(s => s.status === 'cancelled')) {
      await postOnce(`cancel:${now.date}:${s.scheduled}`, {
        title: `Ferry cancelled: ${s.scheduled} from Nanaimo Harbour`,
        message: `BC Ferries shows the ${s.scheduled} sailing from Nanaimo Harbour to Gabriola as cancelled.` +
          (s.reason ? ` Reason given: ${s.reason}.` : '') +
          ' Check BC Ferries before you travel.',
        severity: 'warning',
        expires_at: pacificToIso(now.date, s.scheduledMinutes + 60),
      });
    }

    // Delays: one rolling alert per day, based on sailings that left late in the last 90 minutes
    const recentLate = parsed.sailings.filter(s =>
      s.status === 'departed' && s.actualMinutes !== null && (s.delayMinutes || 0) >= DELAY_ALERT_MINUTES &&
      now.minutes - s.actualMinutes <= 90 && now.minutes - s.actualMinutes >= -5
    );
    if (recentLate.length > 0) {
      const latest = recentLate[recentLate.length - 1];
      const title = `Ferries running late from Nanaimo Harbour (about ${latest.delayMinutes} min)`;
      const message = `The ${latest.scheduled} sailing from Nanaimo Harbour left at ${latest.actual}, ${latest.delayMinutes} minutes late.` +
        (latest.reason ? ` BC Ferries says: ${latest.reason}.` : '') +
        ' Sailings from Gabriola are probably running late too, but BC Ferries does not publish live times for that side.';
      const expires = pacificToIso(now.date, (latest.actualMinutes || now.minutes) + 60);
      const key = `delay:${now.date}`;
      const id = await postOnce(key, { title, message, severity: 'advisory', expires_at: expires });
      // Already posted earlier today: keep it current
      if (id && !alertsPosted.includes(key)) {
        await supabase.from('alerts').update({ title, message, expires_at: expires, active: true }).eq('id', id);
      }
    }

    // Route service notices about disruptions
    for (const n of parsed.notices.filter(n => NOTICE_ALERT_WORDS.test(n.title))) {
      await postOnce(`notice:${n.code}`, {
        title: `BC Ferries notice: ${n.title}`.slice(0, 200),
        message: `BC Ferries has posted a service notice for the Nanaimo Harbour - Gabriola route: ${n.title}`,
        severity: 'advisory',
        link_url: n.url,
        expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    sailings: parsed.sailings.length,
    notices: parsed.notices.length,
    alertsPosted,
    alertsEnabled: Boolean(issuer),
  });
}
