// app/directory/page.tsx
// Version: 1.1.0 - Directory is highlighted in the bottom menu on this page (2026-10-10)
// Previous: Added Footer component
import Directory from '@/components/Directory';
import Footer from '@/components/Footer';

export default function DirectoryPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        <Directory />
      </main>
      <Footer activeTab="directory" />
    </div>
  );
}
