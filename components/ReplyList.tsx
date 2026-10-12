// Path: components/ReplyList.tsx
// Version: 5.3.0 - Share button on each reply. Its link (thread address + #reply-<id>) opens the
//                  thread scrolled to that reply, which is briefly highlighted
// Previous: 5.2.0 - Replies match the new forum look (white cards, no emoji) and show formatting
//                  (bold, lists, links) like posts do; nested replies indent less on phones
// Earlier: 5.1.1 - Added ProfilePreviewCard for reply authors (clickable)
// Date: 2026-10-11

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Flag, Trash2, Loader2, Reply, Mail, Edit } from 'lucide-react';
import { useUser } from '@/components/AuthProvider';
import ReplyForm from '@/components/ReplyForm';
import SendMessageModal from '@/components/SendMessageModal';
import VoteButtons from '@/components/VoteButtons';
import ImageLightbox from '@/components/ImageLightbox';
import ImageGallery from '@/components/ImageGallery';
import EditReplyModal from '@/components/EditReplyModal';
import PostBody from '@/components/PostBody';
import ProfilePreviewCard from '@/components/ProfilePreviewCard';
import ShareButton from '@/components/ShareButton';

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
  author?: {
    avatar_url: string | null;
    is_resident: boolean;
  };
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
  const [editingReply, setEditingReply] = useState<Reply | null>(null);
  const [messagingUser, setMessagingUser] = useState<{ id: string; name: string } | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const isAdmin = user?.is_super_admin || (user as any)?.admin_forum;

  useEffect(() => {
    fetchReplies();
  }, [postId]);

  // A shared reply link ends in #reply-<id>: once the replies are on the page, scroll to that one
  // and highlight it for a few seconds. Scrolls again shortly after, in case images above it
  // finished loading and pushed it down.
  useEffect(() => {
    if (loading || typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (!hash.startsWith('#reply-')) return;
    const id = decodeURIComponent(hash.slice('#reply-'.length));
    const scrollToReply = () => {
      document.getElementById(`reply-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    setHighlightId(id);
    const t1 = setTimeout(scrollToReply, 100);
    const t2 = setTimeout(scrollToReply, 1200);
    const t3 = setTimeout(() => setHighlightId(null), 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [loading]);

  useEffect(() => {
    if (onRefresh) {
      // Parent can call this
    }
  }, [onRefresh]);

  const fetchReplies = async () => {
    const { data } = await supabase
      .from('bbs_replies')
      .select(`
        *,
        author:users!bbs_replies_user_id_fkey(avatar_url, is_resident)
      `)
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
      <div className="text-center py-8 bg-white border border-[#E3DCCF] rounded-2xl">
        <MessageSquare className="w-8 h-8 text-[#CFC6B4] mx-auto mb-2" aria-hidden="true" />
        <p className="text-[#5B6660]">No replies yet — be the first!</p>
      </div>
    );
  }

  const ReplyItem = ({ reply, depth = 0 }: { reply: Reply; depth?: number }) => {
    const canDelete = isAdmin || reply.user_id === user?.id;
    const canEdit = reply.user_id === user?.id; // Only author can edit
    const isReplying = replyingTo === reply.id;
    const canMessage = user && !reply.is_anonymous && reply.user_id !== user.id;

    // Multi-image support
    const [images, setImages] = useState<any[]>([]);
    const [imagesLoading, setImagesLoading] = useState(true);

    useEffect(() => {
      fetchReplyImages();
    }, [reply.id]);

    const fetchReplyImages = async () => {
      setImagesLoading(true);
      const { data, error } = await supabase
        .from('bbs_reply_images')
        .select('*')
        .eq('reply_id', reply.id)
        .order('display_order', { ascending: true });

      if (!error && data) {
        setImages(data);
      }
      setImagesLoading(false);
    };

    return (
      <div className={`${depth > 0 ? 'ml-3 md:ml-8 pl-3 md:pl-4 border-l-2 border-[#E3DCCF]' : ''}`}>
        <div
          id={`reply-${reply.id}`}
          className={`bg-white border rounded-2xl p-4 mb-3 relative group scroll-mt-28 transition-shadow duration-700 ${
            highlightId === reply.id ? 'border-gabriola-green ring-4 ring-[#E6EFE8]' : 'border-[#E3DCCF]'
          }`}
        >
          <div className="flex gap-3">
            {/* Vote Buttons - Left side (only for logged-in users) */}
            {user ? (
              <div className="flex-shrink-0">
                <VoteButtons
                  itemId={reply.id}
                  itemType="reply"
                  initialScore={reply.vote_score || 0}
                  authorId={reply.user_id}
                  onScoreChange={() => fetchReplies()}
                />
              </div>
            ) : (
              // Show score for anonymous users (no voting)
              <div className="flex-shrink-0 flex flex-col items-center gap-1 py-1">
                <div className="text-lg font-bold text-gray-600">
                  {reply.vote_score || 0}
                </div>
                <div className="text-xs text-gray-500">
                  votes
                </div>
              </div>
            )}

            {/* Content - Right side */}
            <div className="flex-1 min-w-0">
              {/* Edit and Delete buttons - only for reply author */}
              {(canEdit || canDelete) && (
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition flex gap-2">
                  {canEdit && (
                    <button
                      onClick={() => setEditingReply(reply)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Edit reply"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(reply.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete reply"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              {/* Author & Time with Avatar and Badges */}
              <div className="flex items-center gap-3 mb-3">
                {/* Avatar */}
                {!reply.is_anonymous && reply.author?.avatar_url ? (
                  <img 
                    src={reply.author.avatar_url} 
                    alt={reply.display_name}
                    className="w-8 h-8 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                    {reply.is_anonymous ? '?' : (reply.display_name?.charAt(0) || '?')}
                  </div>
                )}
                
                {/* Name and Badges */}
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {/* Author name - clickable if not anonymous */}
                  {reply.is_anonymous ? (
                    <span className="font-medium text-gabriola-green">{reply.display_name}</span>
                  ) : (
                    <ProfilePreviewCard userId={reply.user_id}>
                      <span className="font-medium text-gabriola-green hover:underline cursor-pointer">
                        {reply.display_name}
                      </span>
                    </ProfilePreviewCard>
                  )}
                  
                  {/* Resident Badge - only if not anonymous */}
                  {!reply.is_anonymous && reply.author?.is_resident && (
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                      Resident
                    </span>
                  )}
                  
                  {/* Anonymous Badge */}
                  {reply.is_anonymous && (
                    <span className="text-xs bg-[#EEE8DD] px-2 py-0.5 rounded-full font-semibold">Anonymous</span>
                  )}
                  
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
                  
                  <span className="text-gray-400">•</span>
                  <time className="text-gray-600">{formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}</time>
                  
                  {reply.reported_count > 0 && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-bold">
                        ⚠️ {reply.reported_count} reports
                      </span>
                    </>
                  )}
                </div>
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

              {/* Multi-Image Gallery */}
              {!imagesLoading && images.length > 0 && (
                <div className="mb-3">
                  <ImageGallery images={images} />
                </div>
              )}

              {/* Body */}
              <PostBody text={reply.body} className="text-[#1F2A24] mb-3 break-words" />

              {/* Actions */}
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <button 
                  onClick={() => handleReport(reply.id, reply.reported_count)}
                  className="flex items-center gap-1 hover:text-red-600 transition"
                >
                  <Flag className="w-4 h-4" />
                  Report
                </button>
                <ShareButton
                  url={`https://www.gabriolaconnects.ca/community/thread/${postId}#reply-${reply.id}`}
                  title={`Reply from ${reply.display_name} on Gabriola Connects`}
                  className="-mx-2.5"
                />
                {user ? (
                  <button
                    onClick={() => setReplyingTo(isReplying ? null : reply.id)}
                    className="flex items-center gap-1 hover:text-gabriola-green transition"
                  >
                    <Reply className="w-4 h-4" />
                    Reply
                  </button>
                ) : (
                  <span className="flex items-center gap-1 text-gray-400 cursor-not-allowed" title="Sign in to reply">
                    <Reply className="w-4 h-4" />
                    Sign in to reply
                  </span>
                )}
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

      {/* Edit Reply Modal */}
      {editingReply && (
        <EditReplyModal
          reply={editingReply}
          onClose={() => setEditingReply(null)}
          onSuccess={() => {
            setEditingReply(null);
            fetchReplies();
          }}
        />
      )}

      {/* Image Lightbox */}
      {lightboxImage && (
        <ImageLightbox
          src={lightboxImage}
          alt="Reply image"
          onClose={() => setLightboxImage(null)}
        />
      )}
    </>
  );
}
