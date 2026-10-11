// Path: components/ThreadList.tsx
// Version: 4.6.0 - Newest posts first (by when they were posted). updated_at changed whenever a
//                  post was viewed or edited, so old posts kept jumping to the top
// Previous: 4.5.0 - "Island News" and "Discussions" filters (posts by the news account / everyone else)
// Earlier: 4.4.0 - Compact list for the forum redesign: passes topic names to each card,
//                  tighter spacing, quieter loading and empty text
// Earlier: 4.3.0 - Fixed sort order: pinned first, then by latest activity (updated_at)
// Date: 2026-10-11

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import ThreadCard from './ThreadCard';
import { NEWS_AUTHOR_ID, NEWS_FILTER, DISCUSSIONS_FILTER } from '@/lib/forum';
import { User } from '@/lib/types';

interface ThreadListProps {
  category: string;
  currentUser: User | null;
  searchQuery?: string;
  onSearchResults?: (count: number) => void;
  categoryNames?: Record<string, string>;
}

export default function ThreadList({ 
  category, 
  currentUser,
  searchQuery,
  onSearchResults,
  categoryNames = {}
}: ThreadListProps) {
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchThreads();
    const channel = supabase
      .channel('threads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bbs_posts' }, fetchThreads)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [category, searchQuery]);

  const fetchThreads = async () => {
    setLoading(true);

    // Base query - include author data
    let query = supabase
      .from('bbs_posts')
      .select(`
        *, 
        reply_count, 
        vote_score,
        view_count,
        author:users!bbs_posts_user_id_fkey(avatar_url, is_resident)
      `)
      .eq('is_active', true);

    // Topic filter (Island News / Discussions are filters on who posted, not real topics)
    if (category === NEWS_FILTER) {
      query = query.eq('user_id', NEWS_AUTHOR_ID);
    } else if (category === DISCUSSIONS_FILTER) {
      query = query.neq('user_id', NEWS_AUTHOR_ID);
    } else if (category !== 'all') {
      query = query.eq('category', category);
    }

    // Search filter
    if (searchQuery && searchQuery.trim().length >= 2) {
      const searchTerm = `%${searchQuery.trim()}%`;
      
      // Search in title OR body
      query = query.or(`title.ilike.${searchTerm},body.ilike.${searchTerm}`);
    }

    // Ordering: Pinned posts first, then newest posts first
    query = query
      .order('global_pinned', { ascending: false })
      .order('pin_order', { ascending: false })
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching threads:', error);
      setThreads([]);
      setLoading(false);
      return;
    }

    let results = data || [];

    // If searching, also find threads with matching replies
    if (searchQuery && searchQuery.trim().length >= 2) {
      const searchTerm = `%${searchQuery.trim()}%`;
      
      // Search replies
      const { data: matchingReplies } = await supabase
        .from('bbs_replies')
        .select('post_id')
        .ilike('body', searchTerm)
        .eq('is_active', true);

      if (matchingReplies && matchingReplies.length > 0) {
        // Get unique post IDs from matching replies
        const postIdsWithMatchingReplies = Array.from(new Set(matchingReplies.map(r => r.post_id)));
        
        // Fetch threads that have matching replies but didn't match in title/body
        const threadIdsAlreadyFound = new Set(results.map(t => t.id));
        const additionalPostIds = postIdsWithMatchingReplies.filter(id => !threadIdsAlreadyFound.has(id));

        if (additionalPostIds.length > 0) {
          // Fetch additional threads
          let additionalQuery = supabase
            .from('bbs_posts')
            .select('*, reply_count, vote_score, view_count')
            .eq('is_active', true)
            .in('id', additionalPostIds);

          // Apply category filter to additional threads too
          if (category === NEWS_FILTER) {
            additionalQuery = additionalQuery.eq('user_id', NEWS_AUTHOR_ID);
          } else if (category === DISCUSSIONS_FILTER) {
            additionalQuery = additionalQuery.neq('user_id', NEWS_AUTHOR_ID);
          } else if (category !== 'all') {
            additionalQuery = additionalQuery.eq('category', category);
          }

          const { data: additionalThreads } = await additionalQuery;

          if (additionalThreads) {
            // Combine results
            results = [...results, ...additionalThreads];
            
            // Re-sort combined results
            results.sort((a, b) => {
              // Global pinned first
              if (a.global_pinned !== b.global_pinned) return b.global_pinned ? 1 : -1;
              // Then pin_order
              if (a.pin_order !== b.pin_order) return (b.pin_order || 0) - (a.pin_order || 0);
              // Then newest posts first
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });
          }
        }
      }
    }

    setThreads(results);
    setLoading(false);

    // Report search results count
    if (onSearchResults && searchQuery && searchQuery.trim().length >= 2) {
      onSearchResults(results.length);
    }
  };

  if (loading) return <p className="text-center py-16 text-[#5B6660]" role="status">Loading posts...</p>;

  return (
    <div className="space-y-2.5">
      {threads.map((thread) => (
        <ThreadCard key={thread.id} thread={thread} currentUser={currentUser} onRefresh={fetchThreads} categoryName={categoryNames[thread.category]} />
      ))}
      {threads.length === 0 && (
        <p className="text-center py-16 text-[#5B6660]">
          {searchQuery && searchQuery.trim().length >= 2 
            ? `No threads found matching "${searchQuery}"`
            : 'No threads yet — be the first!'}
        </p>
      )}
    </div>
  );
}
