// app/page.tsx — FINAL, NO ERRORS, WORKS ON VERCEL
'use client';

import { useState, useEffect } from 'react';
import { User } from '@/lib/types';
import { getCurrentUser } from '@/lib/auth-utils';
import AuthModal from '@/components/AuthModal';
import LandingPage from '@/components/LandingPage';
import Calendar from '@/components/Calendar';
import BBS from '@/components/BBS';
import Directory from '@/components/Directory';
import Ferry from '@/components/Ferry';
import EmergencyAlert from '@/components/EmergencyAlert';
import { Search, CalendarDays, MessageSquare, BookOpen, Anchor, AlertTriangle, Home } from 'lucide-react';

import { 
  getMockEvents, 
  getMockDirectory, 
  getMockFerryStatus, 
  getMockPosts,
  addMockPost,
  getEmergencyAlert,
  dismissEmergencyAlert 
} from '@/lib/data';

import { Event, BBSPost, DirectoryListing, FerryStatus, EmergencyAlert as EmergencyAlertType } from '@/lib/types';

type Tab = 'landing' | 'calendar' | 'forum' | 'directory' | 'ferry' | 'search';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<Tab>('landing');
  const [events, setEvents] = useState<Event[]>([]);
  const [posts, setPosts] = useState<BBSPost[]>([]);
  const [listings, setListings] = useState<DirectoryListing[]>([]);
  const [emergencyAlert, setEmergencyAlert] = useState<EmergencyAlertType | null>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'signin' | 'signup'>('signin');

  useEffect(() => {
    setEvents(getMockEvents());
    setPosts(getMockPosts());
    setListings(getMockDirectory());
    setEmergencyAlert(getEmergencyAlert());

    getCurrentUser().then(user => {
      if (user) setCurrentUser(user);
    });

    const eventInterval = setInterval(() => setEvents(getMockEvents()), 3600000);
    const alertInterval = setInterval(() => setEmergencyAlert(getEmergencyAlert()), 30000);

    return () => {
      clearInterval(eventInterval);
      clearInterval(alertInterval);
    };
  }, []);

  const handleDismissAlert = () => {
    dismissEmergencyAlert();
    setEmergencyAlert(null);
  };

  const handleNavigateFromLanding = (tab: string) => {
    setActiveTab(tab as Tab);
  };

  const handleSignInClick = (mode: 'signin' | 'signup' = 'signin') => {
    setAuthInitialMode(mode);
    setShowAuthModal(true);
  };

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    setShowAuthModal(false);
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
    <div className="flex flex-col h-screen bg-gabriola-sand/10">
      
      <main className="flex-1 overflow-auto">
        <div className="h-full">
          {activeTab === 'calendar' && <Calendar events={events || []} />}
          {activeTab === 'forum' && <BBS />}
          {activeTab === 'directory' && <Directory />}
          {activeTab === 'ferry' && <Ferry />}   {/* ← NO PROPS */}
          {activeTab === 'search' && (
            <div className="max-w-2xl mx-auto px-6 py-20">
              <h1 className="text-4xl font-bold text-gabriola-green text-center mb-12">
                Search Gabriola Connects
              </h1>
              <form action="/search" className="mb-8">
                <input
                  name="q"
                  type="text"
                  placeholder="Search events, posts, businesses, people..."
                  className="w-full p-5 border-2 border-gabriola-green/30 rounded-xl text-lg focus:outline-none focus:border-gabriola-green"
                  autoFocus
                />
              </form>
              <p className="text-center text-gray-600">
                Type at least 2 characters and press Enter
              </p>
            </div>
          )}
        </div>
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

      <EmergencyAlert alert={emergencyAlert} onDismiss={handleDismissAlert} />

      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
          initialMode={authInitialMode}
        />
      )}
    </div>
  );
}