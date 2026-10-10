// app/community/page.tsx
// Version: 1.1.0 - Forum is highlighted in the bottom menu on this page (2026-10-10)
// Previous: Added Footer component
import BBS from '@/components/BBS';
import Footer from '@/components/Footer';

export default function CommunityPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        <BBS />
      </main>
      <Footer activeTab="forum" />
    </div>
  );
}
