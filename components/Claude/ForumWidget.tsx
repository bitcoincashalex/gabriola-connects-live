// components/ForumWidget.tsx
// Shows active discussion count and latest topic
// Version: 1.0.0
// Date: 2025-12-11

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

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
      <div className="text-xs text-white/70">
        Loading...
      </div>
    );
  }

  // Truncate title if too long
  const displayTitle = latestPost && latestPost.title.length > 30
    ? latestPost.title.substring(0, 27) + '...'
    : latestPost?.title;

  return (
    <div className="text-xs space-y-1">
      <div className="text-white font-semibold">
        {activeCount} active {activeCount === 1 ? 'discussion' : 'discussions'}
      </div>
      {latestPost && (
        <div className="text-white/90">
          Latest: {displayTitle}
        </div>
      )}
    </div>
  );
}
