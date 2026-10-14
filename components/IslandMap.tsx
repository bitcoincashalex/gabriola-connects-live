// components/IslandMap.tsx
// The Island Map: businesses, event venues (with upcoming events), parks and beaches, trails,
// the ferry terminal, and "You are here" from the phone's GPS. Map: OpenStreetMap via Leaflet.
// Version: 1.0.0
// Date: 2026-10-13
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type * as Leaflet from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed, List, Map as MapIcon, X, Phone, Globe, Navigation, CalendarDays, Ship, Trees, Store, Footprints } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { GABRIOLA_BOUNDS, GABRIOLA_CENTER, directionsUrl, distanceKm, onGabriola } from '@/lib/geocode';
import { displayToMinutes, pacificNowMinutes, untilText } from '@/lib/ferryTime';
import { formatEventTime } from '@/components/CalendarList';

type LayerId = 'businesses' | 'venues' | 'parks' | 'trails' | 'ferry';

const LAYERS: { id: LayerId; label: string; color: string; icon: any }[] = [
  { id: 'businesses', label: 'Businesses', color: '#9A4A00', icon: Store },
  { id: 'venues', label: 'Venues & events', color: '#002774', icon: CalendarDays },
  { id: 'parks', label: 'Parks & beaches', color: '#2D5F3F', icon: Trees },
  { id: 'trails', label: 'Trails', color: '#8A5A2B', icon: Footprints },
  { id: 'ferry', label: 'Ferry', color: '#0E7490', icon: Ship },
];
const colorOf = (id: LayerId) => LAYERS.find(l => l.id === id)!.color;

interface Business { id: string; name: string; category: string | null; address: string | null; phone: string | null; website: string | null; lat: number; lng: number; }
interface Venue { id: string; name: string; address: string | null; lat: number; lng: number; alternate_names: string[] | null; }
interface EventRow { id: string; title: string; start_date: string; start_time: string | null; all_day?: boolean | null; location: string | null; venue_name?: string | null; }
interface Place { id: string; name: string; aka: string | null; kind: string; about?: string | null; more?: string | null; center: [number, number]; outline: [number, number][][]; }
interface Trail { n: string | null; c: [number, number][]; }

type Selected =
  | { layer: 'businesses'; lat: number; lng: number; items: Business[] }
  | { layer: 'venues'; lat: number; lng: number; venue: Venue; events: EventRow[] }
  | { layer: 'parks'; lat: number; lng: number; place: Place }
  | { layer: 'ferry'; lat: number; lng: number; place: Place }
  | { layer: 'trails'; lat: number; lng: number; name: string | null };

function todayPacific(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Vancouver' }).format(new Date());
}

