// components/ForumWidget.tsx
// Shows latest discussion topics and volunteer opportunities
// Version: 6.2.0 - Added "Latest discussions" header and volunteer opportunity count
// Date: 2025-01-13

'use client';

import { useEffect, useState } from 'react';
import { queryWithTimeout, supabase } from '@/lib/supabaseWithTimeout';
import { MessageSquare, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export function ForumWidget() {
  const [latestTopics, setLatestTopics] = useState<string[]>([]);
  const [volunteerCount, setVolunteerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

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
      setHasError(false);
      
      // Get latest 5 topics (with timeout)
      const { data: latest } = await queryWithTimeout(async () =>
        supabase
          .from('bbs_posts')
          .select('title')
          .eq('is_active', true)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(5)
      );

      if (latest && latest.length > 0) {
        setLatestTopics(latest.map(post => post.title));
      } else {
        setLatestTopics([]);
      }

      // Get volunteer opportunities count (with timeout)
      const { count } = await queryWithTimeout(async () =>
        supabase
          .from('volunteer_opportunities')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active')
          .eq('is_approved', true)
      );

      setVolunteerCount(count || 0);

    } catch (error) {
      console.error('Error fetching forum stats:', error);
      setHasError(true);
      setLatestTopics([]);
      setVolunteerCount(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Link
      href="/community-hub"
      className="group bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 p-6 text-white overflow-hidden relative"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10 -z-10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-12 -translate-x-12"></div>
      </div>

      {/* Content */}
      <div className="relative">
        {/* Header - Updated text sizing */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="p-2.5 bg-white/20 rounded-full flex-shrink-0">
            <MessageSquare className="w-8 h-8" />
          </div>
          {/* Bigger title */}
          <h3 className="text-2xl font-bold leading-tight">Community</h3>
        </div>

        {/* Description - Two lines, readable size */}
        <div className="text-xs text-blue-100 mb-3 leading-snug">
          Forum • Emergency • Map
          <br />
          News • Volunteer
        </div>

        {loading ? (
          <div className="space-y-2">
            <div className="h-6 bg-white/20 rounded animate-pulse"></div>
            <div className="h-4 bg-white/20 rounded w-3/4 animate-pulse"></div>
          </div>
        ) : hasError ? (
          /* Timeout Error State */
          <div className="text-center py-2">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-90" />
            <p className="font-medium text-sm mb-1">Unable to load discussions</p>
            <p className="text-xs text-blue-100 mb-3">Sign in to see the latest</p>
            <Link
              href="/signin"
              className="inline-block px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              Sign In
            </Link>
          </div>
        ) : (
          <>
            {/* Latest Discussions Header */}
            <div className="mb-2">
              <p className="text-xs text-blue-100 font-semibold uppercase tracking-wide">Latest discussions:</p>
            </div>

            {/* Latest 5 Topics */}
            {latestTopics.length > 0 ? (
              <div className="space-y-1.5 mb-3">
                {latestTopics.map((topic, idx) => (
                  <p key={idx} className="text-sm font-medium truncate leading-tight">
                    • {topic}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-blue-100 mb-3">No active discussions yet</p>
            )}

            {/* Volunteer Opportunities Count */}
            <div className="pt-2 border-t border-white/20">
              <p className="text-sm font-medium">
                {volunteerCount} Volunteer {volunteerCount === 1 ? 'opportunity' : 'opportunities'} available
              </p>
            </div>
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
