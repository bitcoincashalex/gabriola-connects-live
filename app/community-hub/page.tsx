// Path: app/community-hub/page.tsx
// Version: 2.0.0 - Each card shows what's live in its section (components/CommunityHubCards.tsx):
//                  newest discussions and Community Voices column, 911 and the local numbers people
//                  look up most, open volunteer listings, Buy/Sell/Rent/Free counts and newest listing,
//                  the latest Island News. "More community features coming soon" replaced with
//                  "Have an idea for the site?"
// Previous: 1.5.0 - Compact list in the same white cards as the front page
// Previous: 1.4.1 - Removed the NEW! badges
// Previous: 1.4.0 - Island News is live: the card opens /news (the forum's news posts)
// Earlier: 1.3.1, 1.3.0, 1.2.0, 1.1.0
// Date: 2026-11-18

import Link from 'next/link';
import Footer from '@/components/Footer';
import CommunityHubCards from '@/components/CommunityHubCards';

export default function CommunityHubPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 bg-[#F6F2EA] text-[#1F2A24]">
        <div className="max-w-5xl mx-auto px-4 md:px-6 pt-3 md:pt-8 pb-10">
          {/* Header */}
          <div className="mb-2.5 md:mb-6">
            <h1 className="font-display text-[26px] md:text-4xl font-bold text-gabriola-green-dark leading-tight">
              Community Hub
            </h1>
            <p className="text-[14px] md:text-lg text-[#5B6660]">
              Your gateway to Gabriola Island resources
            </p>
          </div>

          <CommunityHubCards />

          {/* Ideas */}
          <div className="mt-5 md:mt-8 text-center bg-white border border-[#E3DCCF] rounded-xl p-4 md:p-6">
            <p className="text-[14px] md:text-base text-[#3A4640]">
              Have an idea for the site?{' '}
              <Link href="/community" className="text-gabriola-green font-semibold hover:underline">
                Post it in the forum under Welcome &amp; Help
              </Link>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
