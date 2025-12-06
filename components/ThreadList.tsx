// components/ThreadList.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import ThreadCard from './ThreadCard';
import { User } from '@/lib/types';

export default function ThreadList({ category, currentUser }: { category: string; currentUser: User | null }) {
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchThreads();
    const channel = supabase.channel('threads').on('postgres_changes', { event: '*', schema: 'public', table: 'bbs_posts' }, fetchThreads).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [category]);

  const fetchThreads = async () => {
    let query = supabase
      .from('bbs_posts')
      .select('*, reply_count')
      .eq('is_active', true)
      // GLOBAL PINNED = always first
      .order('global_pinned', { ascending: false })
      // Then regular pinned
      .order('pin_order', { ascending: false })
      // Then normal sort
      .order('created_at', { ascending: false });

    if (category !== 'all') {
      query = query.eq('category', category);
    }

    const { data } = await query;
    setThreads(data || []);
    setLoading(false);
  };

  if (loading) return <p className="text-center py-20">Loading threads...</p>;

  return (
    <div className="space-y-6">
      {threads.map((thread) => (
        <ThreadCard key={thread.id} thread={thread} currentUser={currentUser} onRefresh={fetchThreads} />
      ))}
      {threads.length === 0 && (
        <p className="text-center py-20 text-gray-500">No threads yet — be the first!</p>
      )}
    </div>
  );
}