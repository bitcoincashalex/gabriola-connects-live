// app/page.tsx
// v4.0.0 - Simplified: removed hash navigation system, all navigation uses dedicated routes
// Date: 2025-12-20
'use client';

import LandingPage from '@/components/LandingPage';
import EmergencyAlertBanner from '@/components/EmergencyAlertBanner';
import Footer from '@/components/Footer';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-gabriola-sand/10">
      <EmergencyAlertBanner />
      <main className="flex-1 overflow-auto">
        <LandingPage />
      </main>
      <Footer activeTab="landing" />
    </div>
  );
}
