// lib/ferryNotices.ts
// Reads the sailing times out of a BC Ferries service notice ("Cancelled Sailings and Sailings
// At-Risk of Cancellation"), and turns stored notices into today's cancellations for each side.
// Version: 1.0.0
// Date: 2026-11-17
//
// Why: BC Ferries' live Current Conditions page can keep showing a cancelled sailing as
// "Upcoming" (it did on Nov 17, 2026, when one vessel was out). The cancellations are only in
// the service notice, as a table with a "Departing Descanso Bay" and a "Departing Nanaimo Harbour"
// column, and a * on sailings at risk of cancellation. This reads that table.
//
// Only tables whose heading says "cancel" are read as cancellations (the "Reduced Service" table
// of sailings that ARE running is ignored). The notice only counts for the dates it names
// ("today, Tuesday, November 17, 2026"), or the day it was posted if it names none.
// If BC Ferries changes the layout, nothing is read and the site shows the schedule as before.

export type Side = 'gab' | 'nah';
export type NoticeStatus = 'cancelled' | 'at_risk';

export interface NoticeSailings {
  dates: string[];                                   // "2026-11-17" - days the notice is about
  cancelled: { gab: number[]; nah: number[] };       // minutes after midnight
  atRisk: { gab: number[]; nah: number[] };
}

export interface StoredNotice {
  code: string;
  title: string;
  url: string;
  sailings?: NoticeSailings | null;
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august',
  'september', 'october', 'november', 'december'];
const DATE_RE = /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/gi;

function decode(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;?/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&rsquo;|&lsquo;|&#39;|&#039;|&apos;/g, "'")
    .replace(/&ndash;|&mdash;/g, '-')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();
}

function datesIn(text: string): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  DATE_RE.lastIndex = 0;
  while ((m = DATE_RE.exec(text))) {
    const month = MONTHS.indexOf(m[1].toLowerCase()) + 1;
    const d = `${m[3]}-${String(month).padStart(2, '0')}-${String(Number(m[2])).padStart(2, '0')}`;
    if (!out.includes(d)) out.push(d);
  }
  return out;
}

function timeIn(text: string): number | null {
  const m = text.match(/(\d{1,2}):(\d{2})\s*([ap])\.?\s*m/i);
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (m[3].toLowerCase() === 'p') h += 12;
  return h * 60 + Number(m[2]);
}

// The last paragraph of text before a table: its heading ("Reduced Service:", "Cancelled Sailings...")
function headingBefore(segment: string): string {
  const parts = segment.split(/<\/p>|<\/h\d>|<br\s*\/?>/i).map(decode).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : '';
}

/** Reads one service notice page. Null if it doesn't look like a BC Ferries service notice. */
export function parseServiceNotice(html: string): NoticeSailings | null {
  const start = html.indexOf('container service-notice');
  if (start < 0) return null;
  let body = html.slice(start);
  const end = body.indexOf('<div class="container">');
  if (end > 0) body = body.slice(0, end);

  // Dates the notice is about: any named in the text, else the day it was posted
  const postedMatch = body.match(/Posted:([\s\S]*?)<\/h3>/i);
  const posted = postedMatch ? datesIn(decode(postedMatch[1])) : [];
  const rest = postedMatch ? body.replace(postedMatch[0], '') : body;
  const named = datesIn(decode(rest));
  const dates = named.length ? named : posted;

  const result: NoticeSailings = { dates, cancelled: { gab: [], nah: [] }, atRisk: { gab: [], nah: [] } };

  const tableRe = /<table[\s\S]*?<\/table>/gi;
  let prevEnd = 0;
  let t: RegExpExecArray | null;
  while ((t = tableRe.exec(body))) {
    const heading = headingBefore(body.slice(prevEnd, t.index));
    prevEnd = t.index + t[0].length;
    if (!/cancel/i.test(heading)) continue;

    const rows = t[0].match(/<tr[\s\S]*?<\/tr>/gi) || [];
    let sides: (Side | null)[] | null = null;
    for (const row of rows) {
      const cells = (row.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi) || []).map(decode);
      if (!sides) {
        // Header row: which column is which terminal
        const found = cells.map(c => (/descanso|gabriola/i.test(c) ? 'gab' : /nanaimo/i.test(c) ? 'nah' : null) as Side | null);
        if (found.some(Boolean)) sides = found;
        continue;
      }
      cells.forEach((c, i) => {
        const side = sides![i];
        const min = timeIn(c);
        if (!side || min === null) return;
        const list = /\*/.test(c) ? result.atRisk[side] : result.cancelled[side];
        if (!list.includes(min)) list.push(min);
      });
    }
  }
  return result;
}

/** Today's cancelled / at-risk sailings for each side, from the stored notices */
export function noticeStatusToday(notices: StoredNotice[] | null | undefined, today: string):
  { gab: Map<number, NoticeStatus>; nah: Map<number, NoticeStatus> } {
  const out = { gab: new Map<number, NoticeStatus>(), nah: new Map<number, NoticeStatus>() };
  for (const n of notices || []) {
    const s = n.sailings;
    if (!s || !s.dates.includes(today)) continue;
    (['gab', 'nah'] as Side[]).forEach(side => {
      s.atRisk[side].forEach(m => { if (!out[side].has(m)) out[side].set(m, 'at_risk'); });
      s.cancelled[side].forEach(m => out[side].set(m, 'cancelled'));   // cancelled wins
    });
  }
  return out;
}

/** "7:05 AM, 8:10 AM" */
export function minutesList(mins: number[]): string {
  return mins.slice().sort((a, b) => a - b).map(m => {
    const h = Math.floor(m / 60);
    return `${h % 12 || 12}:${String(m % 60).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  }).join(', ');
}
