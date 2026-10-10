// components/LandingPage.tsx
// v6.0.0 - Front page redesign: full Gabriola flag on a navy band (no grey wash, no crop) in place
//          of the emoji links; white cards with small icons in place of the five gradients; alert
//          card only turns colour when an alert is active; stats relabelled "Registered residents"
//          and "Total registrations"; solid green share button.
// Previous: v5.0.2 - About text: added "ferry times"
// Previous: v5.0.1 - Fixed Firefox z-index bug (card background covering widget content)
// Date: 2026-10-10
'use client';

import Link from 'next/link';
import { Calendar, MessageSquare, Book, Anchor } from 'lucide-react';
import { useState, useEffect } from 'react';
import { NextFerryWidget } from '@/components/NextFerryWidget';
import { NextEventWidget } from '@/components/NextEventWidget';
import { DirectoryWidget } from '@/components/DirectoryWidget';
import { ForumWidget } from '@/components/ForumWidget';
import { AlertsWidget } from '@/components/AlertsWidget';
import { HomeCard } from '@/components/HomeCard';

interface LandingPageProps {
  // No props needed - all navigation uses direct routes
}

// Share & Install Section Component
function ShareAndInstallSection() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => console.log('Service Worker registered'))
        .catch((error) => console.error('SW registration failed:', error));
    }

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // Detect if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for install prompt (Android/Desktop Chrome)
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Check if user previously dismissed
      const dismissed = sessionStorage.getItem('pwa-install-dismissed');
      if (!dismissed) {
        setShowInstallButton(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Gabriola Connects',
        text: 'Check out Gabriola Connects — our island community hub!',
        url: 'https://gabriolaconnects.ca',
      }).catch((error) => {
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      });
    } else {
      navigator.clipboard.writeText('https://gabriolaconnects.ca').then(() => {
        alert('Link copied to clipboard! Share it with your friends and family.');
      });
    }
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted install');
      setIsInstalled(true);
    }
    
    setDeferredPrompt(null);
    setShowInstallButton(false);
  };

  const handleDismissInstall = () => {
    setShowInstallButton(false);
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  };

  return (
    <div className="text-center mt-6">
      <div className="inline-block w-full sm:w-auto bg-gabriola-green text-white rounded-2xl shadow-sm hover:bg-gabriola-green-dark transition-colors">
        
        {/* SHARE BUTTON */}
        <button
          onClick={handleShare}
          className="w-full px-6 py-4 min-h-[48px]"
        >
          <div className="flex items-center justify-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <div className="text-left">
              <div className="font-semibold">Share this website with your Gabriola friends and family</div>
            </div>
          </div>
        </button>

        {/* DIVIDER - Only show if install is available */}
        {(showInstallButton || (isIOS && !isInstalled)) && (
          <div className="mx-8 border-t border-white/30" />
        )}

        {/* INSTALL BUTTON - Android/Desktop Chrome */}
        {showInstallButton && !isInstalled && (
          <div className="px-8 py-4">
            <button
              onClick={handleInstall}
              className="w-full flex items-center gap-3"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <div className="text-left flex-1">
                <div className="font-semibold">Add Shortcut</div>
                <div className="text-sm text-white/80">Quick access from your home screen</div>
              </div>
            </button>
            <button
              onClick={handleDismissInstall}
              className="text-xs text-white/60 hover:text-white/80 mt-2 underline"
            >
              Not now
            </button>
          </div>
        )}

        {/* iOS INSTRUCTIONS */}
        {isIOS && !isInstalled && (
          <div className="px-8 py-4">
            <button
              onClick={() => setShowIOSInstructions(!showIOSInstructions)}
              className="w-full flex items-center gap-3"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <div className="text-left flex-1">
                <div className="font-semibold">Install on iPhone/iPad</div>
                <div className="text-sm text-white/80">Tap to see how</div>
              </div>
            </button>

            {showIOSInstructions && (
              <div className="mt-3 text-left bg-white/10 rounded-lg p-4 text-sm">
                <ol className="space-y-2 list-decimal list-inside">
                  <li>Tap the Share button <span className="inline-block">□↑</span> at the bottom of Safari</li>
                  <li>Scroll down and tap "Add to Home Screen"</li>
                  <li>Tap "Add" in the top right</li>
                  <li>Find the Gabriola Connects icon on your home screen!</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {/* ALREADY INSTALLED MESSAGE */}
        {isInstalled && (
          <div className="px-8 py-4">
            <div className="flex items-center gap-3 text-white/90">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div className="text-left">
                <div className="font-semibold">App Installed!</div>
                <div className="text-sm text-white/80">Thank you for using Gabriola Connects</div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function LandingPage() {
  // Community stats
  const [stats, setStats] = useState({
    residents: 0,
    totalMembers: 0,
    upcomingEvents: 0,
    businesses: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    fetchCommunityStats();
  }, []);

  const fetchCommunityStats = async () => {
    try {
      // Fetch stats from public API (bypasses RLS)
      const response = await fetch('/api/stats');

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();

      setStats({
        residents: data.residents || 0,
        totalMembers: data.totalMembers || 0,
        upcomingEvents: data.upcomingEvents || 0,
        businesses: data.businesses || 0,
      });
      setStatsLoading(false);
    } catch (error) {
      console.error('Error fetching community stats:', error);
      setStatsLoading(false);
    }
  };

  const statTiles = [
    { value: stats.residents, label: 'Registered residents' },
    { value: stats.totalMembers, label: 'Total registrations' },
    { value: stats.upcomingEvents, label: 'Upcoming events' },
    { value: stats.businesses, label: 'Local businesses' },
  ];

  return (
    <div className="min-h-screen bg-[#F6F2EA] text-[#1F2A24]">
      {/* Flag band: the Gabriola Island flag in full, on the flag's own navy */}
      <section className="bg-[#002774] text-white text-center pt-7 md:pt-10">
        <div className="max-w-4xl mx-auto px-6 flex flex-col items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/gabriola-flag.gif"
            alt="Gabriola Island flag"
            width={380}
            height={216}
            className="w-[228px] md:w-[300px] h-auto rounded-md border-[3px] border-white shadow-[0_6px_18px_rgba(0,0,0,0.35)]"
          />
          <div>
            <h1 className="font-display font-bold text-[34px] md:text-5xl leading-tight">Gabriola Connects</h1>
            <p className="text-[17px] md:text-xl text-[#D6DEF0] mt-1">Your Island Community Hub</p>
          </div>
        </div>
        {/* White curve, echoing the island on the flag */}
        <svg viewBox="0 0 390 44" preserveAspectRatio="none" aria-hidden="true" className="block w-full h-8 md:h-14 mt-2">
          <path d="M0 44 L0 30 C 90 4, 210 -6, 390 22 L390 44 Z" fill="#F6F2EA" />
        </svg>
      </section>

      <div className="max-w-5xl mx-auto px-4 md:px-6 pt-2 pb-10">
        {/* Main cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 md:gap-5 items-start">
          <HomeCard href="/calendar" icon={Calendar} title="Calendar" subtitle="Upcoming events">
            <NextEventWidget />
          </HomeCard>

          <HomeCard href="/ferry" icon={Anchor} title="Ferry" subtitle="Schedule & live status" tone="navy">
            <NextFerryWidget />
          </HomeCard>

          <HomeCard href="/community-hub" icon={MessageSquare} title="Community" subtitle="Forum · Emergency · Map · News · Volunteer">
            <ForumWidget />
          </HomeCard>

          <div className="flex flex-col gap-3.5 md:gap-5">
            <HomeCard href="/directory" icon={Book} title="Directory" subtitle={<DirectoryWidget />} />
            <AlertsWidget />
          </div>
        </div>

        {/* About Section */}
        <div className="mt-6 md:mt-10 bg-white rounded-2xl p-6 md:p-10 border border-[#E3DCCF] text-center">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-gabriola-green-dark mb-3">
            Welcome to Your Island Community
          </h2>
          <p className="text-base md:text-lg text-[#3A4640] mb-4 leading-relaxed max-w-3xl mx-auto">
            Gabriola Connects is built by islanders, for islanders. Discover events, ferry times, join discussions, 
            support local businesses, and stay connected with our community of 4,500 residents.
          </p>
          <p className="text-[#5B6660] text-[13px]">
            Brought to you by the{' '}
            <Link 
              href="/strachan" 
              className="text-gabriola-green hover:text-gabriola-green-dark underline font-semibold transition-colors"
            >
              Strachan family
            </Link>
          </p>
        </div>

        {/* Share & Install Section */}
        <ShareAndInstallSection />

        {/* Community Stats */}
        {!statsLoading && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {statTiles.map(tile => (
              <div key={tile.label} className="bg-white border border-[#E3DCCF] rounded-xl p-3.5">
                <div className="text-[26px] font-bold text-gabriola-green-dark leading-tight">
                  {tile.value.toLocaleString()}
                </div>
                <div className="text-[13px] text-[#5B6660]">{tile.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
