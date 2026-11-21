// lib/venues.ts
// One name per place, for the "All venues" filter on the Calendar and Events pages.
// Version: 1.0.0
// Date: 2026-11-21
//
// Events spell the same place many ways ("Gabriola Community Hall (main)", "Gabriola Community
// Hall (downstairs)", "Gabriola Community Hall, 2200 South Rd", "ZOOM", "Zoom"...). This drops the
// room in brackets and the street address after the comma, matches known other names, and leaves
// out entries that aren't a place ("Gabriola", "Various Locations"). The event itself still shows
// its full location; this only decides which venue it is filed under.

// Other names -> the one name shown in the list (keys are lower case)
const SAME_PLACE: Record<string, string> = {
  'gabriola arts council': 'Gabriola Arts & Heritage Centre',      // both 476 South Rd
  'gabriola arts centre': 'Gabriola Arts & Heritage Centre',
  'gabriola arts & heritage centre': 'Gabriola Arts & Heritage Centre',
  'zoom': 'Online (Zoom)',
  'online': 'Online (Zoom)',
  'surf restaurant': 'The Surf',
  'the surf': 'The Surf',
  'surf pub': 'The Surf',
  'gabriola commons foundation': 'Gabriola Commons',
  'agi co-op': 'Agi Co-op (Gabriola Agricultural Co-op)',
  'gabriola agricultural co-op': 'Agi Co-op (Gabriola Agricultural Co-op)',
  'gabriola golf club': 'Gabriola Golf & Country Club',
  'gabriola golf & country club': 'Gabriola Golf & Country Club',
  'christ church gabriola': 'Christ Church',
  'gabriola library': 'Gabriola Library',
  'gabriola regional library': 'Gabriola Library',
  'gabriola recreation society space': 'Gabriola Recreation Society space',
  'grs space': 'Gabriola Recreation Society space',
  'people for a healthy community on gabriola society': 'PHC',
};

// Not a place: these events don't go under any venue
const NOT_A_PLACE = new Set(['gabriola', 'gabriola island', 'various locations', 'tbd', 'tba', 'online and in person']);

/** The venue an event is filed under in the filter, or '' if it has none */
export function venueGroup(location?: string | null): string {
  let v = (location || '').trim();
  if (!v) return '';
  v = v.split(',')[0];                       // "Rollo Centre, 685 North Rd" -> "Rollo Centre"
  v = v.replace(/\s*\([^)]*\)\s*/g, ' ');    // "Community Hall (main)" -> "Community Hall"
  v = v.replace(/\s+/g, ' ').trim();
  const key = v.toLowerCase();
  if (!key || NOT_A_PLACE.has(key)) return '';
  return SAME_PLACE[key] || v;
}

/** Venue names for the filter: places with at least 2 events, A to Z ("The" ignored) */
export function venueOptions(locations: (string | null | undefined)[]): string[] {
  const counts = new Map<string, number>();
  for (const l of locations) {
    const g = venueGroup(l);
    if (g) counts.set(g, (counts.get(g) || 0) + 1);
  }
  const sortKey = (s: string) => s.replace(/^the\s+/i, '');
  return Array.from(counts.entries())
    .filter(([, n]) => n >= 2)
    .map(([name]) => name)
    .sort((a, b) => sortKey(a).localeCompare(sortKey(b), 'en', { sensitivity: 'base' }));
}
