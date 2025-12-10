// components/LandingPage.tsx
// v2.1.0 - Added community stats counters (residents, members, events, businesses)
// Date: 2024-12-10
'use client';

import Link from 'next/link';
import { Calendar, MessageSquare, Book, Anchor, Bell, AlertTriangle, Users, UserCheck, CalendarDays, Building2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

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
    const { count, error } = await supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);

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
      color: 'from-gabriola-sage to-green-700',
      textColor: 'text-white',
    },
    {
      id: 'ferry',
      title: 'Ferry',
      description: 'BC Ferries schedules & info',
      icon: Anchor,
      color: 'from-gabriola-ocean to-blue-800',
      textColor: 'text-white',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 pt-20 pb-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-3 bg-gabriola-green/10 px-6 py-3 rounded-full mb-6 border border-gabriola-green/20">
            <span className="text-2xl">🏝️</span>
            <span className="font-semibold text-gabriola-green-dark">Serving Gabriola Island, BC</span>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-extrabold mb-6 bg-gradient-to-r from-gabriola-green via-gabriola-ocean to-gabriola-green bg-clip-text text-transparent leading-tight">
            Gabriola Connects
          </h1>
          
          <p className="text-2xl text-gray-700 max-w-3xl mx-auto font-light leading-relaxed">
            Your hub for island events, community discussions, local businesses, and ferry schedules
          </p>

          {/* Active Alerts Badge */}
          {activeAlertCount > 0 && (
            <div className="mt-8 inline-flex items-center gap-3 bg-orange-100 border-2 border-orange-400 px-6 py-3 rounded-xl shadow-lg animate-pulse">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
              <span className="font-bold text-orange-800">
                {activeAlertCount} Active Community {activeAlertCount === 1 ? 'Alert' : 'Alerts'}
              </span>
            </div>
          )}
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
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
                  relative overflow-hidden rounded-2xl shadow-xl 
                  transition-all duration-300 transform
                  ${isHovered ? 'scale-105 shadow-2xl' : 'scale-100'}
                `}
              >
                <div className={`bg-gradient-to-br ${card.color} p-8 h-full`}>
                  <div className={`${card.textColor} transition-transform duration-300 ${isHovered ? 'translate-y-[-4px]' : ''}`}>
                    <Icon className="w-12 h-12 mb-4" strokeWidth={2} />
                    <h3 className="text-2xl font-bold mb-2">{card.title}</h3>
                    <p className="text-white/90 text-sm">{card.description}</p>
                  </div>
                  
                  {/* Hover overlay */}
                  <div className={`
                    absolute inset-0 bg-white/10 backdrop-blur-sm
                    transition-opacity duration-300
                    ${isHovered ? 'opacity-100' : 'opacity-0'}
                  `} />
                </div>
              </button>
            );
          })}
        </div>

        {/* About Section */}
        <div className="max-w-4xl mx-auto text-center mb-12 bg-white/60 backdrop-blur rounded-2xl p-10 shadow-lg border border-white/80">
          <h2 className="text-3xl font-bold text-gabriola-green-dark mb-6">Welcome to Our Island Community</h2>
          <p className="text-lg text-gray-700 leading-relaxed mb-6">
            Gabriola Connects brings together our island's 4,500 residents with tools to stay informed, 
            discover events, support local businesses, and connect with neighbours. Built by islanders, 
            for islanders.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gabriola-green" />
              <span>Community Calendar</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-gabriola-ocean" />
              <span>Discussion Forum</span>
            </div>
            <div className="flex items-center gap-2">
              <Book className="w-4 h-4 text-gabriola-sage" />
              <span>Business Directory</span>
            </div>
            <div className="flex items-center gap-2">
              <Anchor className="w-4 h-4 text-gabriola-ocean" />
              <span>Ferry Schedules</span>
            </div>
          </div>
        </div>

        {/* Share Button */}
        <div className="text-center mb-8">
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: 'Gabriola Connects',
                  text: 'Check out Gabriola Connects - our island community hub!',
                  url: window.location.href
                });
              } else {
                navigator.clipboard.writeText(window.location.href);
                alert('Link copied to clipboard!');
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

        {/* Community Stats - NEW! */}
        {!statsLoading && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-gray-50 to-green-50/30 rounded-xl p-6 border border-gray-200/50 shadow-sm">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {/* Verified Residents */}
                <div className="text-center">
                  <div className="flex justify-center mb-2">
                    <UserCheck className="w-5 h-5 text-gabriola-green" />
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
                  <div className="flex justify-center mb-2">
                    <Users className="w-5 h-5 text-gabriola-ocean" />
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
                  <div className="flex justify-center mb-2">
                    <CalendarDays className="w-5 h-5 text-purple-600" />
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
                  <div className="flex justify-center mb-2">
                    <Building2 className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="text-2xl font-bold text-amber-600 mb-1">
                    {stats.businesses.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600 font-medium">
                    Local Businesses
                  </div>
                </div>
              </div>

              {/* Subtle tagline */}
              <div className="text-center mt-4 pt-4 border-t border-gray-200/50">
                <p className="text-xs text-gray-500 italic">
                  Growing together as a community
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
