// components/LandingPage.tsx
// v2.9.0 - Added AlertsWidget to show top alert summary in banner
// Date: 2025-12-11
'use client';

import Link from 'next/link';
import { Calendar, MessageSquare, Book, Anchor, Bell, AlertTriangle, Users, UserCheck, CalendarDays, Building2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { NextFerryWidget } from '@/components/NextFerryWidget';
import { NextEventWidget } from '@/components/NextEventWidget';
import { DirectoryWidget } from '@/components/DirectoryWidget';
import { ForumWidget } from '@/components/ForumWidget';
import { AlertsWidget } from '@/components/AlertsWidget';

interface LandingPageProps {
  onNavigate: (tab: string) => void;
}

export default function LandingPage({ onNavigate }: LandingPageProps) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [activeAlertCount, setActiveAlertCount] = useState<number>(0);
  
  // Community stats
  const [stats, setStats] = useState({
    residents: 0,
    totalMembers: 0,
    upcomingEvents: 0,
    businesses: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Fetch active alert count
  useEffect(() => {
    fetchActiveAlertCount();
    fetchCommunityStats();
  }, []);

  const fetchActiveAlertCount = async () => {
    // FIXED: Added expires_at filter to match AlertsManager and EmergencyAlertBanner
    const { count, error } = await supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .eq('active', true)
      .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`);  // FIXED: Filter expired

    if (!error && count !== null) {
      setActiveAlertCount(count);
    }
  };

  const fetchCommunityStats = async () => {
    try {
      // Count verified residents
      const { count: residentCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('is_resident', true);

      // Count total members
      const { count: memberCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Count upcoming events (future events only)
      const today = new Date().toISOString().split('T')[0];
      const { count: eventCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('is_approved', true)
        .gte('start_date', today);

      // Count businesses in directory
      const { count: businessCount } = await supabase
        .from('directory_businesses')
        .select('*', { count: 'exact', head: true });

      setStats({
        residents: residentCount || 0,
        totalMembers: memberCount || 0,
        upcomingEvents: eventCount || 0,
        businesses: businessCount || 0,
      });
      setStatsLoading(false);
    } catch (error) {
      console.error('Error fetching community stats:', error);
      setStatsLoading(false);
    }
  };

  const cards = [
    {
      id: 'calendar',
      title: 'Calendar',
      description: 'Island events & activities',
      icon: Calendar,
      color: 'from-gabriola-green to-gabriola-green-dark',
      textColor: 'text-white',
    },
    {
      id: 'forum',
      title: 'Forum',
      description: 'Real conversations. Real neighbours.',
      icon: MessageSquare,
      color: 'from-gabriola-ocean to-blue-700',
      textColor: 'text-white',
    },
    {
      id: 'directory',
      title: 'Directory',
      description: 'Local businesses & services',
      icon: Book,
      color: 'from-purple-500 to-purple-700',
      textColor: 'text-white',
    },
    {
      id: 'ferry',
      title: 'Ferry',
      description: 'Schedule & real-time status',
      icon: Anchor,
      color: 'from-teal-500 to-teal-700',
      textColor: 'text-white',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gabriola-sand/30 via-white to-gabriola-green/10">
      {/* Header with Flag as Main Background */}
      <div className="relative py-12 px-6 shadow-lg overflow-hidden">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/gabriola-flag.gif)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
        <div className="absolute inset-0 bg-black/30" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="text-5xl font-display font-bold mb-3 text-white" style={{
            textShadow: '2px 2px 8px rgba(0,0,0,0.8), -1px -1px 4px rgba(0,0,0,0.6)'
          }}>
            Gabriola Connects
          </h1>
          <p className="text-xl text-white mb-4" style={{
            textShadow: '1px 1px 6px rgba(0,0,0,0.8), -1px -1px 3px rgba(0,0,0,0.6)'
          }}>
            Your Island Community Hub
          </p>

          {/* Quick Navigation Icons */}
          <div className="flex justify-center items-center gap-3 sm:gap-5 mt-4">
            <button
              onClick={() => onNavigate('calendar')}
              className="flex items-center gap-1.5 text-white hover:scale-110 transition-transform group"
            >
              <span className="text-lg sm:text-xl">📅</span>
              <span className="text-xs sm:text-sm font-medium whitespace-nowrap" style={{
                textShadow: '1px 1px 3px rgba(0,0,0,0.8)'
              }}>Events</span>
            </button>

            <button
              onClick={() => onNavigate('forum')}
              className="flex items-center gap-1.5 text-white hover:scale-110 transition-transform group"
            >
              <span className="text-lg sm:text-xl">💬</span>
              <span className="text-xs sm:text-sm font-medium whitespace-nowrap" style={{
                textShadow: '1px 1px 3px rgba(0,0,0,0.8)'
              }}>Forum</span>
            </button>

            <button
              onClick={() => onNavigate('directory')}
              className="flex items-center gap-1.5 text-white hover:scale-110 transition-transform group"
            >
              <span className="text-lg sm:text-xl">📖</span>
              <span className="text-xs sm:text-sm font-medium whitespace-nowrap" style={{
                textShadow: '1px 1px 3px rgba(0,0,0,0.8)'
              }}>Directory</span>
            </button>

            <button
              onClick={() => onNavigate('ferry')}
              className="flex items-center gap-1.5 text-white hover:scale-110 transition-transform group"
            >
              <span className="text-lg sm:text-xl">⛴️</span>
              <span className="text-xs sm:text-sm font-medium whitespace-nowrap" style={{
                textShadow: '1px 1px 3px rgba(0,0,0,0.8)'
              }}>Ferry</span>
            </button>

            <button
              onClick={() => window.location.href = '/alerts'}
              className="flex items-center gap-1.5 text-white hover:scale-110 transition-transform group"
            >
              <span className="text-lg sm:text-xl">🔔</span>
              <span className="text-xs sm:text-sm font-medium whitespace-nowrap" style={{
                textShadow: '1px 1px 3px rgba(0,0,0,0.8)'
              }}>Alerts</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Cards Grid */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {cards.map((card) => {
            const Icon = card.icon;
            const isHovered = hoveredCard === card.id;

            return (
              <button
                key={card.id}
                onClick={() => onNavigate(card.id)}
                onMouseEnter={() => setHoveredCard(card.id)}
                onMouseLeave={() => setHoveredCard(null)}
                className={`
                  relative overflow-hidden
                  bg-gradient-to-br ${card.color}
                  rounded-3xl p-8
                  shadow-xl hover:shadow-2xl
                  transform transition-all duration-300
                  ${isHovered ? 'scale-105 -translate-y-2' : 'scale-100'}
                  cursor-pointer
                  group
                `}
              >
                <div className={`relative z-10 ${card.textColor}`}>
                  <div className="mb-4 transform transition-transform duration-300 group-hover:scale-110">
                    <Icon className="w-12 h-12" />
                  </div>

                  <h3 className="text-2xl font-bold mb-2">
                    {card.title}
                  </h3>

                  <p className="text-sm opacity-90 mb-4">
                    {card.description}
                  </p>

                  {/* Add widgets for each card */}
                  {card.id === 'calendar' && (
                    <div className="mt-3 pt-3 border-t border-white/30">
                      <NextEventWidget />
                    </div>
                  )}
                  
                  {card.id === 'forum' && (
                    <div className="mt-3 pt-3 border-t border-white/30">
                      <ForumWidget />
                    </div>
                  )}
                  
                  {card.id === 'directory' && (
                    <div className="mt-3 pt-3 border-t border-white/30">
                      <DirectoryWidget />
                    </div>
                  )}
                  
                  {card.id === 'ferry' && (
                    <div className="mt-3 pt-3 border-t border-white/30">
                      <NextFerryWidget />
                    </div>
                  )}
                </div>

                <div className={`
                  absolute -bottom-12 -right-12 w-48 h-48 
                  rounded-full bg-white/10
                  transform transition-transform duration-500
                  ${isHovered ? 'scale-150' : 'scale-100'}
                `} />
              </button>
            );
          })}
        </div>

        {/* Community Alerts Banner with AlertsWidget */}
        <button
          onClick={() => window.location.href = '/alerts'}
          className="w-full max-w-5xl mx-auto bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-[1.02] cursor-pointer group"
        >
          <div className="flex items-center justify-between p-8">
            <div className="flex items-center gap-6 flex-1">
              {/* Bell Icon with Badge */}
              <div className="relative flex-shrink-0">
                <div className="p-4 bg-white/20 rounded-full group-hover:scale-110 transition-transform">
                  <Bell className="w-10 h-10" />
                </div>
                {/* Alert Count Badge */}
                {activeAlertCount > 0 && (
                  <div className="absolute -top-2 -right-2 bg-red-600 text-white text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center animate-pulse">
                    {activeAlertCount}
                  </div>
                )}
              </div>

              {/* AlertsWidget - Shows alert summary */}
              <div className="text-left flex-1">
                <h3 className="text-3xl font-bold mb-3">Community Alerts</h3>
                <AlertsWidget />
              </div>
            </div>

            {/* Arrow */}
            <div className="text-4xl group-hover:translate-x-2 transition-transform flex-shrink-0">
              →
            </div>
          </div>
        </button>

        {/* About Section */}
        <div className="mt-12 bg-white/80 backdrop-blur rounded-2xl p-10 shadow-lg border border-white/60">
          <h2 className="text-3xl font-bold text-gabriola-green-dark mb-6 text-center">
            Welcome to Your Island Community
          </h2>
          <p className="text-lg text-gray-700 mb-6 text-center leading-relaxed max-w-3xl mx-auto">
            Gabriola Connects is built by islanders, for islanders. Discover events, join discussions, 
            support local businesses, and stay connected with our community of 4,500 residents.
          </p>
          <p className="text-gray-500 text-xs text-center">
            Brought to you by the{' '}
            <a 
              href="https://gabriolaconnects.ca/strachan" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gabriola-green hover:text-gabriola-green-dark underline font-medium transition-colors"
            >
              Strachan family
            </a>
          </p>
        </div>

        {/* Share Section */}
        <div className="text-center mt-12">
          <button
            onClick={() => {
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
            }}
            className="inline-block bg-gradient-to-r from-gabriola-green to-gabriola-green-light text-white rounded-xl px-8 py-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <div className="text-left">
                <div className="font-semibold">Share this website with your Gabriola friends and family</div>
                <div className="text-sm text-white/80">Mobile app coming soon</div>
              </div>
            </div>
          </button>
        </div>

        {/* Community Stats */}
        {!statsLoading && (
          <div className="mt-8">
            <div className="bg-gradient-to-r from-gray-50 to-green-50/30 rounded-xl p-5 border border-gray-200/50 shadow-sm">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Verified Residents */}
                <div className="text-center">
                  <div className="flex justify-center mb-1.5">
                    <UserCheck className="w-4 h-4 text-gabriola-green" />
                  </div>
                  <div className="text-2xl font-bold text-gabriola-green mb-1">
                    {stats.residents.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600 font-medium">
                    Island Residents
                  </div>
                </div>

                {/* Total Members */}
                <div className="text-center">
                  <div className="flex justify-center mb-1.5">
                    <Users className="w-4 h-4 text-gabriola-ocean" />
                  </div>
                  <div className="text-2xl font-bold text-gabriola-ocean mb-1">
                    {stats.totalMembers.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600 font-medium">
                    Community Members
                  </div>
                </div>

                {/* Upcoming Events */}
                <div className="text-center">
                  <div className="flex justify-center mb-1.5">
                    <CalendarDays className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="text-2xl font-bold text-purple-600 mb-1">
                    {stats.upcomingEvents.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600 font-medium">
                    Upcoming Events
                  </div>
                </div>

                {/* Local Businesses */}
                <div className="text-center">
                  <div className="flex justify-center mb-1.5">
                    <Building2 className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-2xl font-bold text-amber-600 mb-1">
                    {stats.businesses.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600 font-medium">
                    Local Businesses
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
