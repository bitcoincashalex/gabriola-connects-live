// app/ferry/page.tsx
// v2.1 - Added Footer component
import Ferry from '@/components/Ferry';
import Footer from '@/components/Footer';

export default function FerryPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        <Ferry />
      </main>
      <Footer />
    </div>
  );
}
