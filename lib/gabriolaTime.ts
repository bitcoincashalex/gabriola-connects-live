// lib/gabriolaTime.ts
// The time zone the whole site uses for "Gabriola time".
// Version: 1.1.0 - ferryAlertExpiry(): ferry alerts come down at the end of the Gabriola day
// Previous: 1.0.0
// Date: 2026-11-17
//
// B.C. moved to permanent daylight time on March 8, 2026 (UTC-7 all year, no fall-back).
// Many phones, browsers and the database still have the old 'America/Vancouver' rules, which
// fell back an hour on Nov. 1, 2026. 'Etc/GMT+7' is a fixed UTC-7 zone every device knows
// (the + is the old POSIX way of writing it: it really means 7 hours BEHIND UTC), so times
// come out right whatever the visitor's device thinks. If B.C. ever changes its clocks again,
// change it here (and in the database functions, see sql/2026-11-01-gabriola-time-fix.sql).
export const GABRIOLA_TZ = 'Etc/GMT+7';

const GABRIOLA_OFFSET_HOURS = 7;   // UTC-7, see above

/**
 * When an automatic ferry alert should come down: 11:59 PM Gabriola time today, or 11:59 PM
 * tomorrow if it's posted after 8 PM (a late notice is usually about tomorrow's first sailings).
 * If maxHours is given, whichever comes first. Ferry news goes stale within hours, so a
 * 12 or 24 hour expiry left this morning's cancellations on the front page all evening.
 */
export function ferryAlertExpiry(maxHours?: number, now: Date = new Date()): string {
  const local = new Date(now.getTime() - GABRIOLA_OFFSET_HOURS * 3600 * 1000);   // Gabriola clock, read as UTC
  const daysAhead = local.getUTCHours() >= 20 ? 1 : 0;
  const endLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + daysAhead, 23, 59);
  let end = endLocal + GABRIOLA_OFFSET_HOURS * 3600 * 1000;
  if (maxHours && maxHours > 0) end = Math.min(end, now.getTime() + maxHours * 3600 * 1000);
  return new Date(end).toISOString();
}
