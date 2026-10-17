// lib/hydroOutages.ts
// Reads BC Hydro's public outage feed for Gabriola Island
// Version: 1.0.0
// Date: 2026-10-17
//
// Feed: https://www.bchydro.com/rss/outages/gabriola_island.xml (from BC Hydro's RSS page,
// https://www.bchydro.com/safety-outages/power-outages/outages_rss.html)
// Each <item> is "Current Outage - <area>" or "Restored Outage - <area>", with a small table:
//   <tr><td><b>Label:</b></td><td>value</td></tr>
// Labels seen: Restored At, Municipality, Time Off, # Customers Affected, Outage Type/Cause,
//              Approx. Area Affected, Analyzed Status, Last Updated

export const HYDRO_FEED_URL = 'https://www.bchydro.com/rss/outages/gabriola_island.xml';
export const HYDRO_MAP_URL = 'https://www.bchydro.com/power-outages/app/outage-map.html';

export interface HydroOutage {
  key: string;              // stable id: area + time off
  status: 'current' | 'restored';
  area: string;
  customers: number;
  cause: string;
  timeOff: string;          // e.g. "Oct 17 15:12 PDT"
  restoredAt: string | null;
  lastUpdated: string;
  link: string;
}

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .trim();
}

function tag(xml: string, name: string): string {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? decode(m[1]) : '';
}

function fields(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<b>\s*([^<]+?)\s*:?\s*<\/b>\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    out[m[1].replace(/:$/, '').trim().toLowerCase()] = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  return out;
}

// Returns null if the response doesn't look like the outage feed (so a bad fetch never
// gets mistaken for "all outages are over")
export function parseHydroFeed(xml: string): HydroOutage[] | null {
  if (!/<channel>/i.test(xml) || !/BC Hydro Outage/i.test(xml)) return null;
  const items = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
  const out: HydroOutage[] = [];
  for (const item of items) {
    const title = tag(item, 'title');
    const f = fields(tag(item, 'description'));
    const area = f['approx. area affected'] || title.replace(/^(Current|Restored) Outage\s*-\s*/i, '');
    const timeOff = f['time off'] || '';
    if (!area) continue;
    out.push({
      key: `${area.toUpperCase()}|${timeOff}`,
      status: /^Restored/i.test(title) || f['restored at'] ? 'restored' : 'current',
      area,
      customers: parseInt((f['# customers affected'] || '0').replace(/[^\d]/g, ''), 10) || 0,
      cause: f['outage type/cause'] || '',
      timeOff,
      restoredAt: f['restored at'] || null,
      lastUpdated: f['last updated'] || '',
      link: tag(item, 'link') || HYDRO_MAP_URL,
    });
  }
  return out;
}

// "Oct 17 15:12 PDT" -> "3:12 PM, Oct 17"
export function friendlyTime(s: string | null | undefined): string {
  if (!s) return '';
  const m = s.match(/([A-Z][a-z]{2})\s+(\d{1,2})\s+(\d{1,2}):(\d{2})/);
  if (!m) return s;
  const h = Number(m[3]);
  return `${h % 12 === 0 ? 12 : h % 12}:${m[4]} ${h >= 12 ? 'PM' : 'AM'}, ${m[1]} ${m[2]}`;
}

// "600 block BERRY POINT RD" -> "600 block Berry Point Rd"
export function friendlyArea(area: string): string {
  return area.toLowerCase()
    .replace(/\b([a-z])/g, c => c.toUpperCase())
    .replace(/\bBlock\b/g, 'block')
    .replace(/\b(Of|And|To)\b/g, w => w.toLowerCase());
}
