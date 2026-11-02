// lib/weeklyDigest.ts
// Builds the weekly email update: alerts in effect, Island News, events for the week ahead,
// new Buy, Sell, Rent & Free listings, new forum discussions and open volunteer spots.
// Version: 1.2.0 - "Active in the forum": discussions with a new post or new reply in the last 14
//                  days (news posts too, once people reply), most recent activity first, with
//                  reply counts. Left out when the forum's been quiet. Replies are read directly,
//                  because bbs_posts.last_activity_at isn't updated when someone replies.
// Previous: 1.1.0 - Buy, Sell, Rent & Free lists everything still up (newest first, up to 10),
//                  with the ones posted this week marked New (was: only this week's)
// Previous: 1.0.0
// Date: 2026-11-02
//
// Used by /api/cron/weekly-digest (Friday mornings) and /api/digest/test ("send me one now").
// Only members who ticked "Weekly email update" on their profile get it.

import { GABRIOLA_TZ } from '@/lib/gabriolaTime';

export const SITE = 'https://www.gabriolaconnects.ca';
const NEWS_AUTHOR_ID = '713881fc-2506-490c-8d72-4c6205bd1093';
const MAX_EVENT_LINES = 28;
const MAX_LISTINGS = 10;
const MAX_DISCUSSIONS = 6;

interface EventLine { day: string; time: string; title: string; venue: string; also: string[] }
export interface Digest {
  weekOf: string;                       // "Nov. 6"
  alerts: { title: string; level: string }[];
  news: { title: string; url: string }[];
  events: { day: string; lines: EventLine[] }[];
  moreEvents: number;
  listings: { title: string; tag: string; url: string; isNew: boolean }[];
  moreListings: number;
  discussions: { title: string; url: string; replies: number }[];
  volunteerCount: number;
}

const MONTHS = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];

