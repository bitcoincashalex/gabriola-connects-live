// Path: app/community/thread/[id]/page.tsx
// Version: 3.2.1 - Added authorId to VoteButtons to prevent self-voting
// Date: 2024-12-13

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowLeft, Loader2, Flag, Mail } from 'lucide-react';
import ReplyForm from '@/components/ReplyForm';
import ReplyList from '@/components/ReplyList';
import { useUser } from '@/components/AuthProvider';
import SendMessageModal from '@/components/SendMessageModal';
import VoteButtons from '@/components/VoteButtons';
import ImageLightbox from '@/components/ImageLightbox';

export default function ThreadPage() {
  const params = useParams();
  const { user } = useUser();
  const [thread, setThread] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [replyCount, setReplyCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isOwnPost, setIsOwnPost] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    fetchThread();
    fetchReplyCount();
    
    // Track view with IP
    trackView(params.id as string, 'post');
  }, [params.id, refreshKey]);

  useEffect(() => {
    if (user && thread) {
      setIsOwnPost(thread.user_id === user.id);
    }
  }, [user, thread]);

  const trackView = async (postId: string, type: 'post' | 'reply' = 'post') => {
    try {
      await fetch('/api/track-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, type }),
      });
    } catch (err) {
      console.error('Failed to track view:', err);
    }
  };

  const fetchThread = async () => {
    const { data, error } = await supabase
      .from('bbs_posts')
      .select(`
        *,
        author:users!bbs_posts_user_id_fkey(avatar_url, is_resident)
      `)
      .eq('id', params.id)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      console.error('Error fetching thread:', error);
      setError(true);
    } else {
      setThread(data);
    }
    setLoading(false);
  };

  const fetchReplyCount = async () => {
    const { count } = await supabase
      .from('bbs_replies')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', params.id)
      .eq('is_active', true);

    setReplyCount(count || 0);
  };

  const handleReplySuccess = () => {
    fetchReplyCount();
    setRefreshKey(prev => prev + 1);
  };

  // Check if we can message the author
  const canMessageAuthor = user && !thread?.is_anonymous && !isOwnPost;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-gabriola-green animate-spin" />
      </div>
    );
  }

  if (error || !thread) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Thread Not Found</h1>
          <p className="text-gray-600 mb-8">This thread doesn't exist or has been deleted.</p>
          <Link 
            href="/community" 
            className="inline-flex items-center gap-2 bg-gabriola-green text-white px-6 py-3 rounded-lg font-bold hover:bg-gabriola-green-dark"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Forum
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Back link */}
        <Link 
          href="/community" 
          className="inline-flex items-center gap-2 text-gabriola-green hover:underline mb-8 text-lg font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Forum
        </Link>

        {/* Main Thread */}
        <article className="bg-white rounded-2xl shadow-lg p-8 mb-10">
          <div className="flex gap-6">
            {/* Vote Buttons - Left side */}
            <div className="flex-shrink-0">
              <VoteButtons
                itemId={thread.id}
                itemType="post"
                initialScore={thread.vote_score || 0}
                authorId={thread.user_id}
                onScoreChange={() => fetchThread()}
              />
            </div>

            {/* Content - Right side */}
            <div className="flex-1 min-w-0">
              {/* Pinned Badge */}
              {thread.global_pinned && (
                <span className="inline-block bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-bold mb-4">
                  📌 PINNED
                </span>
              )}

              {/* Title */}
              <h1 className="text-4xl font-bold text-gray-900 mb-4">{thread.title}</h1>

              {/* Meta Info with Avatar and Resident Badge */}
              <div className="flex items-center gap-3 mb-6">
                {/* Avatar */}
                {!thread.is_anonymous && thread.author?.avatar_url ? (
                  <img 
                    src={thread.author.avatar_url} 
                    alt={thread.display_name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-500">
                    {thread.is_anonymous ? '?' : (thread.display_name?.charAt(0) || '?')}
                  </div>
                )}
                
                {/* Name and Badges */}
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium text-gabriola-green">{thread.display_name || 'Anonymous'}</span>
                  
                  {/* Resident Badge - only if not anonymous */}
                  {!thread.is_anonymous && thread.author?.is_resident && (
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                      🏝️ Resident
                    </span>
                  )}
                  
                  {/* Anonymous Badge */}
                  {thread.is_anonymous && (
                    <span className="bg-gray-200 px-2 py-1 rounded text-xs">🕶️ Anonymous</span>
                  )}
                  
                  {/* Send Message Button */}
                  {canMessageAuthor && (
                    <button
                      onClick={() => setShowMessageModal(true)}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-full transition text-xs font-medium"
                      title="Send private message"
                    >
                      <Mail className="w-3 h-3" />
                      Message
                    </button>
                  )}
                  
                  <span className="text-gray-400">•</span>
                  <time className="text-gray-600">{format(new Date(thread.created_at), 'PPP p')}</time>
                  <span className="text-gray-400">•</span>
                  <span className="bg-gabriola-green/10 text-gabriola-green px-3 py-1 rounded-full text-xs font-medium">
                    {thread.category.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </span>
                </div>
              </div>

              {/* External Link */}
              {thread.link_url && (
                <a
                  href={thread.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-600 hover:bg-blue-100 transition"
                >
                  🔗 <span className="font-medium">{thread.link_url}</span>
                </a>
              )}

              {/* Image */}
              {thread.image_url && (
                <div className="mb-6">
                  <img 
                    src={thread.image_url} 
                    alt="Post attachment" 
                    onClick={() => setLightboxImage(thread.image_url)}
                    className="max-w-full h-auto rounded-lg border-2 border-gray-200 cursor-pointer hover:border-gabriola-green transition"
                    style={{ maxHeight: '600px' }}
                    title="Click to view full size"
                  />
                </div>
              )}

              {/* Content Body */}
              <div className="prose prose-lg max-w-none mb-8 whitespace-pre-wrap text-gray-700 leading-relaxed">
                {thread.body}
              </div>

              {/* Stats and Actions */}
              <div className="flex items-center justify-between pt-6 border-t">
                <div className="flex items-center gap-6 text-sm text-gray-500">
                  <span>👁️ {thread.view_count || 0} views</span>
                  <span>💬 {replyCount} replies</span>
                </div>

                {/* Report button */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={async () => {
                      if (!user) {
                        alert('Sign in to report threads');
                        return;
                      }
                      if (!confirm('Report this thread as inappropriate?')) return;
                      await supabase
                        .from('bbs_posts')
                        .update({ reported_count: (thread.reported_count || 0) + 1 })
                        .eq('id', params.id);
                      alert('Thread reported. Moderators will review it.');
                      fetchThread();
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-red-600 hover:text-white rounded-lg transition"
                  >
                    <Flag className="w-4 h-4" />
                    Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        </article>

        {/* Replies Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Replies ({replyCount})
          </h2>
          <ReplyList key={refreshKey} postId={params.id as string} />
        </section>

        {/* Reply Form */}
        <ReplyForm postId={params.id as string} onSuccess={handleReplySuccess} />
      </div>

      {/* Send Message Modal - PRESERVED ✅ */}
      {showMessageModal && canMessageAuthor && (
        <SendMessageModal
          recipientId={thread.user_id}
          recipientName={thread.display_name || 'Anonymous'}
          currentUserId={user!.id}
          onClose={() => setShowMessageModal(false)}
        />
      )}

      {/* Image Lightbox */}
      {lightboxImage && (
        <ImageLightbox
          src={lightboxImage}
          alt="Post image"
          onClose={() => setLightboxImage(null)}
        />
      )}
    </div>
  );
}
