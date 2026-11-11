// Path: app/community-hub/page.tsx
// Version: 1.5.0 - Compact list in the same white cards as the front page, so all six links fit on
//                  one phone screen (same links, same wording)
// Previous: 1.4.1 - Removed the NEW! badges
// Previous: 1.4.0 - Island News is live: the card opens /news (the forum's news posts)
// Previous: 1.3.1 - Card renamed Buy, Sell, Rent & Free; description mentions places for rent
// Previous: 1.3.0 - Buy, Sell & Free card (links to /marketplace); Island News card spans the row
// Previous: 1.2.0 - Island Map is live (links to /map)
// Earlier: 1.1.0 - Activated Volunteer Opportunities module
// Date: 2026-11-11

import { MessageSquare, AlertCircle, Map, Newspaper, Heart, Tag, ChevronRight, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import Footer from '@/components/Footer';

const LINKS: { href: string; icon: LucideIcon; title: string; text: string; chip: string }[] = [
  { href: '/community', icon: MessageSquare, title: 'Forum',
    text: 'Connect with your community, ask questions, share information',
    chip: 'bg-[#E6EFE8] text-gabriola-green' },
  { href: '/emergency', icon: AlertCircle, title: 'Emergency Contacts',
    text: 'Important phone numbers for Gabriola Island emergencies',
    chip: 'bg-red-50 text-red-600' },
  { href: '/volunteer', icon: Heart, title: 'Volunteer Opportunities',
    text: 'Help out in your community and make a difference',
    chip: 'bg-[#E6EFE8] text-gabriola-green' },
  { href: '/map', icon: Map, title: 'Island Map',
    text: 'Parks, beaches, trails, businesses, venues and the ferry, with you on the map',
    chip: 'bg-amber-50 text-[#9A4A00]' },
  { href: '/marketplace', icon: Tag, title: 'Buy, Sell, Rent & Free',
    text: 'Things for sale, places for rent, things wanted, and things free to a good home',
    chip: 'bg-[#E3E8F4] text-[#002774]' },
  { href: '/news', icon: Newspaper, title: 'Island News',
    text: 'Stay updated with community announcements and local news',
    chip: 'bg-[#E3E8F4] text-[#002774]' },
];

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

          {/* Community options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
            {LINKS.map(({ href, icon: Icon, title, text, chip }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-3 bg-white border border-[#E3DCCF] rounded-2xl px-3.5 py-2.5 md:p-5 min-h-[64px] shadow-sm hover:shadow-md hover:border-[#CFC6B4] transition-shadow"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${chip}`}>
                  <Icon className="w-[22px] h-[22px]" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-display text-[18px] md:text-[21px] font-bold leading-tight text-gabriola-green-dark">{title}</h2>
                  <p className="text-[13px] md:text-sm text-[#5B6660] leading-snug mt-0.5">{text}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-[#5B6660] flex-shrink-0 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
              </Link>
            ))}
          </div>

          {/* Footer Info */}
          <div className="mt-5 md:mt-8 text-center bg-white border border-[#E3DCCF] rounded-xl p-4 md:p-6">
            <p className="text-[14px] md:text-base text-[#3A4640]">
              More community features coming soon! Have a suggestion?{' '}
              <Link href="/community" className="text-gabriola-green font-semibold hover:underline">
                Let us know in the forum
              </Link>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
