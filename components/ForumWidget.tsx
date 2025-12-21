// components/ForumWidget.tsx
// Shows active discussion count and latest topic - REDESIGNED
// Version: 5.2.1 - Fixed text cutoff on desktop (icon+title+descriptions all shifted left)
// Date: 2025-12-20

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { MessageSquare } from 'lucide-react';

interface LatestPost {
  id: string;
  title: string;
  created_at: string;
}

export function ForumWidget() {
  const [activeCount, setActiveCount] = useState(0);
  const [latestPost, setLatestPost] = useState<LatestPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    <div className="space-y-3">
      {/* Big Icon LEFT + Big Title RIGHT - Like Alerts */}
      <div className="flex items-center gap-3">
        {/* Big Icon in Circle - reduced padding from p-4 to p-3 */}
        <div className="p-3 bg-white/20 rounded-full flex-shrink-0">
          <MessageSquare className="w-9 h-9 text-white" />
        </div>
        
        {/* Big Title */}
        <h3 className="text-3xl font-bold text-white">
          Community
        </h3>
      </div>
      
      {/* Subtitle - shifted left to prevent text cutoff */}
      <div className="text-sm text-white/90 font-medium -ml-1">
        Forum*Emergency*Map*News*Volunteer
      </div>
      
      {/* Active Count - Medium Size, shifted left */}
      <div className="text-lg font-semibold text-white -ml-1">
        {activeCount} active {activeCount === 1 ? 'discussion' : 'discussions'}
      </div>
      
      {/* Latest Thread - Readable Size, shifted left */}
      {latestPost && (
        <div className="text-base font-medium text-white/90 line-clamp-2 -ml-1">
          Latest: {displayTitle}
        </div>
      )}
    </div>
  );
}

