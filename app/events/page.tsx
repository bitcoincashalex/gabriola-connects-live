// app/events/page.tsx
// Added Footer component
import EventsManager from '@/components/EventsManager';
import Footer from '@/components/Footer';

export default function EventsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        <EventsManager />
      </main>
      <Footer />
    </div>
  );
}
