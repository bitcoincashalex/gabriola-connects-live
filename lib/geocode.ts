// lib/geocode.ts
// Finds the map position of a Gabriola street address using the BC Address Geocoder
// (geocoder.api.gov.bc.ca, the province's civic address records; free, no key needed)
// Version: 1.0.0
// Date: 2026-10-13

export interface GeocodeResult {
  lat: number;
  lng: number;
  match: string;      // the address the geocoder matched, e.g. "476 South Rd, Gabriola Island, BC"
  exact: boolean;     // true when it matched the exact civic number on Gabriola Island
}

// Returns the best match, or null if nothing usable was found.
// Only treat a result as good enough to pin automatically when `exact` is true.
export async function geocodeGabriola(address: string): Promise<GeocodeResult | null> {
  const a = (address || '').trim();
  if (!a || !/\d/.test(a)) return null;   // PO boxes and addresses with no number can't be pinned
  const q = /gabriola/i.test(a) ? a : `${a}, Gabriola Island, BC`;
  try {
    const res = await fetch(
      `https://geocoder.api.gov.bc.ca/addresses.json?maxResults=1&echo=false&addressString=${encodeURIComponent(q)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const f = data?.features?.[0];
    if (!f) return null;
    const p = f.properties || {};
    const [lng, lat] = f.geometry.coordinates;
    const exact =
      ['CIVIC_NUMBER', 'UNIT'].includes(p.matchPrecision) &&
      (p.score || 0) >= 90 &&
      /Gabriola Island/.test(p.fullAddress || '');
    return { lat, lng, match: p.fullAddress || '', exact };
  } catch {
    return null;
  }
}

// Gabriola and the water around it
export const GABRIOLA_CENTER: [number, number] = [49.165, -123.79];
export const GABRIOLA_BOUNDS: [[number, number], [number, number]] = [[49.115, -123.90], [49.215, -123.68]];

export function onGabriola(lat: number, lng: number): boolean {
  return lat > 49.11 && lat < 49.22 && lng > -123.91 && lng < -123.67;
}

// Straight-line distance in km
export function distanceKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function directionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
