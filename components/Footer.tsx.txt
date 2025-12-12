// components/Footer.tsx
// v2.3 - Updated: 2025-12-11 - Search tab now navigates to /search page
// Date: 2025-12-11

'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { CalendarDays, MessageSquare, BookOpen, Anchor, Search } from 'lucide-react';
import { useUser } from '@/components/AuthProvider';

interface FooterProps {
  activeTab?: string;
  onNavigate?: (tab: string) => void;
}

export default function Footer({ activeTab = '', onNavigate }: FooterProps) {
  const { user } = useUser();

  const handleTabClick = (tab: string) => {
    if (onNavigate) {
      // If onNavigate provided (on main page.tsx), use it
      onNavigate(tab);
    } else {
      // On standalone pages, navigate to home with hash
      window.location.href = `/#${tab}`;
    }
  };

  // Build tabs array - hide forum for banned users - memoized to prevent re-renders
  const tabs = useMemo(() => [
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
    // Only show forum if user is not banned
    ...(user?.is_banned ? [] : [{ id: 'forum', label: 'Forum', icon: MessageSquare }]),
    { id: 'directory', label: 'Directory', icon: BookOpen },
    { id: 'ferry', label: 'Ferry', icon: Anchor },
    { id: 'search', label: 'Search', icon: Search, isSpecial: true }, // Special handling for search
  ], [user?.is_banned]);

  return (
    <footer>
      {/* Bottom Navigation Bar */}
      <nav className="bg-white border-t-2 border-gabriola-green/20 shadow-lg">
        <div className="flex justify-around items-center h-20 max-w-screen-xl mx-auto px-4">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            // Special handling for search - always navigate to /search page
            if (tab.id === 'search') {
              return (
                <Link
                  key={tab.id}
                  href="/search"
                  className={`flex flex-col items-center justify-center flex-1 h-full transition-all ${
                    isActive ? 'text-gabriola-green' : 'text-gray-500 hover:text-gabriola-green-light'
                  }`}
                >
                  <div className={`p-2 rounded-xl transition-all ${isActive ? 'bg-gabriola-green/10' : ''}`}>
                    <Icon className={`w-6 h-6 md:w-7 md:h-7 ${isActive ? 'scale-110' : ''}`} />
                  </div>
                  <span className={`text-xs md:text-sm mt-1 font-medium ${isActive ? 'font-bold' : ''}`}>
                    {tab.label}
                  </span>
                </Link>
              );
            }
            
            // Regular tabs - use button with handleTabClick
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-all ${
                  isActive ? 'text-gabriola-green' : 'text-gray-500 hover:text-gabriola-green-light'
                }`}
              >
                <div className={`p-2 rounded-xl transition-all ${isActive ? 'bg-gabriola-green/10' : ''}`}>
                  <Icon className={`w-6 h-6 md:w-7 md:h-7 ${isActive ? 'scale-110' : ''}`} />
                </div>
                <span className={`text-xs md:text-sm mt-1 font-medium ${isActive ? 'font-bold' : ''}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer Links */}
      <div className="bg-gabriola-green-dark text-white py-4 text-center text-xs">
        <div className="max-w-7xl mx-auto px-6">
          <p className="mb-2">
            Open source • Free to use with attribution • MIT license
          </p>
          <p className="opacity-80">
            <Link href="https://github.com/bitcoincashalex/gabriola-connects-live" target="_blank" className="hover:underline">
              GitHub
            </Link>{' '}
            •{' '}
            <Link href="/roadmap" className="hover:underline">
              Roadmap
            </Link>{' '}
            •{' '}
            <Link href="/strachan" className="hover:underline">
              About
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
