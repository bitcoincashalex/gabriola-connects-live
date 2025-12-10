// Path: app/mod/hidden/page.tsx
// Version: 1.0.0 - Hidden Content Management
// Date: 2024-12-09

'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { 
  ArrowLeft, 
  Eye, 
  Trash2,
  RotateCcw,
  EyeOff
} from 'lucide-react';

interface HiddenPost {
  id: string;
  title: string;
  body: string;
  category: string;
  display_name: string;
  created_at: string;
  deleted_at: string;
  deleted_by: string;
  reply_count: number;
}

export default function HiddenContent() {
  const { user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hiddenPosts, setHiddenPosts] = useState<HiddenPost[]>([]);
  const [filter, setFilter] = useState<'all' | 'today' | 'week'>('all');

  useEffect(() => {
    // Check permissions
    if (!user) {
      router.push('/signin');
      return;
    }

    const isModerator = (user as any).forum_moderator || (user as any).admin_forum || user.is_super_admin;
    if (!isModerator) {
      router.push('/');
      alert('Access denied: Moderators only');
      return;
    }

    fetchHiddenPosts();
  }, [user, router, filter]);

  const fetchHiddenPosts = async () => {
    setLoading(true);

    let query = supabase
      .from('bbs_posts')
      .select('*')
      .eq('is_active', false)
      .order('deleted_at', { ascending: false });

    // Apply time filter
    if (filter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      query = query.gte('deleted_at', today.toISOString());
    } else if (filter === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      query = query.gte('deleted_at', weekAgo.toISOString());
    }

    const { data, error } = await query;

    if (!error && data) {
      setHiddenPosts(data);
    }

    setLoading(false);
  };

  const handleRestore = async (postId: string) => {
    if (!confirm('Restore this thread? It will be visible to everyone again.')) return;

    const { error } = await supabase
      .from('bbs_posts')
      .update({
        is_active: true,
        deleted_at: null,
        deleted_by: null,
      })
      .eq('id', postId);

    if (error) {
      alert('Failed to restore thread');
    } else {
      fetchHiddenPosts();
    }
  };

  const handlePermanentDelete = async (postId: string) => {
    if (!confirm('PERMANENTLY DELETE this thread? This cannot be undone!\n\nAll replies will also be deleted.')) return;
    if (!confirm('Are you absolutely sure? This is irreversible!')) return;

    // First delete all replies
    await supabase
      .from('bbs_replies')
      .delete()
      .eq('post_id', postId);

    // Then delete the post
    const { error } = await supabase
      .from('bbs_posts')
      .delete()
      .eq('id', postId);

    if (error) {
      alert('Failed to delete thread');
    } else {
      fetchHiddenPosts();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-xl text-gray-600">Loading hidden content...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/mod"
            className="inline-flex items-center gap-2 text-purple-600 hover:underline mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </Link>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Hidden Content</h1>
              <p className="text-gray-600">Review and restore hidden threads</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'all' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setFilter('week')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'week' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setFilter('today')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'today' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Today
            </button>
          </div>
        </div>

        {/* Hidden Posts List */}
        {hiddenPosts.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <EyeOff className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-xl text-gray-600">No hidden threads found</p>
            <p className="text-gray-500 mt-2">
              {filter === 'all' 
                ? 'All threads are visible' 
                : `No threads hidden in the selected time period`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {hiddenPosts.map(post => (
              <div key={post.id} className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{post.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      <span className="font-medium">{post.display_name}</span>
                      <span>•</span>
                      <span>Posted {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                      <span>•</span>
                      <span className="px-2 py-1 bg-gray-100 rounded">
                        {post.category.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </span>
                    </div>
                    <div className="text-gray-700 mb-4 line-clamp-3">
                      {post.body}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>💬 {post.reply_count || 0} replies</span>
                      {post.deleted_at && (
                        <>
                          <span>•</span>
                          <span className="text-red-600">
                            Hidden {formatDistanceToNow(new Date(post.deleted_at), { addSuffix: true })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                  <Link
                    href={`/community/thread/${post.id}`}
                    target="_blank"
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition text-sm font-medium"
                  >
                    <Eye className="w-4 h-4" />
                    View Thread
                  </Link>
                  <button
                    onClick={() => handleRestore(post.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition text-sm font-medium"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Restore
                  </button>
                  <button
                    onClick={() => handlePermanentDelete(post.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition text-sm font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                    Permanent Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-blue-900 mb-2">ℹ️ About Hidden Content</h3>
          <ul className="space-y-1 text-blue-800 text-sm">
            <li>• <strong>Hidden threads</strong> are not visible to regular users but preserved in the database</li>
            <li>• <strong>Restore</strong> makes the thread visible again instantly</li>
            <li>• <strong>Permanent Delete</strong> removes the thread forever (cannot be undone)</li>
            <li>• Hidden threads can still be accessed by direct link if users have it</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
