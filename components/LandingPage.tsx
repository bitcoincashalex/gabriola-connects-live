// components/LandingPage.tsx — FINAL, "Forum" EVERYWHERE
'use client';

import Link from 'next/link';
import { Calendar, MessageSquare, Book, Anchor, Bell, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import EmergencyBanner from './EmergencyBanner';

interface LandingPageProps {
  onNavigate: (tab: string) => void;
}

export default function LandingPage({ onNavigate }: LandingPageProps) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

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
      id: 'forum',                                   // ← CHANGED from 'bbs'
      title: 'Forum',                                // ← CHANGED from 'BBS'
      description: 'Real conversations. Real neighbours.', // ← Updated
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
          <p className="text-xl text-white mb-2" style={{
            textShadow: '1px 1px 6px rgba(0,0,0,0.8), -1px -1px 3px rgba(0,0,0,0.6)'
          }}>
            Your Island Community Hub
          </p>
<EmergencyBanner />          
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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
                  relative overflow-hidden rounded-2xl shadow-lg
                  transform transition-all duration-300 ease-out
                  ${isHovered ? 'scale-105 shadow-2xl' : 'scale-100'}
                  bg-gradient-to-br ${card.color}
                  p-8 text-left
                  hover:ring-4 hover:ring-white/50
                `}
              >
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`
                      p-4 rounded-xl bg-white/20 backdrop-blur-sm
                      transform transition-transform duration-300
                      ${isHovered ? 'scale-110 rotate-3' : 'scale-100'}
                    `}>
                      <Icon className={`w-8 h-8 ${card.textColor}`} />
                    </div>
                    <div className={`
                      text-3xl transition-transform duration-300
                      ${isHovered ? 'translate-x-1' : 'translate-x-0'}
                    `}>
                      →
                    </div>
                  </div>
                  
                  <h3 className={`text-3xl font-bold ${card.textColor} mb-2`}>
                    {card.title}
                  </h3>
                  <p className={`${card.textColor} opacity-90 text-lg`}>
                    {card.description}
                  </p>
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

        {/* Community Alerts Banner */}
     
	 {/* Community Alerts Banner — place this wherever you want it on the landing page */}
<button
  onClick={() => window.location.href = '/alerts'}   // or router.push('/alerts') if using Next.js router
  className="w-full max-w-5xl mx-auto bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-[1.02] cursor-pointer group"
>
  <div className="flex items-center justify-between p-8">
    <div className="flex items-center gap-6">
      {/* Bell Icon */}
      <div className="p-4 bg-white/20 rounded-full group-hover:scale-110 transition-transform">
        <Bell className="w-10 h-10" />
      </div>

      {/* Text */}
      <div className="text-left">
        <h3 className="text-3xl font-bold mb-2">Community Alerts</h3>
        <p className="text-lg opacity-90">Stay informed about important island updates</p>
      </div>
    </div>

    {/* Arrow */}
    <div className="text-5xl group-hover:translate-x-4 transition-transform">
      →
    </div>
  </div>
</button>

        {/* Footer Info */}
        <div className="mt-12 text-center">
          <div className="inline-block bg-white rounded-xl shadow-md p-6 max-w-2xl">
            <h4 className="font-semibold text-gabriola-green-dark mb-3 text-lg">
              Welcome to Gabriola Island Connects
            </h4>
            <p className="text-gray-600 text-sm leading-relaxed">
              Your one-stop hub for everything happening on our beautiful island. 
              Discover events, connect with neighbors, find local businesses, 
              check ferry times, and stay updated on community alerts.
            </p>
            <p className="text-gray-500 text-xs mt-3">
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
        </div>

        {/* Share Button */}
        <div className="mt-6 text-center">
          <button
            onClick={(e) => {
              e.preventDefault();
              if (navigator.share) {
                navigator.share({
                  title: 'Gabriola Connects',
                  text: 'Your Island Community Hub for events, discussions, local businesses, and ferry schedules!',
                  url: 'https://gabriolaconnects.ca'
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
                <div className="text-sm text-white!80">Mobile app coming soon</div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}