// Gabriola date "YYYY-MM-DD" for a moment
function gabDate(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: GABRIOLA_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
function dayLabel(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  const wd = dt.toLocaleDateString('en-CA', { weekday: 'long', timeZone: 'UTC' });
  return `${wd}, ${MONTHS[m - 1]} ${d}`;
}
function shortDay(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('en-CA', { weekday: 'short', timeZone: 'UTC' });
}
function timeLabel(t: string | null, allDay: boolean): string {
  if (allDay || !t) return 'All day';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
function money(n: number | null): string {
  if (n === null || n === undefined) return '';
  const v = Number(n);
  return '$' + v.toLocaleString('en-CA', { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 });
}
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function buildDigest(supabase: any): Promise<Digest> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000).toISOString();
  const today = gabDate(now);
  const lastDay = gabDate(new Date(now.getTime() + 6 * 86400000));
  const [, tm, td] = today.split('-').map(Number);

  const [alertsRes, newsRes, eventsRes, listingsRes, postsRes, volRes] = await Promise.all([
    supabase.from('alerts').select('title, severity, expires_at').eq('active', true)
      .or(`expires_at.is.null,expires_at.gt.${now.toISOString()}`).order('created_at', { ascending: false }).limit(5),
    supabase.from('bbs_posts').select('id, title').eq('user_id', NEWS_AUTHOR_ID).eq('is_active', true).is('deleted_at', null)
      .gte('created_at', weekAgo).order('created_at', { ascending: false }).limit(8),
    supabase.from('events').select('title, start_date, start_time, is_all_day, venue_name, location, status')
      .eq('is_approved', true).is('deleted_at', null).gte('start_date', today).lte('start_date', lastDay)
      .order('start_date', { ascending: true }).order('start_time', { ascending: true }).limit(400),
    supabase.from('marketplace_listings').select('id, title, kind, price, category, created_at', { count: 'exact' }).eq('status', 'active')
      .gt('expires_at', now.toISOString()).order('created_at', { ascending: false }).limit(MAX_LISTINGS),
    supabase.from('bbs_posts').select('id, created_at').eq('is_active', true).is('deleted_at', null)
      .neq('user_id', NEWS_AUTHOR_ID).gte('created_at', twoWeeksAgo).limit(100),
    supabase.from('volunteer_opportunities').select('*', { count: 'exact', head: true })
      .eq('status', 'active').eq('is_approved', true).is('deleted_at', null).or(`start_date.is.null,start_date.gte.${today}`),
  ]);

  // Active discussions: new posts (not Island News; those have their own section) and any post
  // with a new reply, in the last 14 days. Anonymous posts count too (their user_id is empty).
  const latest = new Map<string, number>();
  const bump = (id: string, at: string) => {
    const t = new Date(at).getTime();
    if (!latest.has(id) || latest.get(id)! < t) latest.set(id, t);
  };
  (postsRes.data || []).forEach((p: any) => bump(p.id, p.created_at));
  const { data: anonPosts } = await supabase.from('bbs_posts').select('id, created_at').eq('is_active', true)
    .is('deleted_at', null).is('user_id', null).gte('created_at', twoWeeksAgo).limit(100);
  (anonPosts || []).forEach((p: any) => bump(p.id, p.created_at));
  const { data: recentReplies } = await supabase.from('bbs_replies').select('post_id, created_at')
    .gte('created_at', twoWeeksAgo).is('deleted_at', null).limit(1000);
  (recentReplies || []).forEach((r: any) => r.post_id && bump(r.post_id, r.created_at));
  let discussions: { title: string; url: string; replies: number }[] = [];
  if (latest.size > 0) {
    const ids = Array.from(latest.keys());
    const { data: active } = await supabase.from('bbs_posts').select('id, title, reply_count')
      .in('id', ids).eq('is_active', true).is('deleted_at', null);
    discussions = (active || [])
      .sort((a: any, b: any) => (latest.get(b.id) || 0) - (latest.get(a.id) || 0))
      .slice(0, MAX_DISCUSSIONS)
      .map((p: any) => ({ title: p.title, url: `${SITE}/community/thread/${p.id}`, replies: p.reply_count || 0 }));
  }

  const levelName: Record<string, string> = { emergency: 'Emergency', warning: 'Warning', advisory: 'Advisory', info: 'Info' };

  // Events: each title once per week (first time it happens), with the other days listed
  const seen = new Map<string, EventLine>();
  const order: EventLine[] = [];
  for (const e of (eventsRes.data || [])) {
    if (e.status && /cancel/i.test(e.status)) continue;
    const key = (e.title || '').trim().toLowerCase();
    if (!key) continue;
    const existing = seen.get(key);
    if (existing) {
      const sd = shortDay(e.start_date);
      if (!existing.also.includes(sd) && sd !== shortDay(existing.day)) existing.also.push(sd);
      continue;
    }
    const line: EventLine = {
      day: e.start_date,
      time: timeLabel(e.start_time, !!e.is_all_day),
      title: e.title.trim(),
      // Leave the place off when the title already says it ("... at the Rollo Centre")
      venue: (() => {
        const v = (e.venue_name || e.location || '').trim();
        return v && e.title.toLowerCase().includes(v.toLowerCase()) ? '' : v;
      })(),
      also: [],
    };
    seen.set(key, line);
    order.push(line);
  }
  const shown = order.slice(0, MAX_EVENT_LINES);
  const byDay: { day: string; lines: EventLine[] }[] = [];
  for (const l of shown) {
    const label = dayLabel(l.day);
    const last = byDay[byDay.length - 1];
    if (last && last.day === label) last.lines.push(l);
    else byDay.push({ day: label, lines: [l] });
  }

  const tagFor = (l: any): string => {
    switch (l.kind) {
      case 'free': return 'Free';
      case 'lost': return 'Lost';
      case 'found': return 'Found';
      case 'wanted': return l.category === 'housing' ? 'Looking to rent' : 'Wanted';
      case 'rent': return l.price ? `For rent, ${money(l.price)}/mo` : 'For rent';
      default: return l.price ? money(l.price) : 'For sale';
    }
  };

  return {
    weekOf: `${MONTHS[tm - 1]} ${td}`,
    alerts: (alertsRes.data || []).map((a: any) => ({ title: a.title, level: levelName[a.severity] || 'Info' })),
    news: (newsRes.data || []).map((p: any) => ({ title: p.title, url: `${SITE}/community/thread/${p.id}` })),
    events: byDay,
    moreEvents: Math.max(0, order.length - shown.length),
    listings: (listingsRes.data || []).map((l: any) => ({
      title: l.title, tag: tagFor(l), url: `${SITE}/marketplace/${l.id}`, isNew: new Date(l.created_at).getTime() >= Date.parse(weekAgo),
    })),
    moreListings: Math.max(0, (listingsRes.count || 0) - (listingsRes.data || []).length),
    discussions,
    volunteerCount: volRes.count || 0,
  };
}

