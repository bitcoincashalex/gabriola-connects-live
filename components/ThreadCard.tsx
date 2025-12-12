// Path: components/ThreadCard.tsx
// Version: 4.0.0 - Added message button to summary view
// Date: 2025-12-11

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Pin, Trash2, ChevronUp, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import SendMessageModal from '@/components/SendMessageModal';

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
  const [showMessageModal, setShowMessageModal] = useState(false);

  const handlePin = async () => {
    const { error } = await supabase
      .from('bbs_posts')
      .update({ global_pinned: !thread.global_pinned })
      .eq('id', thread.id);

    if (!error) onRefresh();
  };

  // SOFT DELETE — sets is_active to false
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

  // Score color based on value
  const getScoreColor = (score: number) => {
    if (score > 0) return 'text-green-600';
    if (score < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  // Check if user can message the author
  const isOwnPost = user && thread.user_id === user.id;
  const canMessageAuthor = user && !thread.is_anonymous && !isOwnPost;

  const handleMessageClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent link navigation
    e.stopPropagation(); // Prevent event bubbling
    setShowMessageModal(true);
  };

  return (
    <>
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

            <div className="flex items-center gap-4 text-gray-600 mb-4 flex-wrap">
              <span className="font-medium">{thread.display_name || 'Anonymous'}</span>
              
              {/* Send Message Button */}
              {canMessageAuthor && (
                <button
                  onClick={handleMessageClick}
                  className="flex items-center gap-1 px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-full transition text-xs font-medium"
                  title="Send private message"
                >
                  <Mail className="w-3 h-3" />
                  Message
                </button>
              )}
              
              {thread.is_anonymous && (
                <span className="text-xs bg-gray-200 px-2 py-1 rounded">🕶️ Anonymous</span>
              )}
              <span>•</span>
              <span>{formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}</span>
            </div>

            <div className="flex items-center gap-6 text-sm text-gray-600">
              {/* Reply count */}
              <span className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                {thread.reply_count || 0}
              </span>

              {/* Vote score with colored number and upvote icon */}
              <span className={`flex items-center gap-2 font-semibold ${getScoreColor(thread.vote_score || 0)}`}>
                <ChevronUp className="w-4 h-4" />
                {thread.vote_score || 0}
              </span>

              {/* Category badge */}
              <span className="px-3 py-1 bg-gray-100 rounded-full text-gray-600">
                {thread.category.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
              </span>
            </div>
          </div>
        </Link>
      </div>

      {/* Send Message Modal */}
      {showMessageModal && canMessageAuthor && (
        <SendMessageModal
          recipientId={thread.user_id}
          recipientName={thread.display_name || 'Anonymous'}
          currentUserId={user!.id}
          onClose={() => setShowMessageModal(false)}
        />
      )}
    </>
  );
}
