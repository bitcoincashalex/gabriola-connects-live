// components/ForumWidget.tsx
// Shows latest discussion topics and volunteer opportunities (body of the front page Community card)
// Version: 7.0.0 - Front page redesign: no longer draws its own blue card inside the front page
//                  card (the card, icon and title are drawn by the front page). Dark text on white.
// Previous: 6.4.0 - Outer <Link> changed to <div>. The landing page card already links to
//                  /community-hub, and a link inside a link broke page hydration (React #418/#423).
//                  Error state: removed nested Sign In link.
// Previous: 6.3.0 - Removed background bubbles that were overlapping volunteer count on iOS
// Date: 2026-10-10

'use client';

import { useEffect, useState } from 'react';
import { queryWithTimeout, supabase } from '@/lib/supabaseWithTimeout';

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

  if (loading) {
    return (
      <div className="border-t border-[#EEE8DD] pt-3 space-y-2" aria-label="Loading">
        <div className="h-4 bg-[#EEE8DD] rounded animate-pulse" />
        <div className="h-4 bg-[#EEE8DD] rounded w-3/4 animate-pulse" />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="border-t border-[#EEE8DD] pt-3 text-sm text-[#5B6660]">
        Unable to load discussions. Please refresh the page to try again.
      </div>
    );
  }

  return (
    <div className="border-t border-[#EEE8DD]">
      <p className="text-xs font-bold uppercase tracking-wide text-[#5B6660] pt-3 pb-1">Latest discussions</p>

      {latestTopics.length > 0 ? (
        <div className="divide-y divide-[#F1ECE3]">
          {latestTopics.map((topic, idx) => (
            <p key={idx} className="text-[15px] py-2 truncate">{topic}</p>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[#5B6660] py-2">No active discussions yet</p>
      )}

      <p className="text-sm font-semibold text-gabriola-green pt-2">
        {volunteerCount} volunteer {volunteerCount === 1 ? 'opportunity' : 'opportunities'} available
      </p>
    </div>
  );
}
