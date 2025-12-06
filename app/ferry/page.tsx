// app/ferry/page.tsx — FINAL
import Header from '@/components/Header';
import Ferry from '@/components/Ferry';

export default function FerryPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="pt-8">
        <Ferry />
      </div>
    </div>
  );
}