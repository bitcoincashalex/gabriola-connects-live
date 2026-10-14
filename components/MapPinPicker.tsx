// components/MapPinPicker.tsx
// Small map for setting where a business shows on the Island Map: find it from the address,
// drag the pin (or tap the map) to fix it, or take it off the map
// Version: 1.0.0
// Date: 2026-10-13
'use client';

import { useEffect, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GABRIOLA_CENTER, geocodeGabriola } from '@/lib/geocode';

interface Props {
  lat: number | null | undefined;
  lng: number | null | undefined;
  address: string;
  showOnMap: boolean;
  onChange: (v: { lat: number | null; lng: number | null; show_on_map: boolean }) => void;
}

export default function MapPinPicker({ lat, lng, address, showOnMap, onChange }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const pinRef = useRef<Leaflet.Marker | null>(null);
  const LRef = useRef<typeof Leaflet | null>(null);
  const latest = useRef({ showOnMap, onChange });
  latest.current = { showOnMap, onChange };
  const [msg, setMsg] = useState('');
  const [finding, setFinding] = useState(false);

  const placePin = (la: number, ln: number) => {
    const L = LRef.current, map = mapRef.current;
    if (!L || !map) return;
    if (!pinRef.current) {
      pinRef.current = L.marker([la, ln], {
        draggable: true,
        icon: L.divIcon({
          className: '',
          iconSize: [26, 26],
          iconAnchor: [13, 13],
          html: '<div style="width:26px;height:26px;border-radius:50%;background:#9A4A00;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
        }),
      }).addTo(map);
      pinRef.current.on('dragend', () => {
        const p = pinRef.current!.getLatLng();
        latest.current.onChange({ lat: p.lat, lng: p.lng, show_on_map: latest.current.showOnMap });
      });
    } else {
      pinRef.current.setLatLng([la, ln]);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import('leaflet');
      if (cancelled || !el.current || mapRef.current) return;
      LRef.current = L;
      const start: [number, number] = lat && lng ? [lat, lng] : GABRIOLA_CENTER;
      const map = L.map(el.current).setView(start, lat && lng ? 16 : 12);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
      }).addTo(map);
      map.attributionControl.setPrefix(false);
      map.on('click', (ev: any) => {
        placePin(ev.latlng.lat, ev.latlng.lng);
        latest.current.onChange({ lat: ev.latlng.lat, lng: ev.latlng.lng, show_on_map: latest.current.showOnMap });
      });
      mapRef.current = map;
      if (lat && lng) placePin(lat, lng);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      pinRef.current = null;
    };
  }, []);

  const findFromAddress = async () => {
    setFinding(true);
    setMsg('');
    const r = await geocodeGabriola(address);
    setFinding(false);
    if (!r) {
      setMsg('Couldn\'t find that address. Tap the map where the business is instead.');
      return;
    }
    placePin(r.lat, r.lng);
    mapRef.current?.setView([r.lat, r.lng], 17);
    onChange({ lat: r.lat, lng: r.lng, show_on_map: showOnMap });
    setMsg(r.exact
      ? `Found ${r.match}. Drag the pin if it's not quite right.`
      : `Only an approximate match (${r.match}). Please drag the pin to the right spot.`);
  };

  const remove = () => {
    pinRef.current?.remove();
    pinRef.current = null;
    onChange({ lat: null, lng: null, show_on_map: showOnMap });
    setMsg('Pin removed. This business won\'t show on the map.');
  };

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={showOnMap}
          onChange={e => onChange({ lat: lat ?? null, lng: lng ?? null, show_on_map: e.target.checked })} />
        Show on the Island Map
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={findFromAddress} disabled={finding}
          className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-semibold disabled:opacity-60">
          {finding ? 'Finding...' : 'Find from address'}
        </button>
        {lat && lng ? (
          <button type="button" onClick={remove} className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-red-700">
            Remove pin
          </button>
        ) : null}
      </div>
      <div ref={el} className="h-64 rounded-lg border border-gray-300 overflow-hidden z-0" />
      <p className="text-xs text-gray-600">{msg || 'Tap the map to place the pin, or drag it to move it.'}</p>
    </div>
  );
}
