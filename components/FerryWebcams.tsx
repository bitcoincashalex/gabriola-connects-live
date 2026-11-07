// Path: components/FerryWebcams.tsx
// BC Ferries terminal webcams for the Gabriola route: Descanso Bay and Nanaimo Harbour.
// Still images from BC Ferries, reloaded every minute while the page is open and showing.
// Tap an image to open BC Ferries' Current Conditions for that direction.
// Version: 1.0.0
// Date: 2026-11-07
'use client';

import { useEffect, useState } from 'react';
import { Camera, ExternalLink } from 'lucide-react';
import { GABRIOLA_TZ } from '@/lib/gabriolaTime';

const CAMS = [
  {
    code: 'GAB',
    name: 'Descanso Bay (Gabriola)',
    page: 'https://www.bcferries.com/current-conditions/GAB-NAH',
  },
  {
    code: 'NAH',
    name: 'Nanaimo Harbour',
    page: 'https://www.bcferries.com/current-conditions/NAH-GAB',
  },
];

const REFRESH_MS = 60_000;

function camUrl(code: string, stamp: number) {
  // The stamp makes the browser fetch a fresh image instead of a cached one
  return `https://ccimg.bcferries.com/cc/support/terminals/cam1_${code}.jpg?t=${stamp}`;
}

export default function FerryWebcams() {
  const [stamp, setStamp] = useState(() => Date.now());
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') {
        setFailed({});
        setStamp(Date.now());
      }
    };
    const timer = setInterval(refresh, REFRESH_MS);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  const checked = new Date(stamp).toLocaleTimeString('en-CA', {
    timeZone: GABRIOLA_TZ, hour: 'numeric', minute: '2-digit',
  });

  return (
    <section aria-labelledby="ferry-webcams" className="bg-white border border-[#E3DCCF] rounded-2xl p-4">
      <h2 id="ferry-webcams" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#5B6660] mb-3">
        <Camera className="w-4 h-4" aria-hidden="true" />
        Terminal webcams
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CAMS.map(cam => (
          <a
            key={cam.code}
            href={cam.page}
            target="_blank"
            rel="noopener noreferrer"
            className="block group"
          >
            <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-[#EFEAE0] flex items-center justify-center">
              {failed[cam.code] ? (
                <span className="text-sm text-[#5B6660] px-4 text-center">Camera image not available right now</span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={camUrl(cam.code, stamp)}
                  alt={`BC Ferries webcam: traffic at the ${cam.name} terminal`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={() => setFailed(f => ({ ...f, [cam.code]: true }))}
                />
              )}
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-[#1F2A24] group-hover:underline">{cam.name}</span>
              <ExternalLink className="w-4 h-4 text-[#5B6660] flex-shrink-0" aria-hidden="true" />
            </div>
            <span className="block text-[13px] text-[#5B6660]">Traffic at the terminal</span>
          </a>
        ))}
      </div>

      <p className="text-xs text-[#5B6660] mt-3">
        Webcam images: BC Ferries. Reloaded every minute, last at {checked}. Tap a camera for BC Ferries&apos; current conditions.
      </p>
    </section>
  );
}
