// Path: app/community/thread/[id]/page.tsx
// Version: 6.0.0 - Post page redesign to match the rest of the site: smaller title, topic name
//                  (was the topic's web code), ISLAND NEWS label on Claude's summaries, votes and
//                  Share button under the post, icons instead of emoji, bottom menu on this page.
// Previous: 5.4.0 - Post text shows its formatting (bold, headings, lists, links) instead of
//                  showing ** and [text](url) marks; plain posts keep line breaks and clickable links
// Earlier: 5.3.1 - Added auto-linkify for URLs in body text
// Date: 2026-10-11

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowLeft, Loader2, Flag, Mail, Edit, Trash2, Eye, MessageSquare, Pin, Newspaper } from 'lucide-react';
import ReplyForm from '@/components/ReplyForm';
import ReplyList from '@/components/ReplyList';
import { useUser } from '@/components/AuthProvider';
import SendMessageModal from '@/components/SendMessageModal';
import VoteButtons from '@/components/VoteButtons';
import ImageLightbox from '@/components/ImageLightbox';
import ImageGallery from '@/components/ImageGallery';
import EditThreadModal from '@/components/EditThreadModal';
import ProfilePreviewCard from '@/components/ProfilePreviewCard';
import PostBody from '@/components/PostBody';
import ShareButton from '@/components/ShareButton';
import Footer from '@/components/Footer';
import { isNewsPost } from '@/lib/forum';

