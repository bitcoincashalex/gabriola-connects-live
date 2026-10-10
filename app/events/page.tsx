// app/events/page.tsx
// Version: 1.1.0 - Calendar is highlighted in the bottom menu on this page (2026-10-10)
// Previous: Added Footer component
import EventsManager from '@/components/EventsManager';
import Footer from '@/components/Footer';

export default function EventsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        <EventsManager />
      </main>
      <Footer activeTab="calendar" />
    </div>
  );
}
