// app/directory/page.tsx
// Added Footer component
import Directory from '@/components/Directory';
import Footer from '@/components/Footer';

export default function DirectoryPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        <Directory />
      </main>
      <Footer />
    </div>
  );
}
