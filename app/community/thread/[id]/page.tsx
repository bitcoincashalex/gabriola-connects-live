// Path: app/community/thread/[id]/page.tsx
// Version: 2.0.0 - Proper like/unlike with tracking, blocks own posts
// Date: 2024-12-09

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowLeft, Loader2, Heart, Flag } from 'lucide-react';
import ReplyForm from '@/components/ReplyForm';
import ReplyList from '@/components/ReplyList';
import { useUser } from '@/components/AuthProvider';

export default function ThreadPage() {
  const params = useParams();
  const { user } = useUser();
  const [thread, setThread] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [replyCount, setReplyCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [isOwnPost, setIsOwnPost] = useState(false);

  useEffect(() => {
    fetchThread();
    fetchReplyCount();
    
    // Track view with IP
    trackView(params.id as string, 'post');
  }, [params.id, refreshKey]);

  useEffect(() => {
    if (user && thread) {
      checkIfLiked();
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
      .select('*')
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

  const checkIfLiked = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('bbs_post_likes')
      .select('id')
      .eq('post_id', params.id)
      .eq('user_id', user.id)
      .single();

    setHasLiked(!!data);
  };

  const handleLikeToggle = async () => {
    if (!user) {
      alert('Sign in to like threads');
      return;
    }

    if (isOwnPost) {
      alert('You cannot like your own post');
      return;
    }

    try {
      if (hasLiked) {
        // Unlike - delete the like
        const { error } = await supabase
          .from('bbs_post_likes')
          .delete()
          .eq('post_id', params.id)
          .eq('user_id', user.id);

        if (!error) {
          setHasLiked(false);
          fetchThread(); // Refresh to get updated like_count
        }
      } else {
        // Like - insert a like
        const { error } = await supabase
          .from('bbs_post_likes')
          .insert({
            post_id: params.id,
            user_id: user.id,
          });

        if (error) {
          if (error.code === '23505') {
            // Unique constraint violation - already liked
            alert('You already liked this post');
          } else {
            console.error('Like error:', error);
            alert('Failed to like post');
          }
        } else {
          setHasLiked(true);
          fetchThread(); // Refresh to get updated like_count
        }
      }
    } catch (err) {
      console.error('Like toggle error:', err);
    }
  };

  const handleReplySuccess = () => {
    fetchReplyCount();
    setRefreshKey(prev => prev + 1);
  };

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
          {/* Pinned Badge */}
          {thread.global_pinned && (
            <span className="inline-block bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-bold mb-4">
              📌 PINNED
            </span>
          )}

          {/* Title */}
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{thread.title}</h1>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-3 text-gray-600 mb-6 text-sm">
            <span className="font-medium text-gabriola-green">{thread.display_name || 'Anonymous'}</span>
            {thread.is_anonymous && (
              <span className="bg-gray-200 px-2 py-1 rounded text-xs">🕶️ Anonymous</span>
            )}
            <span>•</span>
            <time>{format(new Date(thread.created_at), 'PPP p')}</time>
            <span>•</span>
            <span className="bg-gabriola-green/10 text-gabriola-green px-3 py-1 rounded-full text-xs font-medium">
              {thread.category.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
            </span>
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
                className="max-w-full h-auto rounded-lg border-2 border-gray-200"
                style={{ maxHeight: '600px' }}
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
              <span>❤️ {thread.like_count || 0} likes</span>
            </div>

            {/* Like and Report buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleLikeToggle}
                disabled={isOwnPost}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  isOwnPost
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : hasLiked
                    ? 'bg-red-100 text-red-600 hover:bg-red-200'
                    : 'bg-gray-100 hover:bg-red-100 hover:text-red-600'
                }`}
                title={isOwnPost ? 'Cannot like own post' : hasLiked ? 'Unlike' : 'Like'}
              >
                <Heart className={`w-4 h-4 ${hasLiked ? 'fill-current' : ''}`} />
                {hasLiked ? 'Liked' : 'Like'}
              </button>
              
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
    </div>
  );
}
