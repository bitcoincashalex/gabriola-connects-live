// components/Footer.tsx
// v4.0.0 - Bottom menu stays fixed to the bottom of the screen on every page (like a phone app),
//          with room left under the footer so nothing is hidden behind it
// Previous: v3.9.0 - Site version (package.json) + deploy commit shown bottom right on the front page
// Previous: v3.8.0 - Fixed Forum to go to /community (not /community-hub)
// Date: 2026-10-10

'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { CalendarDays, MessageSquare, BookOpen, Anchor, Bell, Search, Download } from 'lucide-react';
import { useUser } from '@/components/AuthProvider';

interface FooterProps {
  activeTab?: string;
}

export default function Footer({ activeTab = '' }: FooterProps) {
  const { user } = useUser();
  
  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Detect if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    
    setDeferredPrompt(null);
    setCanInstall(false);
  };

  // Build tabs array - hide forum for banned users
  const tabs = [
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
    { id: 'ferry', label: 'Ferry', icon: Anchor },
    // Only show forum if user is not banned
    ...(user?.is_banned ? [] : [{ id: 'forum', label: 'Forum', icon: MessageSquare }]),
    { id: 'directory', label: 'Directory', icon: BookOpen },
    { id: 'alerts', label: 'Alerts', icon: Bell, isSpecial: true }, // Navigate to /alerts page
    { id: 'search', label: 'Search', icon: Search, isSpecial: true }, // Special handling for search
  ];

  // Context-aware search URL based on current tab
  const getSearchUrl = () => {
    switch (activeTab) {
      case 'forum':
        return '/community/search'; // Forum advanced search
      case 'calendar':
        return '/search?scope=events'; // Events search
      case 'directory':
        return '/search?scope=directory'; // Directory search
      case 'ferry':
        return '/search?scope=ferry'; // Ferry search
      case 'alerts':
        return '/search?scope=alerts'; // Alerts search
      default:
        return '/search'; // General search (all)
    }
  };

  return (
    <footer>
      {/* Bottom Navigation Bar */}
      <nav
        aria-label="Main"
        className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-[#E3DCCF] shadow-[0_-2px_10px_rgba(0,0,0,0.06)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex justify-around items-center h-16 max-w-screen-xl mx-auto px-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            // Determine the route for each tab
            let href = '/';
            if (tab.id === 'calendar') href = '/calendar';
            else if (tab.id === 'forum') href = '/community';
            else if (tab.id === 'ferry') href = '/ferry';
            else if (tab.id === 'directory') href = '/directory';
            else if (tab.id === 'alerts') href = '/alerts';
            else if (tab.id === 'search') href = getSearchUrl();
            
            // All tabs use Link components with dedicated routes
            return (
              <Link
                key={tab.id}
                href={href}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-all ${
                  isActive ? 'text-gabriola-green' : 'text-[#3A4640] hover:text-gabriola-green'
                }`}
              >
                <div className={`px-3 py-1 rounded-xl transition-all ${isActive ? 'bg-gabriola-green/10' : ''}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className={`text-[11px] md:text-xs mt-0.5 font-medium ${isActive ? 'font-bold' : ''}`}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer Links */}
      <div
        className="bg-gabriola-green-dark text-white pt-4 text-center text-xs"
        style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
      >
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
            <span className="relative inline-block group">
              <button className="hover:underline cursor-help">
                Privacy
              </button>
              <span className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-50 shadow-lg">
                This site uses analytics to help improve our community platform. No personal information is collected.
                <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></span>
              </span>
            </span>{' '}
            •{' '}
            <Link href="/strachan" className="hover:underline">
              About
            </Link>
            {canInstall && !isInstalled && (
              <>
                {' '}•{' '}
                <button
                  onClick={handleInstallClick}
                  className="hover:underline inline-flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  Add Quick Access
                </button>
              </>
            )}
          </p>
          {activeTab === 'landing' && process.env.NEXT_PUBLIC_APP_VERSION && (
            <p className="text-right text-[10px] opacity-50 mt-1">
              v{process.env.NEXT_PUBLIC_APP_VERSION}
              {process.env.NEXT_PUBLIC_BUILD_ID && ` · ${process.env.NEXT_PUBLIC_BUILD_ID}`}
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}
