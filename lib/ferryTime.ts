// lib/ferryTime.ts
// Small time helpers for the Ferry page, always in Gabriola (Pacific) time
// Version: 1.0.0
// Date: 2026-10-10

// Minutes since midnight, Gabriola time (not the visitor's own clock)
export function pacificNowMinutes(): number {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Vancouver', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  return Number(parts.find(p => p.type === 'hour')?.value) * 60 + Number(parts.find(p => p.type === 'minute')?.value);
}

// "1:10 PM" -> minutes since midnight (null if it can't be read)
export function displayToMinutes(t: string): number | null {
  const m = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === 'PM') h += 12;
  return h * 60 + Number(m[2]);
}

// "07:35:00" -> minutes since midnight
export function sqlTimeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// "13:10:00" -> "1:10 PM"
export function sqlTimeToDisplay(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

// "in 15 min", "in 1 hr 5 min", "leaving now"
export function untilText(depMinutes: number, nowMinutes: number): string {
  const diff = depMinutes - nowMinutes;
  if (diff <= 0) return 'leaving now';
  if (diff < 60) return `in ${diff} min`;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m === 0 ? `in ${h} hr` : `in ${h} hr ${m} min`;
}
