// Path: components/ReplyList.tsx
// Version: 3.0.0 - Replaced likes with upvote/downvote system
// Date: 2025-12-11

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Flag, Trash2, Loader2, Reply, Mail } from 'lucide-react';
import { useUser } from '@/components/AuthProvider';
import ReplyForm from '@/components/ReplyForm';
import SendMessageModal from '@/components/SendMessageModal';
import VoteButtons from '@/components/VoteButtons';

interface Reply {
  id: string;
  post_id: string;
  parent_reply_id: string | null;
  user_id: string;
  body: string;
  link_url: string | null;
  image_url: string | null;
  display_name: string;
  is_anonymous: boolean;
  vote_score: number;
  reported_count: number;
  is_active: boolean;
  created_at: string;
  children?: Reply[];
}

interface Props {
  postId: string;
  onRefresh?: () => void;
}

export default function ReplyList({ postId, onRefresh }: Props) {
  const { user } = useUser();
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [messagingUser, setMessagingUser] = useState<{ id: string; name: string } | null>(null);

  const isAdmin = user?.is_super_admin || (user as any)?.admin_forum;

  useEffect(() => {
    fetchReplies();
  }, [postId]);

  useEffect(() => {
    if (onRefresh) {
      // Parent can call this
    }
  }, [onRefresh]);

  const fetchReplies = async () => {
    const { data } = await supabase
      .from('bbs_replies')
      .select('*')
      .eq('post_id', postId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (data) {
      // Build tree structure
      const map = new Map<string, Reply>();
      data.forEach(r => map.set(r.id, { ...r, children: [] }));

      const tree: Reply[] = [];
      data.forEach(r => {
        if (r.parent_reply_id && map.has(r.parent_reply_id)) {
          map.get(r.parent_reply_id)!.children!.push(map.get(r.id)!);
        } else {
          tree.push(map.get(r.id)!);
        }
      });

      setReplies(tree);
    }
    setLoading(false);
  };

  const handleDelete = async (replyId: string) => {
    if (!confirm('Delete this reply?')) return;

    const { error } = await supabase
      .from('bbs_replies')
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
        deleted_by: user?.id,
      })
      .eq('id', replyId);

    if (!error) {
      fetchReplies();
    }
  };

  const handleReport = async (replyId: string, currentCount: number) => {
    if (!user) {
      alert('Sign in to report replies');
      return;
    }

    if (!confirm('Report this reply as inappropriate?')) return;

    await supabase
      .from('bbs_replies')
      .update({ reported_count: currentCount + 1 })
      .eq('id', replyId);

    alert('Reply reported. Moderators will review it.');
    fetchReplies();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-gabriola-green animate-spin" />
      </div>
    );
  }

  if (!replies.length) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-xl">
        <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500 text-lg">No replies yet — be the first!</p>
      </div>
    );
  }

  const ReplyItem = ({ reply, depth = 0 }: { reply: Reply; depth?: number }) => {
    const canDelete = isAdmin || reply.user_id === user?.id;
    const isReplying = replyingTo === reply.id;
    const canMessage = user && !reply.is_anonymous && reply.user_id !== user.id;

    return (
      <div className={`${depth > 0 ? 'ml-8 pl-4 border-l-2 border-gray-200' : ''}`}>
        <div className="bg-white rounded-xl shadow-sm p-5 mb-4 relative group">
          <div className="flex gap-4">
            {/* Vote Buttons - Left side */}
            <div className="flex-shrink-0">
              <VoteButtons
                itemId={reply.id}
                itemType="reply"
                initialScore={reply.vote_score || 0}
                onScoreChange={() => fetchReplies()}
              />
            </div>

            {/* Content - Right side */}
            <div className="flex-1 min-w-0">
              {/* Delete button */}
              {canDelete && (
                <button
                  onClick={() => handleDelete(reply.id)}
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  title="Delete reply"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              {/* Author & Time with Send Message */}
              <div className="flex items-center gap-3 text-sm text-gray-600 mb-3 flex-wrap">
                <span className="font-medium text-gabriola-green">{reply.display_name}</span>
                
                {/* Send Message Button */}
                {canMessage && (
                  <button
                    onClick={() => setMessagingUser({ id: reply.user_id, name: reply.display_name })}
                    className="flex items-center gap-1 px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-full transition text-xs font-medium"
                    title="Send private message"
                  >
                    <Mail className="w-3 h-3" />
                    Message
                  </button>
                )}
                
                {reply.is_anonymous && (
                  <span className="text-xs bg-gray-200 px-2 py-1 rounded">🕶️ Anonymous</span>
                )}
                <span>•</span>
                <time>{formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}</time>
                {reply.reported_count > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-bold">
                      ⚠️ {reply.reported_count} reports
                    </span>
                  </>
                )}
              </div>

              {/* Link */}
              {reply.link_url && (
                <a
                  href={reply.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-600 hover:bg-blue-100 transition text-sm"
                >
                  🔗 <span className="font-medium">{reply.link_url}</span>
                </a>
              )}

              {/* Image */}
              {reply.image_url && (
                <div className="mb-3">
                  <img 
                    src={reply.image_url} 
                    alt="Reply attachment" 
                    className="max-w-full h-auto rounded-lg border-2 border-gray-200"
                    style={{ maxHeight: '400px' }}
                  />
                </div>
              )}

              {/* Body */}
              <div className="whitespace-pre-wrap text-gray-800 mb-3">
                {reply.body}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <button 
                  onClick={() => handleReport(reply.id, reply.reported_count)}
                  className="flex items-center gap-1 hover:text-red-600 transition"
                >
                  <Flag className="w-4 h-4" />
                  Report
                </button>
                <button
                  onClick={() => setReplyingTo(isReplying ? null : reply.id)}
                  className="flex items-center gap-1 hover:text-gabriola-green transition"
                >
                  <Reply className="w-4 h-4" />
                  Reply
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Nested reply form */}
        {isReplying && (
          <div className="ml-8 mb-4">
            <ReplyForm
              postId={postId}
              parentReplyId={reply.id}
              onSuccess={() => {
                setReplyingTo(null);
                fetchReplies();
              }}
              onCancel={() => setReplyingTo(null)}
              placeholder={`Reply to ${reply.display_name}`}
            />
          </div>
        )}

        {/* Nested replies */}
        {reply.children && reply.children.length > 0 && (
          <div className="mt-2">
            {reply.children.map(child => (
              <ReplyItem key={child.id} reply={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="space-y-4">
        {replies.map(reply => (
          <ReplyItem key={reply.id} reply={reply} />
        ))}
      </div>

      {/* Send Message Modal */}
      {messagingUser && user && (
        <SendMessageModal
          recipientId={messagingUser.id}
          recipientName={messagingUser.name}
          currentUserId={user.id}
          onClose={() => setMessagingUser(null)}
        />
      )}
    </>
  );
}
