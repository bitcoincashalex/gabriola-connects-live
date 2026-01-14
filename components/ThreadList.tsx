// Path: components/ThreadList.tsx
// Version: 4.3.0 - Fixed sort order: pinned first, then by latest activity (updated_at)
// Date: 2025-01-14

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import ThreadCard from './ThreadCard';
import { User } from '@/lib/types';

interface ThreadListProps {
  category: string;
  currentUser: User | null;
  searchQuery?: string;
  onSearchResults?: (count: number) => void;
}

export default function ThreadList({ 
  category, 
  currentUser,
  searchQuery,
  onSearchResults
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

    // Category filter
    if (category !== 'all') {
      query = query.eq('category', category);
    }

    // Search filter
    if (searchQuery && searchQuery.trim().length >= 2) {
      const searchTerm = `%${searchQuery.trim()}%`;
      
      // Search in title OR body
      query = query.or(`title.ilike.${searchTerm},body.ilike.${searchTerm}`);
    }

    // Ordering: Pinned posts first, then by latest activity
    query = query
      .order('global_pinned', { ascending: false })
      .order('pin_order', { ascending: false })
      .order('updated_at', { ascending: false });

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
          if (category !== 'all') {
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
              // Then updated_at (latest activity)
              return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
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

  if (loading) return <p className="text-center py-20">Loading threads...</p>;

  return (
    <div className="space-y-6">
      {threads.map((thread) => (
        <ThreadCard key={thread.id} thread={thread} currentUser={currentUser} onRefresh={fetchThreads} />
      ))}
      {threads.length === 0 && (
        <p className="text-center py-20 text-gray-500">
          {searchQuery && searchQuery.trim().length >= 2 
            ? `No threads found matching "${searchQuery}"`
            : 'No threads yet — be the first!'}
        </p>
      )}
    </div>
  );
}