export function digestSubject(d: Digest): string {
  return `This week on Gabriola: ${d.weekOf}`;
}

// Plain text version
export function digestText(d: Digest, stopUrl: string): string {
  const out: string[] = [`This week on Gabriola Connects, ${d.weekOf}`, ''];
  if (d.alerts.length) {
    out.push('ALERTS IN EFFECT');
    d.alerts.forEach(a => out.push(`- ${a.level}: ${a.title}`));
    out.push(`${SITE}/alerts`, '');
  }
  if (d.news.length) {
    out.push('ISLAND NEWS');
    d.news.forEach(n => out.push(`- ${n.title}`, `  ${n.url}`));
    out.push('');
  }
  if (d.events.length) {
    out.push('EVENTS THIS WEEK');
    d.events.forEach(g => {
      out.push(g.day);
      g.lines.forEach(l => out.push(`- ${l.time}  ${l.title}${l.venue ? `, ${l.venue}` : ''}${l.also.length ? ` (also ${l.also.join(', ')})` : ''}`));
    });
    out.push(d.moreEvents > 0 ? `Plus ${d.moreEvents} more on the calendar: ${SITE}/calendar` : `Full calendar: ${SITE}/calendar`, '');
  }
  if (d.listings.length) {
    out.push('BUY, SELL, RENT & FREE');
    d.listings.forEach(l => out.push(`- ${l.isNew ? 'NEW: ' : ''}${l.title} (${l.tag})`, `  ${l.url}`));
    out.push(d.moreListings > 0 ? `Plus ${d.moreListings} more: ${SITE}/marketplace` : `All listings: ${SITE}/marketplace`, '');
  }
  if (d.discussions.length) {
    out.push('ACTIVE IN THE FORUM');
    d.discussions.forEach(p => out.push(`- ${p.title}${p.replies ? ` (${p.replies} ${p.replies === 1 ? 'reply' : 'replies'})` : ''}`, `  ${p.url}`));
    out.push('');
  }
  if (d.volunteerCount > 0) {
    out.push(`${d.volunteerCount} volunteer ${d.volunteerCount === 1 ? 'opportunity' : 'opportunities'} open: ${SITE}/volunteer`, '');
  }
  out.push('--', 'You get this because you ticked "Weekly email update" on your Gabriola Connects profile.',
    `Change it: ${SITE}/profile/edit`, `Stop the weekly email: ${stopUrl}`);
  return out.join('\n');
}

