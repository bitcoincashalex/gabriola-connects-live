// app/page.tsx — FINAL, WORKING WITH REAL AUTH
'use client';

import { useState } from 'react';
import LandingPage from '@/components/LandingPage';
import Calendar from '@/components/Calendar';
import BBS from '@/components/BBS';
import Directory from '@/components/Directory';
import Ferry from '@/components/Ferry';
import { useUser } from '@/components/AuthProvider';
import { Search, CalendarDays, MessageSquare, BookOpen, Anchor } from 'lucide-react';

type Tab = 'landing' | 'calendar' | 'forum' | 'directory' | 'ferry' | 'search';

export default function HomePage() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<Tab>('landing');

  const handleNavigateFromLanding = (tab: string) => {
    setActiveTab(tab as Tab);
  };

  const tabs = [
    { id: 'calendar' as Tab, label: 'Calendar', icon: CalendarDays },
    { id: 'forum' as Tab, label: 'Forum', icon: MessageSquare },
    { id: 'directory' as Tab, label: 'Directory', icon: BookOpen },
    { id: 'search' as Tab, label: 'Search', icon: Search },
    { id: 'ferry' as Tab, label: 'Ferry', icon: Anchor },
  ];

  if (activeTab === 'landing') {
    return <LandingPage onNavigate={handleNavigateFromLanding} />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gabriola-sand/10">
      <main className="flex-1 overflow-auto">
        {activeTab === 'calendar' && <Calendar events={[]} />}
        {activeTab === 'forum' && <BBS />}
        {activeTab === 'directory' && <Directory />}
        {activeTab === 'ferry' && <Ferry />}
        {activeTab === 'search' && (
          <div className="max-w-2xl mx-auto px-6 py-20 text-center">
            <h1 className="text-4xl font-bold text-gabriola-green mb-12">Search Coming Soon</h1>
          </div>
        )}
      </main>

      <nav className="bg-white border-t-2 border-gabriola-green/20 shadow-lg">
        <div className="flex justify-around items-center h-20 max-w-screen-xl mx-auto px-4">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
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
    </div>
  );
}