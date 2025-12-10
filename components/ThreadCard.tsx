// Path: components/ThreadCard.tsx
// Version: 2.1.0 - Show like count with proper red/gray heart state
// Date: 2024-12-10

'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Pin, Trash2, Heart } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { useEffect, useState } from 'react';

export default function ThreadCard({ 
  thread, 
  currentUser, 
  onRefresh 
}: { 
  thread: any; 
  currentUser: any; 
  onRefresh: () => void;
}) {
  const { user } = useUser();
  const isAdmin = user?.is_super_admin || user?.role === 'admin';
  const isPinned = thread.global_pinned === true;
  const [hasLiked, setHasLiked] = useState(false);

  // Check if current user has liked this thread
  useEffect(() => {
    const checkIfLiked = async () => {
      if (!user) {
        setHasLiked(false);
        return;
      }

      const { data } = await supabase
        .from('bbs_post_likes')
        .select('id')
        .eq('post_id', thread.id)
        .eq('user_id', user.id)
        .single();

      setHasLiked(!!data);
    };

    checkIfLiked();
  }, [user, thread.id]);

  const handlePin = async () => {
    const { error } = await supabase
      .from('bbs_posts')
      .update({ global_pinned: !thread.global_pinned })
      .eq('id', thread.id);

    if (!error) onRefresh();
  };

  // SOFT DELETE – sets is_active to false
  const handleDelete = async () => {
    if (!confirm('Hide this thread from public view?\n(Admins can restore it later from "Deleted Items")')) return;

    const { error } = await supabase
      .from('bbs_posts')
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
        deleted_by: user?.id,
      })
      .eq('id', thread.id);

    if (error) {
      console.error('Failed to hide thread:', error);
      alert('Something went wrong: ' + error.message);
    } else {
      onRefresh();
    }
  };

  return (
    <div className="relative group">
      {/* Admin Controls */}
      {isAdmin && (
        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition z-10">
          <button
            onClick={handlePin}
            className={`p-2 rounded-full shadow-lg ${isPinned ? 'bg-yellow-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
            title={isPinned ? 'Unpin' : 'Pin to top'}
          >
            <Pin className="w-5 h-5" />
          </button>

          <button
            onClick={handleDelete}
            className="p-2 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700"
            title="Delete thread"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Thread Card */}
      <Link href={`/community/thread/${thread.id}`} className="block">
        <div className={`bg-white rounded-2xl shadow hover:shadow-lg transition p-6 border-2 ${
          isPinned ? 'border-yellow-400' : 'border-transparent'
        }`}>
          {isPinned && (
            <div className="flex items-center gap-2 text-yellow-600 font-bold text-sm mb-2">
              <Pin className="w-4 h-4" />
              PINNED
            </div>
          )}

          <h3 className="text-2xl font-bold text-gabriola-green-dark mb-3">
            {thread.title}
          </h3>

          <div className="flex items-center gap-4 text-gray-600 mb-4">
            <span className="font-medium">{thread.display_name || 'Anonymous'}</span>
            <span>•</span>
            <span>{formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-gray-600">
            {/* Reply count */}
            <span className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              {thread.reply_count || 0}
            </span>

            {/* Like count with red/gray heart based on liked state */}
            <span className={`flex items-center gap-2 ${hasLiked ? 'text-red-600' : ''}`}>
              <Heart className={`w-4 h-4 ${hasLiked ? 'fill-current' : ''}`} />
              {thread.like_count || 0}
            </span>

            {/* Category badge */}
            <span className="px-3 py-1 bg-gray-100 rounded-full text-gray-600">
              {thread.category.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