// HTML version
export function digestHtml(d: Digest, stopUrl: string): string {
  const h2 = (t: string) => `<h2 style="margin:24px 0 8px 0;font-size:13px;font-weight:bold;letter-spacing:0.06em;text-transform:uppercase;color:#2D5F3F">${t}</h2>`;
  const link = (url: string, text: string) => `<a href="${escapeHtml(url)}" style="color:#1F2A24;font-weight:bold;text-decoration:underline">${escapeHtml(text)}</a>`;
  const li = (inner: string) => `<li style="margin:0 0 6px 0">${inner}</li>`;
  const ul = (items: string[]) => `<ul style="margin:0;padding-left:20px">${items.join('')}</ul>`;
  const parts: string[] = [];

  if (d.alerts.length) {
    parts.push(h2('Alerts in effect'), ul(d.alerts.map(a => li(`<strong>${escapeHtml(a.level)}:</strong> ${escapeHtml(a.title)}`))),
      `<p style="margin:6px 0 0 0"><a href="${SITE}/alerts" style="color:#2D5F3F">All alerts</a></p>`);
  }
  if (d.news.length) {
    parts.push(h2('Island News'), ul(d.news.map(n => li(link(n.url, n.title)))));
  }
  if (d.events.length) {
    parts.push(h2('Events this week'));
    d.events.forEach(g => {
      parts.push(`<p style="margin:12px 0 4px 0;font-weight:bold">${escapeHtml(g.day)}</p>`,
        ul(g.lines.map(l => li(`<span style="color:#5B6660">${escapeHtml(l.time)}</span> ${escapeHtml(l.title)}${l.venue ? `<span style="color:#5B6660">, ${escapeHtml(l.venue)}</span>` : ''}${l.also.length ? ` <span style="color:#5B6660">(also ${escapeHtml(l.also.join(', '))})</span>` : ''}`))));
    });
    parts.push(`<p style="margin:8px 0 0 0"><a href="${SITE}/calendar" style="color:#2D5F3F">${d.moreEvents > 0 ? `Plus ${d.moreEvents} more on the calendar` : 'Full calendar'}</a></p>`);
  }
  if (d.listings.length) {
    parts.push(h2('Buy, Sell, Rent &amp; Free'), ul(d.listings.map(l => li(`${l.isNew ? '<span style="display:inline-block;background:#2D5F3F;color:#FFFFFF;font-size:11px;font-weight:bold;padding:1px 6px;border-radius:9px;margin-right:4px">NEW</span>' : ''}${link(l.url, l.title)} <span style="color:#5B6660">(${escapeHtml(l.tag)})</span>`))),
      `<p style="margin:8px 0 0 0"><a href="${SITE}/marketplace" style="color:#2D5F3F">${d.moreListings > 0 ? `Plus ${d.moreListings} more` : 'All listings'}</a></p>`);
  }
  if (d.discussions.length) {
    parts.push(h2('Active in the forum'), ul(d.discussions.map(p => li(`${link(p.url, p.title)}${p.replies ? ` <span style="color:#5B6660">(${p.replies} ${p.replies === 1 ? 'reply' : 'replies'})</span>` : ''}`))));
  }
  if (d.volunteerCount > 0) {
    parts.push(`<p style="margin:20px 0 0 0"><a href="${SITE}/volunteer" style="color:#2D5F3F;font-weight:bold">${d.volunteerCount} volunteer ${d.volunteerCount === 1 ? 'opportunity' : 'opportunities'} open</a></p>`);
  }

  return `<!doctype html><html><body style="margin:0;padding:24px;background:#F6F2EA;font-family:Arial,Helvetica,sans-serif;color:#1F2A24;font-size:15px;line-height:1.5">
<div style="max-width:600px;margin:0 auto;background:#FFFFFF;border:1px solid #E3DCCF;border-radius:12px;padding:28px">
<p style="margin:0;font-size:13px;color:#5B6660">Gabriola Connects weekly</p>
<h1 style="margin:2px 0 4px 0;font-size:24px;line-height:1.25">This week on Gabriola, ${escapeHtml(d.weekOf)}</h1>
${parts.join('\n')}
<p style="margin:28px 0 0 0"><a href="${SITE}" style="display:inline-block;background:#2D5F3F;color:#FFFFFF;font-weight:bold;text-decoration:none;padding:12px 20px;border-radius:8px">Open Gabriola Connects</a></p>
</div>
<p style="max-width:600px;margin:16px auto 0 auto;font-size:13px;color:#5B6660;line-height:1.5">You get this because you ticked "Weekly email update" on your Gabriola Connects profile.
<a href="${SITE}/profile/edit" style="color:#5B6660">Change it</a> or <a href="${escapeHtml(stopUrl)}" style="color:#5B6660">stop the weekly email</a>.</p>
</body></html>`;
}
