// app/community/page.tsx
// Added Footer component
import BBS from '@/components/BBS';
import Footer from '@/components/Footer';

export default function CommunityPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        <BBS />
      </main>
      <Footer />
    </div>
  );
}
