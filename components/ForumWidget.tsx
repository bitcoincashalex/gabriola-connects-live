// components/ForumWidget.tsx
// Shows active discussion count and latest topic - REDESIGNED
// Version: 5.0.0 - Changed to "Community" with modal popup
// Date: 2024-12-13

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { MessageSquare } from 'lucide-react';
import CommunityModal from '@/components/CommunityModal';

interface LatestPost {
  id: string;
  title: string;
  created_at: string;
}

export function ForumWidget() {
  const [activeCount, setActiveCount] = useState(0);
  const [latestPost, setLatestPost] = useState<LatestPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const loadStats = async () => {
      try {
        // Call public function (works for anon users too)
        const { data, error } = await supabase.rpc('get_forum_stats');

        if (error) {
          console.error('Error loading forum stats:', error);
          return;
        }

        if (data) {
          setActiveCount(data.activeCount || 0);
          setLatestPost(data.latestPost || null);
        }
      } catch (error) {
        console.error('Error loading forum stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();

    // Refresh every minute
    const interval = setInterval(loadStats, 60000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="text-white/70 text-sm">
        Loading...
      </div>
    );
  }

  // Truncate title if too long
  const displayTitle = latestPost && latestPost.title.length > 40
    ? latestPost.title.substring(0, 37) + '...'
    : latestPost?.title;

  return (
    <>
      <button 
        onClick={() => setShowModal(true)}
        className="w-full text-left space-y-3 hover:opacity-90 transition-opacity"
      >
        {/* Big Icon LEFT + Big Title RIGHT - Like Alerts */}
        <div className="flex items-center gap-4">
          {/* Big Icon in Circle */}
          <div className="p-4 bg-white/20 rounded-full flex-shrink-0">
            <MessageSquare className="w-10 h-10 text-white" />
          </div>
          
          {/* Big Title */}
          <h3 className="text-3xl font-bold text-white">
            Community
          </h3>
        </div>
        
        {/* Subtitle - Changed from description */}
        <div className="text-sm text-white/90 font-medium">
          Discussion Emergency Map News
        </div>
        
        {/* Active Count - Medium Size */}
        <div className="text-lg font-semibold text-white">
          {activeCount} active {activeCount === 1 ? 'discussion' : 'discussions'}
        </div>
        
        {/* Latest Thread - Readable Size */}
        {latestPost && (
          <div className="text-base font-medium text-white/90 line-clamp-2">
            Latest: {displayTitle}
          </div>
        )}
      </button>

      {/* Community Hub Modal */}
      <CommunityModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
      />
    </>
  );
}

