// components/ReplyItem.tsx
// Version: 6.0.2 - Added auto-linkify for URLs in reply body
// Date: 2025-12-21

'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Link2, ChevronUp, ChevronDown, Trash2, Flag, Pencil } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import ImageGallery from './ImageGallery';
import EditReplyModal from './EditReplyModal';
import LinkifyText from './LinkifyText';

export default function ReplyItem({ reply, depth, onRefresh }: { reply: any; depth: number; onRefresh?: () => void }) {
  const { user } = useUser();
  const [images, setImages] = useState<any[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [voteScore, setVoteScore] = useState(reply.vote_score || 0);
  const [voting, setVoting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const isAuthor = user && reply.user_id === user.id;
  const isAdmin = user?.is_super_admin || user?.role === 'admin';

  // Fetch images for this reply
  useEffect(() => {
    fetchImages();
    if (user) {
      fetchUserVote();
    }
  }, [reply.id, user]);

  const fetchImages = async () => {
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

  const fetchUserVote = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('bbs_reply_votes')
      .select('vote_type')
      .eq('reply_id', reply.id)
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
      await supabase
        .from('bbs_reply_votes')
        .delete()
        .eq('reply_id', reply.id)
        .eq('user_id', user.id);
      
      setUserVote(null);
      setVoteScore((prev: number) => prev + (voteType === 'up' ? -1 : 1));
    } else {
      await supabase
        .from('bbs_reply_votes')
        .upsert({
          reply_id: reply.id,
          user_id: user.id,
          vote_type: voteType,
        });
      
      const scoreDelta = voteType === 'up' ? 1 : -1;
      const previousDelta = userVote === 'up' ? -1 : userVote === 'down' ? 1 : 0;
      setVoteScore((prev: number) => prev + scoreDelta + previousDelta);
      setUserVote(voteType);
    }
    
    // Update reply vote_score
    await supabase.rpc('calculate_reply_vote_score', { reply_uuid: reply.id });
    
    setVoting(false);
  };

  const handleDelete = async () => {
    const confirmMessage = isAdmin 
      ? 'Hide this reply from public view?'
      : 'Delete your reply? This action cannot be undone.';
      
    if (!confirm(confirmMessage)) return;

    const { error } = await supabase
      .from('bbs_replies')
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', reply.id);

    if (error) {
      console.error('Failed to delete reply:', error);
      alert('Something went wrong: ' + error.message);
    } else {
      if (onRefresh) onRefresh();
    }
  };

  const handleReport = async () => {
    if (!user) {
      alert('Please sign in to report content.');
      return;
    }

    const reason = prompt('Why are you reporting this reply?\n\nReasons: Spam, Harassment, Inappropriate Content, Misinformation, Other');
    if (!reason) return;

    const { error } = await supabase
      .from('content_reports')
      .insert({
        content_type: 'reply',
        content_id: reply.id,
        reported_by: user.id,
        reason: reason.trim(),
      });

    if (error) {
      if (error.code === '23505') {
        alert('You have already reported this reply.');
      } else {
        console.error('Error reporting:', error);
        alert('Failed to submit report. Please try again.');
      }
    } else {
      alert('Thank you for your report. Our moderators will review it shortly.');
    }
  };

  const getScoreColor = (score: number) => {
    if (score > 0) return 'text-green-600';
    if (score < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  // Calculate indentation based on depth
  const getIndentClass = () => {
    if (depth === 0) return '';
    if (depth === 1) return 'ml-4 pl-4 border-l-4 border-gray-200';
    return 'ml-8 md:ml-' + Math.min(depth * 4, 16) + ' pl-4 border-l-4 border-gray-300';
  };
  
  return (
    <>
      <div className={getIndentClass()}>
        <div className="bg-white rounded-xl shadow-sm p-5 my-4 relative group">
          {/* Action buttons (top right) */}
          <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition">
            {/* Edit button (author only) */}
            {isAuthor && !reply.is_anonymous && (
              <button
                onClick={() => setShowEditModal(true)}
                className="p-1.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition"
                title="Edit reply"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            
            {/* Delete button (author or admin) */}
            {(isAuthor || isAdmin) && (
              <button
                onClick={handleDelete}
                className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                title="Delete reply"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            
            {/* Report button */}
            {user && !isAuthor && (
              <button
                onClick={handleReport}
                className="p-1.5 bg-orange-500 text-white rounded-full hover:bg-orange-600 transition"
                title="Report reply"
              >
                <Flag className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Header */}
          <div className="flex items-center gap-3 text-sm text-gray-600 mb-3">
            <span className="font-medium">{reply.display_name}</span>
            {reply.is_anonymous && <span className="text-xs bg-gray-200 px-2 py-1 rounded">Anonymous</span>}
            <span>•</span>
            <time>{formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}</time>
            
            {/* Edited indicator */}
            {reply.edited_at && (
              <>
                <span>•</span>
                <span className="text-xs italic text-gray-500">edited</span>
              </>
            )}
          </div>

          {/* Body/Content */}
          <div className="whitespace-pre-wrap text-gray-800 mb-3">
            <LinkifyText>{reply.body || reply.content}</LinkifyText>
          </div>

          {/* Image Gallery */}
          {!imagesLoading && images.length > 0 && (
            <div className="mb-3">
              <ImageGallery images={images} />
            </div>
          )}

          {/* Link */}
          {reply.link_url && (
            <div className="mb-3">
              <a
                href={reply.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-gabriola-green hover:text-gabriola-green-dark text-sm font-medium"
              >
                <Link2 className="w-4 h-4" />
                <span className="underline truncate max-w-md">{reply.link_url}</span>
              </a>
            </div>
          )}

          {/* Voting and stats */}
          <div className="flex items-center gap-4 text-sm">
            {/* Voting buttons */}
            {user && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleVote('up')}
                  disabled={voting}
                  className={`p-1 rounded hover:bg-gray-100 transition ${
                    userVote === 'up' ? 'text-green-600' : 'text-gray-400'
                  }`}
                  title="Upvote"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <span className={`font-semibold min-w-[1.5rem] text-center ${getScoreColor(voteScore)}`}>
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
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            )}
            
            {/* Just display score if not logged in */}
            {!user && voteScore !== 0 && (
              <span className={`flex items-center gap-1 font-semibold ${getScoreColor(voteScore)}`}>
                <ChevronUp className="w-4 h-4" />
                {voteScore}
              </span>
            )}

            {/* Image count indicator */}
            {images.length > 0 && (
              <span className="text-xs text-gray-500">
                📷 {images.length} image{images.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Nested replies */}
          {reply.children?.length > 0 && (
            <div className="mt-6">
              {reply.children.map((child: any) => (
                <ReplyItem 
                  key={child.id} 
                  reply={child} 
                  depth={depth + 1}
                  onRefresh={onRefresh}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && isAuthor && (
        <EditReplyModal
          reply={reply}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            fetchImages(); // Refresh images after edit
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </>
  );
}
