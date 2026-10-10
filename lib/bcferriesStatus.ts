// lib/bcferriesStatus.ts
// Reads BC Ferries "Current Conditions" for Nanaimo Harbour -> Gabriola (route NAH-GAB)
// Version: 1.0.0
// Date: 2026-10-10
//
// BC Ferries only publishes live departures for the Nanaimo Harbour side of
// route 19. The Gabriola side page (GAB-NAH) shows service notices only.
// The page is plain server-rendered HTML, so no browser is needed.
// If BC Ferries changes their page layout, parse() returns ok:false and the
// site shows "live status unavailable" instead of guessing.

export const BCF_STATUS_URL = 'https://www.bcferries.com/current-conditions/NAH-GAB';

export type SailingStatus = 'departed' | 'upcoming' | 'cancelled' | 'other';

export interface LiveSailing {
  scheduled: string;          // "7:35 am" as shown by BC Ferries
  scheduledMinutes: number;   // minutes after midnight
  actual: string | null;      // "7:49 am" once departed
  actualMinutes: number | null;
  delayMinutes: number | null;
  status: SailingStatus;
  statusText: string | null;  // e.g. "Upcoming", "Cancelled"
  reason: string | null;      // BC Ferries' red note, e.g. "Crew are conducting a mandatory safety drill"
  vessel: string | null;
}

export interface ServiceNotice {
  code: string;
  title: string;
  url: string;
}

export interface ParseResult {
  ok: boolean;
  error?: string;
  bcLastUpdated: string | null;
  sailings: LiveSailing[];
  notices: ServiceNotice[];
}

function decode(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&#039;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();
}

export function timeToMinutes(t: string): number | null {
  const m = t.trim().toLowerCase().match(/^(\d{1,2}):(\d{2})\s*([ap])\.?m\.?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  if (m[3] === 'p' && h !== 12) h += 12;
  if (m[3] === 'a' && h === 12) h = 0;
  return h * 60 + min;
}

export function parseBcFerriesStatus(html: string): ParseResult {
  const result: ParseResult = { ok: false, bcLastUpdated: null, sailings: [], notices: [] };

  if (!html || !html.includes('ccdetails-main-title')) {
    result.error = 'Page did not look like a BC Ferries current conditions page';
    return result;
  }

  // "Last updated: 9:36 am"
  const lu = html.match(/cc-last-update-text[\s\S]{0,120}?<span>\s*([\d:]+)\s*<span>(?:&nbsp;|\s)*([ap]m)/i);
  if (lu) result.bcLastUpdated = `${lu[1]} ${lu[2].toLowerCase()}`;

  // Service notices for this route
  const noticeBlock = html.match(/<ul class="cc-service-notice-list">([\s\S]*?)<\/ul>/);
  if (noticeBlock) {
    const re = /<a href="([^"]*serviceNoticeCode=(\d+)[^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(noticeBlock[1]))) {
      const href = decode(m[1]);
      result.notices.push({
        code: m[2],
        title: decode(m[3].replace(/<[^>]+>/g, '')),
        url: href.startsWith('http') ? href : `https://www.bcferries.com${href}`,
      });
    }
  }

  // Sailing rows
  const rows = html.split('<tr class="mobile-friendly-row"').slice(1).map(r => r.split('</tr>')[0]);
  for (const row of rows) {
    const sched = row.match(/<span[^>]*>\s*(\d{1,2}:\d{2}\s*[ap]m)\s*<\/span>/i);
    if (!sched) continue;
    const scheduled = sched[1].toLowerCase().replace(/\s+/, ' ');
    const scheduledMinutes = timeToMinutes(scheduled);
    if (scheduledMinutes === null) continue;

    const dep = row.match(/Departed(?:&nbsp;|\s)+(\d{1,2}:\d{2}\s*[ap]m)/i);
    const actual = dep ? dep[1].toLowerCase().replace(/\s+/, ' ') : null;
    const actualMinutes = actual ? timeToMinutes(actual) : null;

    const vesselM = row.match(/class="sailing-ferry-name[^"]*"[^>]*>(?:\s|<br\s*\/?>)*([^<]+)<\/a>/i);
    const reasonM = row.match(/<p class="text-red[^"]*">([\s\S]*?)<\/p>/i);
    const msgM = row.match(/cc-message-updates[^>]*>([\s\S]*?)<\/div>/i);

    const reason = reasonM ? decode(reasonM[1].replace(/<[^>]+>/g, '')) || null : null;
    const statusText = msgM ? decode(msgM[1].replace(/<[^>]+>/g, '')) || null : null;
    const rowText = decode(row.replace(/<[^>]+>/g, ' '));

    let status: SailingStatus;
    if (actual) status = 'departed';                  // it left, whatever the note says
    else if (/cancel/i.test(rowText)) status = 'cancelled';
    else if (statusText && /upcoming/i.test(statusText)) status = 'upcoming';
    else status = 'other';

    let delayMinutes: number | null = null;
    if (actualMinutes !== null) {
      let d = actualMinutes - scheduledMinutes;
      if (d < -720) d += 1440; // departed after midnight
      delayMinutes = d;
    }

    result.sailings.push({
      scheduled,
      scheduledMinutes,
      actual,
      actualMinutes,
      delayMinutes,
      status,
      statusText,
      reason,
      vessel: vesselM ? decode(vesselM[1]) : null,
    });
  }

  if (result.sailings.length === 0 && result.notices.length === 0) {
    result.error = 'No sailings or notices found - BC Ferries page layout may have changed';
    return result;
  }

  result.ok = true;
  return result;
}
