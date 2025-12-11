// app/alerts/page.tsx
// Added Footer component
import AlertsManager from '@/components/AlertsManager';
import Footer from '@/components/Footer';

export default function AlertsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        <AlertsManager />
      </main>
      <Footer />
    </div>
  );
}
