// app/api/cron/ferry-status/route.ts
// Reads BC Ferries live status every 5 minutes (called by Supabase pg_cron),
// stores it, and posts automatic ferry alerts.
// Version: 1.3.0 - A notice about tomorrow lists its times too ("Wednesday, November 18: at risk ..."),
//                  not just the headline. When BC Ferries changes a notice to an all-clear ("Sailings
//                  no Longer at Risk", repaired, resumed) the notice alert comes down, and so do the
//                  emailed ferry alerts (e.g. from the Sounder) about cancellations from the last day.
//                  When a notice disappears from BC Ferries, its alert comes down too.
// Previous: 1.2.0 - The service notice alert comes down at the end of the Gabriola day (or 12 hours, if sooner)
// Previous: 1.1.0 - Reads each route service notice too, for its table of cancelled and at-risk
//                  sailings (both directions), and keeps them with the notice (ferry_live_meta.notices).
//                  BC Ferries' live page can still show those sailings as "Upcoming" (Nov 17, 2026).
//                  The notice alert now lists the cancelled and at-risk times, and is kept up to date.
// Previous: 1.0.2 - Gabriola time is fixed UTC-7 (lib/gabriolaTime.ts): B.C. no longer falls back, but many devices think it does
// Previous: 1.0.1 - Setting renamed to AUTO_ALERT_USER_ID (shared with the notices email reader)
// Previous: 1.0.0
// Date: 2026-11-17
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
// and takes down its notice alert (plus emailed ferry alerts about cancellations from the last day)
// when BC Ferries changes the notice to an all-clear or removes it.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { BCF_STATUS_URL, parseBcFerriesStatus, LiveSailing } from '@/lib/bcferriesStatus';
import { GABRIOLA_TZ, ferryAlertExpiry } from '@/lib/gabriolaTime';
import { parseServiceNotice, StoredNotice, NoticeSailings, minutesList } from '@/lib/ferryNotices';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const ROUTE = 'NAH-GAB';
const DELAY_ALERT_MINUTES = 30;
const NOTICE_ALERT_WORDS = /cancel|disrupt|out of service|suspend|not operating|reduced service|delay/i;
// A notice title that says the trouble is over ("Sailings no Longer at Risk", "Service Resumed")
const ALL_CLEAR_WORDS = /no longer|repaired|resum|restored|back in service|returned to service|as scheduled/i;
// Emailed ferry alerts that an all-clear makes out of date
const DISRUPTION_WORDS = /cancel|at risk|single.ship|one (ship|vessel)|reduced service|mechanical/i;
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

// The alert text for a service notice, listing the times when the notice has them
function noticeMessage(n: StoredNotice, today: string): string {
  const s = n.sailings;
  const base = `BC Ferries has posted a service notice for the Nanaimo Harbour - Gabriola route: ${n.title}.`;
  if (!s) return base;
  // About today, or else the next day it names (a notice posted in the evening about tomorrow)
  const day = s.dates.includes(today) ? today : s.dates.filter(d => d > today).sort()[0];
  if (!day) return base;
  const when = day === today ? 'today' : dayLabel(day);
  const parts: string[] = [];
  const both = (g: number[], h: number[]) => [
    g.length ? `from Gabriola ${minutesList(g)}` : '',
    h.length ? `from Nanaimo ${minutesList(h)}` : '',
  ].filter(Boolean).join('; ');
  const cancelled = both(s.cancelled.gab, s.cancelled.nah);
  const atRisk = both(s.atRisk.gab, s.atRisk.nah);
  if (cancelled) parts.push(day === today ? `Cancelled today: ${cancelled}.` : `Cancelled ${when}: ${cancelled}.`);
  if (atRisk) parts.push(day === today ? `At risk of cancellation: ${atRisk}.` : `At risk of cancellation ${when}: ${atRisk}.`);
  if (!parts.length) return base;
  return `${base} ${parts.join(' ')} Check the notice for the sailings that are running.`;
}

