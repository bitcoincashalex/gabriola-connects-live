// lib/gabriolaTime.ts
// The time zone the whole site uses for "Gabriola time".
// Version: 1.0.0
// Date: 2026-11-01
//
// B.C. moved to permanent daylight time on March 8, 2026 (UTC-7 all year, no fall-back).
// Many phones, browsers and the database still have the old 'America/Vancouver' rules, which
// fell back an hour on Nov. 1, 2026. 'Etc/GMT+7' is a fixed UTC-7 zone every device knows
// (the + is the old POSIX way of writing it: it really means 7 hours BEHIND UTC), so times
// come out right whatever the visitor's device thinks. If B.C. ever changes its clocks again,
// change it here (and in the database functions, see sql/2026-11-01-gabriola-time-fix.sql).
export const GABRIOLA_TZ = 'Etc/GMT+7';
