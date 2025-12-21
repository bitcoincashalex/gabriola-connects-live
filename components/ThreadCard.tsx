// components/ThreadCard.tsx
// Version: 7.0.2 - Added body text preview to summary view
// Date: 2025-12-21

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
  const isAuthor = user && thread.user_id === user.id;
  const isPinned = thread.global_pinned === true;
  
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [images, setImages] = useState<any[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
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
    
    const { data } = await supabase
      .from('bbs_post_votes')
      .select('vote_type')
      .eq('post_id', thread.id)
      .eq('user_id', user.id)
      .single();

    if (data) {
      setUserVote(data.vote_type);
    }
  };

  const handleVote = async (voteType: 'up' | 'down') => {
    if (!user || voting) return;
    
    setVoting(true);
    
    // If clicking same vote, remove it
    if (userVote === voteType) {
      // Delete vote
      await supabase
        .from('bbs_post_votes')
        .delete()
        .eq('post_id', thread.id)
        .eq('user_id', user.id);
      
      setUserVote(null);
      setVoteScore((prev: number) => prev + (voteType === 'up' ? -1 : 1));
    } else {
      // Insert or update vote
      await supabase
        .from('bbs_post_votes')
        .upsert({
          post_id: thread.id,
          user_id: user.id,
          vote_type: voteType,
        });
      
      const scoreDelta = voteType === 'up' ? 1 : -1;
      const previousDelta = userVote === 'up' ? -1 : userVote === 'down' ? 1 : 0;
      setVoteScore((prev: number) => prev + scoreDelta + previousDelta);
      setUserVote(voteType);
    }
    
    // Update post vote_score in database
    await supabase.rpc('calculate_post_vote_score', { post_uuid: thread.id });
    
    setVoting(false);
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
        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition z-10">
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

            {/* Body Preview */}
            <p className="text-gray-700 mb-4 line-clamp-3">
              {thread.body}
            </p>

            {/* Image Gallery */}
            {!imagesLoading && images.length > 0 && (
              <div 
                onClick={(e) => e.preventDefault()}
                className="mb-4"
              >
                <ImageGallery images={images} />
              </div>
            )}

            {/* Link Preview */}
            {thread.link_url && (
              <div className="mb-4">
                <a
                  href={thread.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-2 text-gabriola-green hover:text-gabriola-green-dark text-sm font-medium"
                >
                  <Link2 className="w-4 h-4" />
                  <span className="underline truncate max-w-md">{thread.link_url}</span>
                </a>
              </div>
            )}

            {/* Author info */}
            <div className="flex items-center gap-3 mb-4">
              {/* Avatar */}
              {!thread.is_anonymous && thread.author?.avatar_url ? (
                <img 
                  src={thread.author.avatar_url} 
                  alt={thread.display_name}
                  className="w-8 h-8 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                  {thread.is_anonymous ? '?' : (thread.display_name?.charAt(0) || '?')}
                </div>
              )}
              
              {/* Name and badges */}
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                <span className="font-medium">{thread.display_name || 'Anonymous'}</span>
                
                {/* Resident Badge */}
                {!thread.is_anonymous && thread.author?.is_resident && (
                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                    🏝️ Resident
                  </span>
                )}
                
                {/* Anonymous Badge */}
                {thread.is_anonymous && (
                  <span className="text-xs bg-gray-200 px-2 py-1 rounded">🕶️ Anonymous</span>
                )}
                
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
                
                <span className="text-gray-400">•</span>
                <span>{formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}</span>
                
                {/* Edited indicator */}
                {thread.edited_at && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span className="text-xs italic text-gray-500">edited</span>
                  </>
                )}
              </div>
            </div>

            {/* Stats and Voting */}
            <div className="flex items-center gap-6 text-sm text-gray-600">
              {/* Voting buttons */}
              {user && (
                <div 
                  className="flex items-center gap-1"
                  onClick={(e) => e.preventDefault()}
                >
                  <button
                    onClick={() => handleVote('up')}
                    disabled={voting}
                    className={`p-1 rounded hover:bg-gray-100 transition ${
                      userVote === 'up' ? 'text-green-600' : 'text-gray-400'
                    }`}
                    title="Upvote"
                  >
                    <ChevronUp className="w-5 h-5" />
                  </button>
                  <span className={`font-semibold min-w-[2rem] text-center ${getScoreColor(voteScore)}`}>
                    {voteScore}
                  </span>
                  <button
                    onClick={() => handleVote('down')}
                    disabled={voting}
                    className={`p-1 rounded hover:bg-gray-100 transition ${
                      userVote === 'down' ? 'text-red-600' : 'text-gray-400'
                    }`}
                    title="Downvote"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </button>
                </div>
              )}
              
              {/* Just display score if not logged in */}
              {!user && (
                <span className={`flex items-center gap-2 font-semibold ${getScoreColor(voteScore)}`}>
                  <ChevronUp className="w-4 h-4" />
                  {voteScore}
                </span>
              )}

              {/* Reply count */}
              <span className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                {thread.reply_count || 0}
              </span>

              {/* View count */}
              <span className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                {thread.view_count || 0}
              </span>

              {/* Category badge */}
              <span className="px-3 py-1 bg-gray-100 rounded-full text-gray-600">
                {thread.category.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
              </span>

              {/* Image count indicator */}
              {images.length > 0 && (
                <span className="text-xs text-gray-500">
                  📷 {images.length}
                </span>
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
