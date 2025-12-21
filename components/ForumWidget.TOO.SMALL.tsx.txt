// components/ForumWidget.tsx
// Shows active discussion count and latest topic - REDESIGNED
// Version: 5.4.0 - ULTRA-FIX for BOTH title and description cutoff
// Date: 2025-12-20

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MessageSquare } from 'lucide-react';
import Link from 'next/link';

export function ForumWidget() {
  const [activeCount, setActiveCount] = useState(0);
  const [latestTopic, setLatestTopic] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForumStats();
    
    // Subscribe to changes
    const channel = supabase
      .channel('forum_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bbs_posts'
      }, () => {
        fetchForumStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchForumStats = async () => {
    try {
      // Get active discussion count
      const { count } = await supabase
        .from('bbs_posts')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .is('deleted_at', null);

      setActiveCount(count || 0);

      // Get latest topic
      const { data: latest } = await supabase
        .from('bbs_posts')
        .select('title')
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (latest) {
        setLatestTopic(latest.title);
      }
    } catch (error) {
      console.error('Error fetching forum stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Link
      href="/community"
      className="group bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 p-6 text-white overflow-hidden relative"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-12 -translate-x-12"></div>
      </div>

      {/* Content */}
      <div className="relative">
        {/* Header - MAXIMUM COMPRESSION */}
        <div className="flex items-center gap-1 mb-2.5">
          {/* Tiny icon */}
          <div className="p-1.5 bg-white/20 rounded-full flex-shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          {/* Smaller title with tighter letter spacing */}
          <h3 className="text-lg font-bold leading-none tracking-tight">Community</h3>
        </div>

        {/* Description - Two lines, very compact */}
        <div className="text-[10px] text-blue-100 mb-3 leading-tight -mt-0.5">
          Forum • Emergency • Map
          <br />
          News • Volunteer
        </div>

        {loading ? (
          <div className="space-y-2">
            <div className="h-6 bg-white/20 rounded animate-pulse"></div>
            <div className="h-4 bg-white/20 rounded w-3/4 animate-pulse"></div>
          </div>
        ) : (
          <>
            {/* Active Discussions */}
            <div className="mb-2">
              <p className="text-2xl sm:text-3xl font-bold">{activeCount} active discussions</p>
            </div>

            {/* Latest Topic */}
            {latestTopic && (
              <div className="pt-2 border-t border-white/20">
                <p className="text-[10px] text-blue-100">Latest:</p>
                <p className="font-medium text-xs sm:text-sm truncate">{latestTopic}</p>
              </div>
            )}
          </>
        )}

        {/* Hover Arrow */}
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
