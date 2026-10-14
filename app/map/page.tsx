// app/map/page.tsx
// Island Map page
// Version: 1.0.0
// Date: 2026-10-13
'use client';

import dynamic from 'next/dynamic';
import Footer from '@/components/Footer';

// The map only runs in the browser
const IslandMap = dynamic(() => import('@/components/IslandMap'), {
  ssr: false,
  loading: () => <p className="text-center py-16 text-[#5B6660]" role="status">Loading the map...</p>,
});

export default function MapPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#F6F2EA]">
      <h1 className="sr-only">Island Map</h1>
      <IslandMap />
      <Footer />
    </div>
  );
}
