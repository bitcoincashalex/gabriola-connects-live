// components/ThreadCard.tsx
// Version: 8.1.0 - Island News posts (by Claude) are labelled ISLAND NEWS in navy; Share button
//                  on every card (phone share sheet, or copies the link)
// Previous: 8.0.0 - Compact card for the forum redesign: topic name on top, smaller title, two-line
//                  preview with formatting marks (**, ##, links) taken out, one line for author,
//                  time, votes, replies and views. Edit/pin/delete/report buttons are visible on
//                  phones (they only showed on mouse hover before). No emoji.
// Earlier: 7.0.7 - Removed redundant RPC call (trigger handles score update)
// Date: 2026-10-10

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { 
  MessageSquare, Pin, Trash2, ChevronUp, ChevronDown, Mail, Eye, 
  Link2, Pencil, Flag, AlertCircle 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import SendMessageModal from '@/components/SendMessageModal';
import ImageGallery from '@/components/ImageGallery';
import EditPostModal from '@/components/EditPostModal';
import ShareButton from '@/components/ShareButton';
import { isNewsPost } from '@/lib/forum';
import { Newspaper } from 'lucide-react';

// Plain-text preview: removes markdown marks so "**Posted by:**" shows as "Posted by:"
function previewText(body: string): string {
  return (body || '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')            // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')         // links -> their text
    .replace(/^\s*([-*_]\s*){3,}$/gm, '')               // divider lines (---)
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')                // headings
    .replace(/^\s{0,3}>\s?/gm, '')                     // quotes
    .replace(/^\s*[-*+]\s+/gm, '')                     // list bullets
    .replace(/(\*\*|__|\*|_|~~|`)/g, '')               // bold, italic, strike, code
    .replace(/\s+/g, ' ')
    .trim();
}

export default function ThreadCard({ 
  thread, 
  currentUser, 
  onRefresh,
  categoryName
}: { 
  thread: any; 
  currentUser: any; 
  onRefresh: () => void;
  categoryName?: string;
}) {
  const { user } = useUser();
  const isAdmin = user?.is_super_admin || user?.role === 'admin';
  const isAuthor = user && thread.user_id === user.id;
  const isPinned = thread.global_pinned === true;
  
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [images, setImages] = useState<any[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [userVote, setUserVote] = useState<'upvote' | 'downvote' | null>(null);
  const [voteScore, setVoteScore] = useState(thread.vote_score || 0);
  const [voting, setVoting] = useState(false);

  // Fetch images for this post
  useEffect(() => {
    fetchImages();
    if (user) {
      fetchUserVote();
    }
  }, [thread.id, user]);

  const fetchImages = async () => {
    setImagesLoading(true);
    const { data, error } = await supabase
      .from('bbs_post_images')
      .select('*')
      .eq('post_id', thread.id)
      .order('display_order', { ascending: true });

    if (!error && data) {
      setImages(data);
    }
    setImagesLoading(false);
  };

  const fetchUserVote = async () => {
    if (!user) return;
    
    // FIX: Use array response to avoid 406 error when no vote exists
    const { data, error } = await supabase
      .from('bbs_post_votes')
      .select('vote_type')
      .eq('post_id', thread.id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching vote:', error);
      return;
    }

    if (data && data.length > 0) {
      setUserVote(data[0].vote_type as 'upvote' | 'downvote');
    } else {
      setUserVote(null);
    }
  };

  const handleVote = async (voteType: 'upvote' | 'downvote') => {
    if (!user || voting) return;
    
    console.log(`[ThreadCard] Voting ${voteType} on post ${thread.id}`);
    setVoting(true);
    
    try {
      // If clicking same vote, remove it
      if (userVote === voteType) {
        console.log(`[ThreadCard] Removing ${voteType} vote`);
        // Delete vote
        const { error: deleteError } = await supabase
          .from('bbs_post_votes')
          .delete()
          .eq('post_id', thread.id)
          .eq('user_id', user.id);
        
        if (deleteError) {
          console.error('[ThreadCard] Error deleting vote:', deleteError);
        } else {
          console.log('[ThreadCard] Vote deleted successfully');
          setUserVote(null);
          // Optimistically update UI
          setVoteScore((prev: number) => prev + (voteType === 'upvote' ? -1 : 1));
        }
      } else {
        // Insert or update vote - specify conflict resolution
        console.log(`[ThreadCard] Upserting ${voteType} vote (previous: ${userVote})`);
        const { error: upsertError } = await supabase
          .from('bbs_post_votes')
          .upsert({
            post_id: thread.id,
            user_id: user.id,
            vote_type: voteType,
          }, {
            onConflict: 'post_id,user_id'  // Tell upsert which columns form unique constraint
          });
        
        if (upsertError) {
          console.error('[ThreadCard] Error upserting vote:', upsertError);
        } else {
          console.log('[ThreadCard] Vote upserted successfully');
          // Optimistically update UI
          const scoreDelta = voteType === 'upvote' ? 1 : -1;
          const previousDelta = userVote === 'upvote' ? -1 : userVote === 'downvote' ? 1 : 0;
          setVoteScore((prev: number) => prev + scoreDelta + previousDelta);
          setUserVote(voteType);
        }
      }
      
      // Fetch score from database (trigger updated it automatically)
      const { data: postData, error: fetchError } = await supabase
        .from('bbs_posts')
        .select('vote_score')
        .eq('id', thread.id)
        .single();
      
      if (fetchError) {
        console.error('[ThreadCard] Error fetching score:', fetchError);
      } else if (postData) {
        console.log('[ThreadCard] Score from DB:', postData.vote_score);
        setVoteScore(postData.vote_score || 0);
      }
      
    } catch (error) {
      console.error('[ThreadCard] Vote error:', error);
    } finally {
      setVoting(false);
    }
  };

  const handlePin = async () => {
    const { error } = await supabase
      .from('bbs_posts')
      .update({ global_pinned: !thread.global_pinned })
      .eq('id', thread.id);

    if (!error) onRefresh();
  };

  const handleDelete = async () => {
    const confirmMessage = isAdmin 
      ? 'Hide this thread from public view?\n(Admins can restore it later from "Deleted Items")'
      : 'Delete your thread? This action cannot be undone.';
      
    if (!confirm(confirmMessage)) return;

    const { error } = await supabase
      .from('bbs_posts')
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
        deleted_by: user?.id,
      })
      .eq('id', thread.id);

    if (error) {
      console.error('Failed to delete thread:', error);
      alert('Something went wrong: ' + error.message);
    } else {
      onRefresh();
    }
  };

  const handleReport = async () => {
    if (!user) {
      alert('Please sign in to report content.');
      return;
    }

    const reason = prompt('Why are you reporting this thread?\n\nReasons: Spam, Harassment, Inappropriate Content, Misinformation, Other');
    if (!reason) return;

    const { error } = await supabase
      .from('content_reports')
      .insert({
        content_type: 'post',
        content_id: thread.id,
        reported_by: user.id,
        reason: reason.trim(),
      });

    if (error) {
      console.error('Error reporting:', error);
      alert('Failed to submit report. Please try again.');
    } else {
      alert('Thank you for your report. Our moderators will review it shortly.');
    }
  };

  const getScoreColor = (score: number) => {
    if (score > 0) return 'text-green-600';
    if (score < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const isOwnPost = user && thread.user_id === user.id;
  const canMessageAuthor = user && !thread.is_anonymous && !isOwnPost;

  const handleMessageClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMessageModal(true);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowEditModal(true);
  };

  return (
    <>
      <div className="relative group">
        {/* Admin + Author Controls */}
        <div className="absolute top-3 right-3 flex gap-2 md:opacity-0 md:group-hover:opacity-100 transition z-10">
          {/* Edit button (author only) */}
          {isAuthor && !thread.is_anonymous && (
            <button
              onClick={handleEditClick}
              className="p-2 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600"
              title="Edit thread"
            >
              <Pencil className="w-5 h-5" />
            </button>
          )}
          
          {/* Pin button (admin only) */}
          {isAdmin && (
            <button
              onClick={handlePin}
              className={`p-2 rounded-full shadow-lg ${isPinned ? 'bg-yellow-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
              title={isPinned ? 'Unpin' : 'Pin to top'}
            >
              <Pin className="w-5 h-5" />
            </button>
          )}

          {/* Delete button (author or admin) */}
          {(isAuthor || isAdmin) && (
            <button
              onClick={handleDelete}
              className="p-2 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700"
              title="Delete thread"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
          
          {/* Report button (not for own posts) */}
          {!isOwnPost && user && (
            <button
              onClick={handleReport}
              className="p-2 bg-orange-500 text-white rounded-full shadow-lg hover:bg-orange-600"
              title="Report thread"
            >
              <Flag className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Thread Card */}
        <Link href={`/community/thread/${thread.id}`} className="block">
          <div className={`rounded-2xl px-4 py-3.5 border transition-shadow hover:shadow-md ${
            isPinned ? 'bg-[#FFFBEB] border-[#E8C96A]' : 'bg-white border-[#E3DCCF]'
          }`}>
            <div className={`flex items-center gap-1.5 text-xs font-bold mb-1 ${isPinned ? 'text-[#8A5A00] tracking-wide' : isNewsPost(thread) ? 'text-[#002774]' : 'text-gabriola-green'} ${(isAuthor || isAdmin || (!isOwnPost && user)) ? 'pr-36 md:pr-0' : ''}`}>
              {isPinned && <Pin className="w-3.5 h-3.5" aria-hidden="true" />}
              {!isPinned && isNewsPost(thread) && (
                <span className="inline-flex items-center gap-1 bg-[#002774] text-white px-1.5 py-0.5 rounded text-[10px] tracking-wide">
                  <Newspaper className="w-3 h-3" aria-hidden="true" />ISLAND NEWS
                </span>
              )}
              {isPinned ? 'PINNED · ' : ''}{categoryName || (thread.category || '').replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
            </div>

            <h3 className="text-[17px] font-bold leading-snug text-[#1F2A24]">
              {thread.title}
            </h3>

            {/* Two-line preview, plain text */}
            {thread.body && (
              <p className="text-sm text-[#3A4640] leading-relaxed mt-1 line-clamp-2">
                {previewText(thread.body)}
              </p>
            )}

            {/* Images */}
            {!imagesLoading && images.length > 0 && (
              <div onClick={(e) => e.preventDefault()} className="mt-2">
                <ImageGallery images={images} />
              </div>
            )}

            {/* Link */}
            {thread.link_url && (
              <a
                href={thread.link_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="mt-1.5 inline-flex items-center gap-1.5 text-gabriola-green hover:text-gabriola-green-dark text-sm font-medium max-w-full"
              >
                <Link2 className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                <span className="underline truncate">{thread.link_url}</span>
              </a>
            )}

            {/* Author, time, votes, replies, views */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2 text-[13px] text-[#5B6660]">
              <span className="flex items-center gap-1.5 min-w-0">
                {!thread.is_anonymous && thread.author?.avatar_url ? (
                  <img
                    src={thread.author.avatar_url}
                    alt=""
                    className="w-5 h-5 rounded-full object-cover"
                  />
                ) : (
                  <span className="w-5 h-5 rounded-full bg-[#EEE8DD] flex items-center justify-center text-[10px] font-bold text-[#5B6660]" aria-hidden="true">
                    {thread.is_anonymous ? '?' : (thread.display_name?.charAt(0) || '?')}
                  </span>
                )}
                <span className="font-medium text-[#3A4640] truncate">{thread.display_name || 'Anonymous'}</span>
                {!thread.is_anonymous && thread.author?.is_resident && (
                  <span className="bg-[#E6EFE8] text-gabriola-green-dark px-1.5 py-0.5 rounded-full text-[11px] font-semibold">Resident</span>
                )}
                {thread.is_anonymous && (
                  <span className="bg-[#EEE8DD] px-1.5 py-0.5 rounded-full text-[11px] font-semibold">Anonymous</span>
                )}
              </span>
              <span>{formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}{thread.edited_at ? ' · edited' : ''}</span>

              {/* Votes */}
              {user ? (
                <span className="flex items-center" onClick={(e) => e.preventDefault()}>
                  <button
                    onClick={() => handleVote('upvote')}
                    disabled={voting}
                    aria-label="Upvote"
                    className={`w-8 h-8 flex items-center justify-center rounded hover:bg-[#F6F2EA] ${userVote === 'upvote' ? 'text-green-600' : 'text-[#5B6660]'}`}
                  >
                    <ChevronUp className="w-5 h-5" />
                  </button>
                  <span className={`font-semibold min-w-[1.25rem] text-center ${getScoreColor(voteScore)}`}>{voteScore}</span>
                  <button
                    onClick={() => handleVote('downvote')}
                    disabled={voting}
                    aria-label="Downvote"
                    className={`w-8 h-8 flex items-center justify-center rounded hover:bg-[#F6F2EA] ${userVote === 'downvote' ? 'text-red-600' : 'text-[#5B6660]'}`}
                  >
                    <ChevronDown className="w-5 h-5" />
                  </button>
                </span>
              ) : (
                <span className={`flex items-center gap-0.5 font-semibold ${getScoreColor(voteScore)}`} title="Votes">
                  <ChevronUp className="w-4 h-4" aria-hidden="true" />{voteScore}
                </span>
              )}

              <span className="flex items-center gap-1" title="Replies">
                <MessageSquare className="w-4 h-4" aria-hidden="true" />{thread.reply_count || 0}
              </span>
              <span className="flex items-center gap-1" title="Views">
                <Eye className="w-4 h-4" aria-hidden="true" />{thread.view_count || 0}
              </span>

              <ShareButton
                url={`https://www.gabriolaconnects.ca/community/thread/${thread.id}`}
                title={thread.title}
                label={false}
                className="ml-auto -my-1"
              />

              {canMessageAuthor && (
                <button
                  onClick={handleMessageClick}
                  className="flex items-center gap-1 px-2 min-h-[28px] bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
                  title="Send private message"
                >
                  <Mail className="w-3 h-3" aria-hidden="true" />
                  Message
                </button>
              )}
            </div>
          </div>
        </Link>
      </div>

      {/* Modals */}
      {showMessageModal && canMessageAuthor && (
        <SendMessageModal
          recipientId={thread.user_id}
          recipientName={thread.display_name || 'Anonymous'}
          currentUserId={user!.id}
          onClose={() => setShowMessageModal(false)}
        />
      )}

      {showEditModal && isAuthor && (
        <EditPostModal
          post={thread}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            onRefresh();
          }}
        />
      )}
    </>
  );
}