function shortDate(d: string): string {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day, 12)).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export default function IslandMap() {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const LRef = useRef<typeof Leaflet | null>(null);
  const groups = useRef<Partial<Record<LayerId | 'me', Leaflet.LayerGroup>>>({});
  const watchId = useRef<number | null>(null);

  const [ready, setReady] = useState(false);
  const [on, setOn] = useState<Record<LayerId, boolean>>({ businesses: true, venues: true, parks: true, trails: true, ferry: true });
  const [view, setView] = useState<'map' | 'list'>('map');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [trails, setTrails] = useState<Trail[] | null>(null);
  const [nextFerry, setNextFerry] = useState<{ fromGabriola: string | null; fromNanaimo: string | null } | null>(null);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [me, setMe] = useState<{ lat: number; lng: number; acc: number } | null>(null);
  const [locMsg, setLocMsg] = useState('');

  // ---------- data ----------
  useEffect(() => {
    (async () => {
      const [b, v, e, p] = await Promise.all([
        supabase.from('directory_businesses')
          .select('id, name, category, address, phone, website, lat, lng, show_on_map')
          .eq('is_approved', true).not('lat', 'is', null).not('lng', 'is', null),
        supabase.from('venues').select('id, name, address, lat, lng, alternate_names').not('lat', 'is', null),
        supabase.from('events').select('*').eq('is_approved', true).is('deleted_at', null)
          .gte('start_date', todayPacific()).order('start_date').order('start_time').limit(300),
        fetch('/map/places.json').then(r => r.json()).catch(() => ({ places: [] })),
      ]);
      setBusinesses(((b.data as any[]) || []).filter(x => x.show_on_map !== false && onGabriola(x.lat, x.lng)));
      setVenues((v.data as Venue[]) || []);
      setEvents((e.data as EventRow[]) || []);
      setPlaces(p.places || []);

      const [g, n] = await Promise.all([
        supabase.rpc('get_next_ferry', { from_location: 'Gabriola' }),
        supabase.rpc('get_next_ferry', { from_location: 'Nanaimo' }),
      ]);
      setNextFerry({ fromGabriola: (g.data as any)?.time || null, fromNanaimo: (n.data as any)?.time || null });
    })();
  }, []);

  useEffect(() => {
    if (on.trails && !trails) {
      fetch('/map/trails.json').then(r => r.json()).then(d => setTrails(d.trails || [])).catch(() => setTrails([]));
    }
  }, [on.trails, trails]);

  // Upcoming events at each venue (matched on the venue's name or other names)
  const eventsByVenue = useMemo(() => {
    const out: Record<string, EventRow[]> = {};
    for (const v of venues) {
      const names = [v.name, ...(v.alternate_names || [])].map(s => s.toLowerCase());
      out[v.id] = events.filter(e => {
        const place = (e.venue_name || e.location || '').toLowerCase();
        return place && names.some(n => place.includes(n) || n.includes(place));
      }).slice(0, 5);
    }
    return out;
  }, [venues, events]);

  // Businesses at the same spot share one pin
  const businessSpots = useMemo(() => {
    const m = new Map<string, Business[]>();
    for (const b of businesses) {
      const k = `${b.lat.toFixed(4)},${b.lng.toFixed(4)}`;
      m.set(k, [...(m.get(k) || []), b]);
    }
    return Array.from(m.values());
  }, [businesses]);

  const ferryPlace = places.find(p => p.kind === 'Ferry terminal') || null;
  const parkPlaces = places.filter(p => p.kind !== 'Ferry terminal');

  // ---------- map setup ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import('leaflet');
      if (cancelled || !mapEl.current || mapRef.current) return;
      LRef.current = L;
      const map = L.map(mapEl.current, { zoomControl: false, attributionControl: true, minZoom: 10 })
        .setView(GABRIOLA_CENTER, 12);
      L.control.zoom({ position: 'bottomright' }).addTo(map);
      // Smaller dots when zoomed out, so the island isn't buried under pins
      const sizeDots = () => mapEl.current?.classList.toggle('gc-far', map.getZoom() < 14);
      map.on('zoomend', sizeDots);
      map.fitBounds(GABRIOLA_BOUNDS);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
      }).addTo(map);
      map.attributionControl.setPrefix(false);
      mapRef.current = map;
      sizeDots();
      setReady(true);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, []);

  // Leaflet needs a nudge when the map is shown again after the list
  useEffect(() => {
    if (view === 'map') setTimeout(() => mapRef.current?.invalidateSize(), 50);
  }, [view]);

  const dot = (L: typeof Leaflet, lat: number, lng: number, color: string, count = 1) =>
    L.marker([lat, lng], {
      icon: L.divIcon({
        className: '',
        iconSize: [26, 26],
        iconAnchor: [13, 13],
        html: `<div style="width:26px;height:26px;display:flex;align-items:center;justify-content:center"><div class="gc-dot" style="width:24px;height:24px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;color:#fff;font:700 11px/1 system-ui,sans-serif">${count > 1 ? count : ''}</div></div>`,
      }),
      keyboard: true,
    });

  // Draw each layer whenever its data or switch changes
  const redraw = (id: LayerId, draw: (L: typeof Leaflet, g: Leaflet.LayerGroup) => void) => {
    const L = LRef.current, map = mapRef.current;
    if (!L || !map) return;
    groups.current[id]?.remove();
    const g = L.layerGroup();
    if (on[id]) {
      draw(L, g);
      g.addTo(map);
    }
    groups.current[id] = g;
  };

  useEffect(() => {
    redraw('trails', (L, g) => {
      for (const t of trails || []) {
        const line = L.polyline(t.c.map(([lng, lat]) => [lat, lng] as [number, number]), {
          color: colorOf('trails'), weight: 2.5, opacity: 0.85, dashArray: '5 4',
        });
        line.on('click', (ev: any) => setSelected({ layer: 'trails', lat: ev.latlng.lat, lng: ev.latlng.lng, name: t.n }));
        if (t.n) line.bindTooltip(t.n, { sticky: true });
        g.addLayer(line);
      }
    });
  }, [ready, on.trails, trails]);

  useEffect(() => {
    redraw('parks', (L, g) => {
      for (const p of parkPlaces) {
        for (const ring of p.outline || []) {
          if (ring.length < 2) continue;
          const pts = ring.map(([lng, lat]) => [lat, lng] as [number, number]);
          const closed = ring.length > 3 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1];
          // Closed outlines are shaded; outlines that come in pieces are drawn as lines
          g.addLayer(closed
            ? L.polygon(pts, { color: colorOf('parks'), weight: 1.5, fillOpacity: 0.12, interactive: false })
            : L.polyline(pts, { color: colorOf('parks'), weight: 1.5, interactive: false }));
        }
        const m = dot(L, p.center[1], p.center[0], colorOf('parks'));
        m.bindTooltip(p.aka ? `${p.name} (${p.aka})` : p.name);
        m.on('click', () => setSelected({ layer: 'parks', lat: p.center[1], lng: p.center[0], place: p }));
        g.addLayer(m);
      }
    });
  }, [ready, on.parks, places]);

  useEffect(() => {
    redraw('businesses', (L, g) => {
      for (const spot of businessSpots) {
        const m = dot(L, spot[0].lat, spot[0].lng, colorOf('businesses'), spot.length);
        m.bindTooltip(spot.length > 1 ? `${spot.length} businesses` : spot[0].name);
        m.on('click', () => setSelected({ layer: 'businesses', lat: spot[0].lat, lng: spot[0].lng, items: spot }));
        g.addLayer(m);
      }
    });
  }, [ready, on.businesses, businessSpots]);

  useEffect(() => {
    redraw('venues', (L, g) => {
      for (const v of venues) {
        const m = dot(L, v.lat, v.lng, colorOf('venues'));
        m.bindTooltip(v.name);
        m.on('click', () => setSelected({ layer: 'venues', lat: v.lat, lng: v.lng, venue: v, events: eventsByVenue[v.id] || [] }));
        g.addLayer(m);
      }
    });
  }, [ready, on.venues, venues, eventsByVenue]);

  useEffect(() => {
    redraw('ferry', (L, g) => {
      if (!ferryPlace) return;
      const m = dot(L, ferryPlace.center[1], ferryPlace.center[0], colorOf('ferry'));
      m.bindTooltip('Gabriola ferry terminal');
      m.on('click', () => setSelected({ layer: 'ferry', lat: ferryPlace.center[1], lng: ferryPlace.center[0], place: ferryPlace }));
      g.addLayer(m);
    });
  }, [ready, on.ferry, ferryPlace]);

  // ---------- You are here ----------
  useEffect(() => {
    const L = LRef.current, map = mapRef.current;
    if (!L || !map) return;
    groups.current.me?.remove();
    if (!me) return;
    const g = L.layerGroup();
    g.addLayer(L.circle([me.lat, me.lng], { radius: me.acc, color: '#2563EB', weight: 1, fillOpacity: 0.1, interactive: false }));
    g.addLayer(L.circleMarker([me.lat, me.lng], { radius: 8, color: '#fff', weight: 3, fillColor: '#2563EB', fillOpacity: 1 }).bindTooltip('You are here'));
    g.addTo(map);
    groups.current.me = g;
  }, [ready, me]);

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setLocMsg('Your browser can\'t share your location.');
      return;
    }
    setLocMsg('Finding you...');
    let first = true;
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = navigator.geolocation.watchPosition(
      pos => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy };
        setMe(p);
        if (first) {
          first = false;
          if (onGabriola(p.lat, p.lng)) {
            setLocMsg('');
            mapRef.current?.setView([p.lat, p.lng], Math.max(mapRef.current.getZoom(), 15));
          } else {
            setLocMsg('You\'re not on Gabriola right now, so the map stays on the island.');
          }
        }
      },
      err => {
        setLocMsg(err.code === err.PERMISSION_DENIED
          ? 'Location is turned off for this site. You can allow it in your browser settings.'
          : 'Couldn\'t find your location. Try again outside or with GPS on.');
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
    );
  };

  // ---------- list view ----------
  const here: [number, number] | null = me && onGabriola(me.lat, me.lng) ? [me.lat, me.lng] : null;
  const away = (lat: number, lng: number) => {
    if (!here) return null;
    const km = distanceKm(here, [lat, lng]);
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
  };
  const byDistance = <T,>(items: T[], ll: (t: T) => [number, number], name: (t: T) => string) =>
    [...items].sort((a, b) => here
      ? distanceKm(here, ll(a)) - distanceKm(here, ll(b))
      : name(a).localeCompare(name(b)));

  const showOnMap = (s: Selected) => {
    setSelected(s);
    setView('map');
    setTimeout(() => mapRef.current?.setView([s.lat, s.lng], Math.max(mapRef.current!.getZoom(), 15)), 80);
  };

  const chip = (active: boolean) =>
    `flex-shrink-0 flex items-center gap-1.5 px-3 min-h-[40px] rounded-full text-sm font-semibold whitespace-nowrap shadow-sm border transition-colors ${
      active ? 'bg-white border-[#1F2A24] text-[#1F2A24]' : 'bg-white/90 border-[#CFC6B4] text-[#8A938E]'
    }`;

  return (
    <div className="relative bg-[#F6F2EA]" style={{ height: 'calc(100dvh - 5rem - 4.5rem - env(safe-area-inset-bottom))', minHeight: 420 }}>
      <style>{`.gc-far .gc-dot{width:13px!important;height:13px!important;border-width:2px!important;font-size:0!important}`}</style>
      {/* Layer switches and buttons */}
      <div className="absolute top-0 inset-x-0 z-[1000] p-2 space-y-2 pointer-events-none">
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-wrap pointer-events-auto">
          {LAYERS.map(l => {
            const Icon = l.icon;
            return (
              <button key={l.id} type="button" aria-pressed={on[l.id]} onClick={() => setOn(s => ({ ...s, [l.id]: !s[l.id] }))} className={chip(on[l.id])}>
                <span className="w-3 h-3 rounded-full" style={{ background: on[l.id] ? l.color : '#CFC6B4' }} aria-hidden="true" />
                <Icon className="w-4 h-4" aria-hidden="true" />
                {l.label}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2 pointer-events-auto">
          <button type="button" onClick={locate}
            className="flex items-center gap-1.5 min-h-[44px] px-3 rounded-lg bg-[#2563EB] text-white text-sm font-semibold shadow">
            <LocateFixed className="w-4 h-4" aria-hidden="true" /> You are here
          </button>
          <button type="button" onClick={() => setView(v => v === 'map' ? 'list' : 'map')}
            className="flex items-center gap-1.5 min-h-[44px] px-3 rounded-lg bg-white border border-[#CFC6B4] text-sm font-semibold shadow">
            {view === 'map' ? <><List className="w-4 h-4" aria-hidden="true" /> List</> : <><MapIcon className="w-4 h-4" aria-hidden="true" /> Map</>}
          </button>
        </div>
        {locMsg && (
          <p className="pointer-events-auto inline-block bg-white rounded-lg px-3 py-2 text-sm shadow max-w-md" role="status">{locMsg}</p>
        )}
      </div>

      {/* The map */}
      <div ref={mapEl} className={`absolute inset-0 z-0 ${view === 'list' ? 'invisible' : ''}`} aria-label="Map of Gabriola Island" />

      {/* List view */}
      {view === 'list' && (
        <div className="absolute inset-0 z-[900] overflow-y-auto pt-36 pb-6 px-4 bg-[#F6F2EA]">
          <div className="max-w-3xl mx-auto space-y-5">
            {here && <p className="text-sm text-[#5B6660]">Nearest first, from where you are.</p>}
            {on.parks && (
              <ListSection title="Parks & beaches" color={colorOf('parks')}>
                {byDistance(parkPlaces, p => [p.center[1], p.center[0]], p => p.name).map(p => (
                  <ListRow key={p.id} title={p.aka ? `${p.name} (${p.aka})` : p.name} sub={p.kind} dist={away(p.center[1], p.center[0])}
                    onClick={() => showOnMap({ layer: 'parks', lat: p.center[1], lng: p.center[0], place: p })} />
                ))}
              </ListSection>
            )}
            {on.venues && (
              <ListSection title="Venues & events" color={colorOf('venues')}>
                {byDistance(venues, v => [v.lat, v.lng], v => v.name).map(v => (
                  <ListRow key={v.id} title={v.name}
                    sub={(eventsByVenue[v.id] || []).length ? `Next: ${eventsByVenue[v.id][0].title}` : v.address || ''}
                    dist={away(v.lat, v.lng)}
                    onClick={() => showOnMap({ layer: 'venues', lat: v.lat, lng: v.lng, venue: v, events: eventsByVenue[v.id] || [] })} />
                ))}
              </ListSection>
            )}
            {on.businesses && (
              <ListSection title="Businesses" color={colorOf('businesses')}>
                {byDistance(businesses, b => [b.lat, b.lng], b => b.name).map(b => (
                  <ListRow key={b.id} title={b.name} sub={b.category || ''} dist={away(b.lat, b.lng)}
                    onClick={() => showOnMap({ layer: 'businesses', lat: b.lat, lng: b.lng, items: [b] })} />
                ))}
              </ListSection>
            )}
            {on.ferry && ferryPlace && (
              <ListSection title="Ferry" color={colorOf('ferry')}>
                <ListRow title="Gabriola ferry terminal" sub="Descanso Bay" dist={away(ferryPlace.center[1], ferryPlace.center[0])}
                  onClick={() => showOnMap({ layer: 'ferry', lat: ferryPlace.center[1], lng: ferryPlace.center[0], place: ferryPlace })} />
              </ListSection>
            )}
            <p className="text-xs text-[#5B6660]">
              Parks, beaches and trails: © <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors.
              Park notes from <a className="underline" href="https://galtt.ca/gabriolas-parks/" target="_blank" rel="noopener noreferrer">GaLTT</a>.
              Business locations come from their listed address and may be approximate.
            </p>
          </div>
        </div>
      )}

      {/* Details card for the tapped pin */}
      {selected && view === 'map' && (
        <div className="absolute inset-x-0 bottom-0 z-[1000] p-2 md:p-4 md:max-w-md">
          <div className="relative bg-white rounded-2xl shadow-xl border border-[#E3DCCF] p-4 max-h-[55vh] overflow-y-auto">
            <button type="button" onClick={() => setSelected(null)} aria-label="Close"
              className="absolute top-2 right-2 p-2 rounded-full hover:bg-[#F6F2EA]">
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
            <SelectedCard s={selected} nextFerry={nextFerry} dist={away(selected.lat, selected.lng)} />
          </div>
        </div>
      )}
    </div>
  );
}

function ListSection({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gabriola-green-dark mb-2">
        <span className="w-3 h-3 rounded-full" style={{ background: color }} aria-hidden="true" /> {title}
      </h2>
      <ul className="bg-white border border-[#E3DCCF] rounded-2xl divide-y divide-[#E3DCCF]">{children}</ul>
    </section>
  );
}

function ListRow({ title, sub, dist, onClick }: { title: string; sub: string; dist: string | null; onClick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onClick} className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-[#F6F2EA]">
        <span className="min-w-0">
          <span className="block font-semibold truncate">{title}</span>
          {sub && <span className="block text-sm text-[#5B6660] truncate">{sub}</span>}
        </span>
        {dist && <span className="flex-shrink-0 text-sm text-[#5B6660]">{dist}</span>}
      </button>
    </li>
  );
}

function DirectionsButton({ lat, lng }: { lat: number; lng: number }) {
  return (
    <a href={directionsUrl(lat, lng)} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-lg bg-gabriola-green text-white text-sm font-semibold">
      <Navigation className="w-4 h-4" aria-hidden="true" /> Directions
    </a>
  );
}

function SelectedCard({ s, nextFerry, dist }: { s: Selected; nextFerry: { fromGabriola: string | null; fromNanaimo: string | null } | null; dist: string | null }) {
  const distLine = dist ? <p className="text-xs text-[#5B6660]">{dist} from you</p> : null;

  if (s.layer === 'businesses') {
    return (
      <div className="space-y-3 pr-8">
        {s.items.length > 1 && <p className="text-xs font-bold uppercase text-[#9A4A00]">{s.items.length} businesses at this spot</p>}
        {s.items.map(b => (
          <div key={b.id} className="space-y-1">
            <p className="text-xs font-semibold text-[#9A4A00]">{b.category}</p>
            <h3 className="font-bold text-lg leading-snug">{b.name}</h3>
            {b.address && <p className="text-sm text-[#5B6660]">{b.address}</p>}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {b.phone && <a href={`tel:${b.phone.replace(/[^\d+]/g, '')}`} className="flex items-center gap-1 font-semibold text-gabriola-green"><Phone className="w-4 h-4" aria-hidden="true" /> {b.phone}</a>}
              {b.website && <a href={/^https?:/.test(b.website) ? b.website : `https://${b.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-semibold text-gabriola-green"><Globe className="w-4 h-4" aria-hidden="true" /> Website</a>}
            </div>
          </div>
        ))}
        {distLine}
        <div className="flex flex-wrap gap-2 pt-1">
          <DirectionsButton lat={s.lat} lng={s.lng} />
          <Link href="/directory/business" className="inline-flex items-center min-h-[40px] px-3 rounded-lg border border-[#CFC6B4] text-sm font-semibold">Directory</Link>
        </div>
      </div>
    );
  }

  if (s.layer === 'venues') {
    return (
      <div className="space-y-2 pr-8">
        <p className="text-xs font-semibold text-[#002774]">Venue</p>
        <h3 className="font-bold text-lg leading-snug">{s.venue.name}</h3>
        {s.venue.address && <p className="text-sm text-[#5B6660]">{s.venue.address}</p>}
        <div>
          <p className="text-sm font-bold mt-2 mb-1">Coming up here</p>
          {s.events.length === 0 ? (
            <p className="text-sm text-[#5B6660]">No upcoming events listed.</p>
          ) : (
            <ul className="space-y-1">
              {s.events.map(e => (
                <li key={e.id} className="text-sm">
                  <span className="font-semibold">{shortDate(e.start_date)}</span>
                  {e.start_time && <span className="text-[#5B6660]"> · {formatEventTime(e.start_time, !!e.all_day)}</span>}
                  <span> · {e.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {distLine}
        <div className="flex flex-wrap gap-2 pt-1">
          <DirectionsButton lat={s.lat} lng={s.lng} />
          <Link href="/calendar" className="inline-flex items-center min-h-[40px] px-3 rounded-lg border border-[#CFC6B4] text-sm font-semibold">Calendar</Link>
        </div>
      </div>
    );
  }

  if (s.layer === 'ferry') {
    const now = pacificNowMinutes();
    const line = (label: string, t: string | null) => {
      const mins = t ? displayToMinutes(t) : null;
      return (
        <p className="text-sm"><span className="text-[#5B6660]">{label}</span>{' '}
          <span className="font-bold text-[#0E7490]">{t || 'no more today'}</span>
          {mins !== null && <span className="text-[#5B6660]"> · {untilText(mins, now)}</span>}
        </p>
      );
    };
    return (
      <div className="space-y-2 pr-8">
        <p className="text-xs font-semibold text-[#0E7490]">Ferry terminal</p>
        <h3 className="font-bold text-lg leading-snug">Gabriola ferry terminal</h3>
        <p className="text-sm text-[#5B6660]">Descanso Bay</p>
        {nextFerry && (
          <div className="space-y-0.5">
            {line('Next from Gabriola:', nextFerry.fromGabriola)}
            {line('Next from Nanaimo:', nextFerry.fromNanaimo)}
          </div>
        )}
        {distLine}
        <div className="flex flex-wrap gap-2 pt-1">
          <DirectionsButton lat={s.lat} lng={s.lng} />
          <Link href="/ferry" className="inline-flex items-center min-h-[40px] px-3 rounded-lg border border-[#CFC6B4] text-sm font-semibold">Full schedule</Link>
        </div>
      </div>
    );
  }

  if (s.layer === 'parks') {
    const p = s.place;
    return (
      <div className="space-y-2 pr-8">
        <p className="text-xs font-semibold text-gabriola-green">{p.kind}</p>
        <h3 className="font-bold text-lg leading-snug">{p.name}</h3>
        {p.aka && <p className="text-sm text-[#5B6660]">Also known as {p.aka}</p>}
        {p.about && <p className="text-sm">{p.about}</p>}
        {distLine}
        <div className="flex flex-wrap gap-2 pt-1">
          <DirectionsButton lat={s.lat} lng={s.lng} />
          {p.more && <a href={p.more} target="_blank" rel="noopener noreferrer" className="inline-flex items-center min-h-[40px] px-3 rounded-lg border border-[#CFC6B4] text-sm font-semibold">More from GaLTT</a>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 pr-8">
      <p className="text-xs font-semibold text-[#8A5A2B]">Trail</p>
      <h3 className="font-bold text-lg leading-snug">{s.name || 'Unnamed trail'}</h3>
      <p className="text-sm text-[#5B6660]">
        Trail lines come from OpenStreetMap and may not show every closure. Some trails cross private land with the owner's permission: stay on the trail and follow posted signs.
      </p>
      <a href="https://galtt.ca/trails-and-maps/" target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center min-h-[40px] px-3 rounded-lg border border-[#CFC6B4] text-sm font-semibold">GaLTT trail maps</a>
    </div>
  );
}