// "2026-11-18" -> "Wednesday, November 18"
function dayLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('en-CA', {
    timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric',
  });
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

  // Each notice's own page: the cancelled and at-risk sailings, if it has a table of them.
  // If a notice page can't be read this time, keep what was read last time.
  const { data: prevMeta } = await supabase.from('ferry_live_meta').select('notices').eq('route', ROUTE).maybeSingle();
  const prevByCode = new Map<string, StoredNotice>(((prevMeta?.notices as StoredNotice[]) || []).map(n => [n.code, n]));
  const notices: StoredNotice[] = await Promise.all(parsed.notices.map(async (n): Promise<StoredNotice> => {
    let sailings: NoticeSailings | null = prevByCode.get(n.code)?.sailings || null;
    try {
      const res = await fetch(n.url, {
        headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html' },
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) sailings = parseServiceNotice(await res.text()) ?? sailings;
    } catch (e: any) {
      console.error('[ferry-status] notice fetch failed:', n.code, e?.message || e);
    }
    return { ...n, sailings };
  }));

  await supabase.from('ferry_live_meta').upsert({
    route: ROUTE,
    last_checked_at: checkedAt,
    last_success_at: checkedAt,
    bc_last_updated: parsed.bcLastUpdated,
    notices,
    last_error: null,
  });

  // 3. Automatic alerts
  const alertsPosted: string[] = [];
  const alertsClosed: string[] = [];
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

    // Route service notices about disruptions, with the cancelled and at-risk times when the
    // notice lists them (kept up to date as BC Ferries updates the notice)
    for (const n of notices.filter(n => NOTICE_ALERT_WORDS.test(n.title) && !ALL_CLEAR_WORDS.test(n.title))) {
      const title = `BC Ferries notice: ${n.title}`.slice(0, 200);
      const message = noticeMessage(n, now.date);
      const key = `notice:${n.code}`;
      const id = await postOnce(key, {
        title,
        message,
        severity: 'advisory',
        link_url: n.url,
        link_text: 'BC Ferries service notice',
        expires_at: ferryAlertExpiry(12),
      });
      // Already posted: bring the times up to date, unless someone has rewritten the alert by hand
      if (id && !alertsPosted.includes(key)) {
        const { data: cur } = await supabase.from('alerts').select('message').eq('id', id).maybeSingle();
        if (cur && cur.message !== message && String(cur.message || '').startsWith('BC Ferries has posted a service notice')) {
          await supabase.from('alerts').update({ message, link_url: n.url, link_text: 'BC Ferries service notice' }).eq('id', id);
        }
      }
    }

    // All-clear: take down what's out of date
    const takeDown = async (ids: string[]) => {
      if (!ids.length) return;
      await supabase.from('alerts').update({ active: false, changed_by: issuer }).in('id', ids).eq('active', true);
      alertsClosed.push(...ids);
    };
    const noticeAlertId = async (code: string) => {
      const { data } = await supabase.from('ferry_auto_alerts').select('alert_id').eq('alert_key', `notice:${code}`).maybeSingle();
      return (data?.alert_id as string | null) || null;
    };
    // Forget the notice's alert, so if the same notice later turns back into cancellations it posts again
    const forget = (code: string) => supabase.from('ferry_auto_alerts').delete().eq('alert_key', `notice:${code}`);

    for (const n of notices.filter(n => ALL_CLEAR_WORDS.test(n.title))) {
      const prev = prevByCode.get(n.code);
      const id = await noticeAlertId(n.code);
      if (id) {
        await takeDown([id]);
        await forget(n.code);
      }
      // Only when it has just turned into an all-clear, so a new emailed cancellation later on still shows
      if (prev && ALL_CLEAR_WORDS.test(prev.title)) continue;
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { data: emailed } = await supabase.from('alerts')
        .select('id, title, message')
        .eq('active', true).eq('category', 'ferry').eq('issued_by', issuer).gte('created_at', since);
      const candidates = (emailed || []).filter(a => DISRUPTION_WORDS.test(`${a.title} ${a.message}`));
      if (!candidates.length) continue;
      const { data: auto } = await supabase.from('ferry_auto_alerts').select('alert_id').in('alert_id', candidates.map(a => a.id));
      const autoIds = new Set((auto || []).map(a => a.alert_id));
      await takeDown(candidates.filter(a => !autoIds.has(a.id)).map(a => a.id));   // emailed ones only
    }

    // A notice BC Ferries has taken down: its alert comes down too (not forgotten, so if the
    // notice flickers back it doesn't post a second copy)
    const currentCodes = new Set(notices.map(n => n.code));
    for (const code of Array.from(prevByCode.keys()).filter(c => !currentCodes.has(c))) {
      const id = await noticeAlertId(code);
      if (id) await takeDown([id]);
    }
  }

  return NextResponse.json({
    ok: true,
    sailings: parsed.sailings.length,
    notices: parsed.notices.length,
    alertsPosted,
    alertsClosed,
    alertsEnabled: Boolean(issuer),
  });
}