export default function ThreadPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const [thread, setThread] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [replyCount, setReplyCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isOwnPost, setIsOwnPost] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [images, setImages] = useState<any[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [topicName, setTopicName] = useState<string | null>(null);

  useEffect(() => {
    fetchThread();
    fetchReplyCount();
    fetchImages();
    
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
      // Topic's proper name (e.g. "Roads, Trails & Active Transportation")
      if (data.category) {
        const { data: cat } = await supabase.from('bbs_categories').select('name').eq('slug', data.category).maybeSingle();
        setTopicName(cat?.name || null);
      }
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

  const fetchImages = async () => {
    setImagesLoading(true);
    const { data, error } = await supabase
      .from('bbs_post_images')
      .select('*')
      .eq('post_id', params.id)
      .order('display_order', { ascending: true });

    if (!error && data) {
      setImages(data);
    }
    setImagesLoading(false);
  };

  const handleReplySuccess = () => {
    fetchReplyCount();
    setRefreshKey(prev => prev + 1);
  };

  const handleDeleteThread = async () => {
    if (!confirm('Delete this thread?\n\nThis will hide it from public view. Admins can restore it later if needed.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('bbs_posts')
        .update({
          is_active: false,
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id,
        })
        .eq('id', params.id);

      if (error) {
        console.error('Failed to delete thread:', error);
        alert('Failed to delete thread: ' + error.message);
        return;
      }

      // Redirect to forum after deletion
      router.push('/community');
    } catch (err) {
      console.error('Error deleting thread:', err);
      alert('Something went wrong while deleting the thread.');
    }
  };

  // Check if we can message the author
  const canMessageAuthor = user && !thread?.is_anonymous && !isOwnPost;

  const back = (
    <Link
      href="/community"
      prefetch={false}
      onClick={(e) => {
        e.preventDefault();
        router.push('/community');
      }}
      className="inline-flex items-center gap-1.5 min-h-[44px] text-gabriola-green hover:underline font-semibold cursor-pointer touch-manipulation"
    >
      <ArrowLeft className="w-5 h-5" aria-hidden="true" />
      Back to Forum
    </Link>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F2EA] flex items-center justify-center" role="status">
        <Loader2 className="w-10 h-10 text-gabriola-green animate-spin" aria-label="Loading" />
      </div>
    );
  }

  if (error || !thread) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F6F2EA]">
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center bg-white border border-[#E3DCCF] rounded-2xl p-8 max-w-md">
            <h1 className="font-display text-2xl font-bold text-gabriola-green-dark mb-2">Post not found</h1>
            <p className="text-[#5B6660] mb-4">This post doesn&apos;t exist or has been deleted.</p>
            {back}
          </div>
        </div>
        <Footer activeTab="forum" />
      </div>
    );
  }

  const news = isNewsPost(thread);
  const topic = topicName || (thread.category || '').replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  const shareUrl = `https://www.gabriolaconnects.ca/community/thread/${thread.id}`;

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F2EA] text-[#1F2A24]">
      <div className="flex-1 w-full max-w-3xl mx-auto px-4 py-4">
        {back}

        {/* Main post */}
        <article className={`bg-white border rounded-2xl p-5 md:p-8 mt-2 mb-6 ${thread.global_pinned ? 'border-[#E8C96A]' : 'border-[#E3DCCF]'}`}>
          {/* Labels: pinned / Island News / topic */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold mb-2">
            {thread.global_pinned && (
              <span className="inline-flex items-center gap-1 text-[#8A5A00] tracking-wide">
                <Pin className="w-3.5 h-3.5" aria-hidden="true" /> PINNED
              </span>
            )}
            {news && (
              <span className="inline-flex items-center gap-1 bg-[#002774] text-white px-2 py-0.5 rounded tracking-wide">
                <Newspaper className="w-3.5 h-3.5" aria-hidden="true" /> ISLAND NEWS
              </span>
            )}
            <span className={news ? 'text-[#002774]' : 'text-gabriola-green'}>{topic}</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold leading-snug text-[#1F2A24] mb-3">{thread.title}</h1>

          {/* Author and date */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-[#5B6660] mb-5">
            {!thread.is_anonymous && thread.author?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thread.author.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <span className="w-8 h-8 rounded-full bg-[#EEE8DD] flex items-center justify-center text-xs font-bold" aria-hidden="true">
                {thread.is_anonymous ? '?' : (thread.display_name?.charAt(0) || '?')}
              </span>
            )}
            {!thread.is_anonymous && user && thread.user_id ? (
              <ProfilePreviewCard userId={thread.user_id}>
                <span className="font-semibold text-gabriola-green hover:text-gabriola-green-dark cursor-pointer">
                  {thread.display_name || 'Anonymous'}
                </span>
              </ProfilePreviewCard>
            ) : (
              <span className="font-semibold text-[#3A4640]">{thread.display_name || 'Anonymous'}</span>
            )}
            {!thread.is_anonymous && thread.author?.is_resident && (
              <span className="bg-[#E6EFE8] text-gabriola-green-dark px-2 py-0.5 rounded-full text-xs font-semibold">Resident</span>
            )}
            {thread.is_anonymous && (
              <span className="bg-[#EEE8DD] px-2 py-0.5 rounded-full text-xs font-semibold">Anonymous</span>
            )}
            <span aria-hidden="true">·</span>
            <time>{format(new Date(thread.created_at), 'MMM d, yyyy · h:mm a')}</time>
            {canMessageAuthor && (
              <button
                onClick={() => setShowMessageModal(true)}
                className="inline-flex items-center gap-1 px-2.5 min-h-[32px] bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full text-xs font-semibold"
                title="Send private message"
              >
                <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                Message
              </button>
            )}
          </div>

          {/* External link */}
          {thread.link_url && (
            <a
              href={thread.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block mb-5 p-3 bg-[#F3F5FA] border border-[#D9E0EF] rounded-xl text-[#002774] hover:bg-[#E3E8F4] transition-colors break-all text-sm font-semibold"
            >
              {thread.link_url}
            </a>
          )}

          {/* Images */}
          {!imagesLoading && images.length > 0 && (
            <div className="mb-5">
              <ImageGallery images={images} />
            </div>
          )}

          {/* Text */}
          <PostBody
            text={thread.body}
            className="text-base md:text-lg text-[#1F2A24] leading-relaxed break-words"
          />

          {/* Votes, stats and actions */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-6 pt-4 border-t border-[#EEE8DD] text-sm text-[#5B6660]">
            {user ? (
              <VoteButtons
                itemId={thread.id}
                itemType="post"
                initialScore={thread.vote_score || 0}
                authorId={thread.user_id}
                onScoreChange={() => fetchThread()}
                horizontal
              />
            ) : (
              <span className="font-semibold" title="Votes">{thread.vote_score || 0} votes</span>
            )}
            <span className="inline-flex items-center gap-1" title="Views">
              <Eye className="w-4 h-4" aria-hidden="true" /> {thread.view_count || 0}
            </span>
            <span className="inline-flex items-center gap-1" title="Replies">
              <MessageSquare className="w-4 h-4" aria-hidden="true" /> {replyCount}
            </span>

            <div className="flex items-center gap-1 ml-auto">
              <ShareButton url={shareUrl} title={thread.title} />
              {isOwnPost && (
                <>
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="inline-flex items-center gap-1.5 min-h-[36px] px-2.5 rounded-lg font-semibold text-blue-700 hover:bg-blue-50"
                  >
                    <Edit className="w-4 h-4" aria-hidden="true" />
                    Edit
                  </button>
                  <button
                    onClick={handleDeleteThread}
                    className="inline-flex items-center gap-1.5 min-h-[36px] px-2.5 rounded-lg font-semibold text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                    Delete
                  </button>
                </>
              )}
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
                className="inline-flex items-center gap-1.5 min-h-[36px] px-2.5 rounded-lg font-semibold text-[#5B6660] hover:text-red-700 hover:bg-red-50"
              >
                <Flag className="w-4 h-4" aria-hidden="true" />
                Report
              </button>
            </div>
          </div>
        </article>

        {/* Replies */}
        <section className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gabriola-green-dark mb-3">
            Replies ({replyCount})
          </h2>
          <ReplyList key={refreshKey} postId={params.id as string} />
        </section>

        {/* Reply form, or sign-in invitation */}
        {user ? (
          <ReplyForm postId={params.id as string} onSuccess={handleReplySuccess} />
        ) : (
          <div className="bg-white border border-[#E3DCCF] rounded-2xl p-5 md:p-6 text-center mb-6">
            <h3 className="font-display text-xl font-bold text-gabriola-green-dark mb-1">
              Join the Conversation
            </h3>
            <p className="text-[#5B6660] mb-4">
              Sign in to reply to this thread and participate in the discussion.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link
                href="/signup"
                className="inline-flex items-center min-h-[44px] bg-gabriola-green text-white px-6 rounded-lg font-semibold hover:bg-gabriola-green-dark transition-colors"
              >
                Sign Up Free
              </Link>
              <Link
                href="/signin"
                className="inline-flex items-center min-h-[44px] bg-white text-gabriola-green border-2 border-gabriola-green px-6 rounded-lg font-semibold hover:bg-[#E6EFE8] transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        )}
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

      {/* Edit Thread Modal */}
      {showEditModal && isOwnPost && (
        <EditThreadModal
          thread={thread}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            fetchThread();
            fetchImages();
          }}
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

      <Footer activeTab="forum" />
    </div>
  );
}
