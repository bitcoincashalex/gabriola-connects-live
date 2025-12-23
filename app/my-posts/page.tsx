// app/my-posts/page.tsx
// Version: 1.0.2 - Simplified: Single "View Post" button (removed redundant Edit)
// Date: 2025-12-22

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { 
  MessageSquare, ArrowLeft, Search, Filter, Trash2, 
  Eye, ThumbsUp, ThumbsDown, Loader2, AlertCircle 
} from 'lucide-react';

type ContentType = 'thread' | 'reply';
type FilterType = 'all' | 'threads' | 'replies' | 'deleted';
type SortType = 'newest' | 'oldest' | 'most_voted' | 'most_replies';

interface Post {
  id: string;
  type: ContentType;
  title?: string; // For threads
  body?: string; // For replies
  thread_title?: string; // Parent thread for replies
  thread_id?: string; // Parent thread ID for replies
  is_anonymous: boolean;
  category?: string;
  vote_score: number;
  reply_count?: number; // For threads
  is_active: boolean;
  created_at: string;
  edited_at?: string;
}

export default function MyPostsPage() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('newest');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/signin');
      } else {
        loadPosts();
      }
    }
  }, [user, authLoading]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [posts, filter, sort, searchQuery]);

  const loadPosts = async () => {
    setLoading(true);
    
    // Fetch threads
    const { data: threadsData } = await supabase
      .from('bbs_posts')
      .select('id, title, is_anonymous, category, vote_score, reply_count, is_active, created_at, edited_at')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });

    // Fetch replies
    const { data: repliesData } = await supabase
      .from('bbs_replies')
      .select(`
        id,
        body,
        is_anonymous,
        vote_score,
        is_active,
        created_at,
        edited_at,
        post:bbs_posts!bbs_replies_post_id_fkey(id, title)
      `)
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });

    // Combine and format
    const allPosts: Post[] = [];

    // Add threads
    if (threadsData) {
      threadsData.forEach(thread => {
        allPosts.push({
          id: thread.id,
          type: 'thread',
          title: thread.title,
          is_anonymous: thread.is_anonymous,
          category: thread.category,
          vote_score: thread.vote_score,
          reply_count: thread.reply_count,
          is_active: thread.is_active,
          created_at: thread.created_at,
          edited_at: thread.edited_at,
        });
      });
    }

    // Add replies
    if (repliesData) {
      repliesData.forEach((reply: any) => {
        allPosts.push({
          id: reply.id,
          type: 'reply',
          body: reply.body,
          thread_title: reply.post?.title,
          thread_id: reply.post?.id,
          is_anonymous: reply.is_anonymous,
          vote_score: reply.vote_score,
          is_active: reply.is_active,
          created_at: reply.created_at,
          edited_at: reply.edited_at,
        });
      });
    }

    setPosts(allPosts);
    setLoading(false);
  };

  const applyFiltersAndSort = () => {
    let filtered = [...posts];

    // Apply filter
    switch (filter) {
      case 'threads':
        filtered = filtered.filter(p => p.type === 'thread');
        break;
      case 'replies':
        filtered = filtered.filter(p => p.type === 'reply');
        break;
      case 'deleted':
        filtered = filtered.filter(p => !p.is_active);
        break;
      case 'all':
      default:
        filtered = filtered.filter(p => p.is_active);
        break;
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => {
        if (p.type === 'thread') {
          return p.title?.toLowerCase().includes(query);
        } else {
          return p.body?.toLowerCase().includes(query) || 
                 p.thread_title?.toLowerCase().includes(query);
        }
      });
    }

    // Apply sort
    switch (sort) {
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'most_voted':
        filtered.sort((a, b) => b.vote_score - a.vote_score);
        break;
      case 'most_replies':
        filtered.sort((a, b) => (b.reply_count || 0) - (a.reply_count || 0));
        break;
      case 'newest':
      default:
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }

    setFilteredPosts(filtered);
  };

  const handleDelete = async (post: Post) => {
    const confirmMsg = post.type === 'thread' 
      ? 'Delete this thread? This will also delete all replies.'
      : 'Delete this reply?';
    
    if (!confirm(confirmMsg)) return;

    const table = post.type === 'thread' ? 'bbs_posts' : 'bbs_replies';
    
    const { error } = await supabase
      .from(table)
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
        deleted_by: user!.id,
      })
      .eq('id', post.id);

    if (!error) {
      loadPosts();
    } else {
      alert('Failed to delete. Please try again.');
    }
  };

  const getFilterCount = (filterType: FilterType) => {
    switch (filterType) {
      case 'threads':
        return posts.filter(p => p.type === 'thread' && p.is_active).length;
      case 'replies':
        return posts.filter(p => p.type === 'reply' && p.is_active).length;
      case 'deleted':
        return posts.filter(p => !p.is_active).length;
      case 'all':
      default:
        return posts.filter(p => p.is_active).length;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-gabriola-green animate-spin" />
      </div>
    );
  }

  const totalCount = posts.filter(p => p.is_active).length;
  const threadsCount = posts.filter(p => p.type === 'thread' && p.is_active).length;
  const repliesCount = posts.filter(p => p.type === 'reply' && p.is_active).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/community"
            className="inline-flex items-center gap-2 text-gabriola-green hover:underline mb-4 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Forum
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Posts</h1>
              <p className="text-gray-600 mt-1">
                {threadsCount} thread{threadsCount !== 1 ? 's' : ''} • {repliesCount} repl{repliesCount !== 1 ? 'ies' : 'y'}
              </p>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'all'
                  ? 'bg-gabriola-green text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({getFilterCount('all')})
            </button>
            <button
              onClick={() => setFilter('threads')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'threads'
                  ? 'bg-gabriola-green text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Threads ({getFilterCount('threads')})
            </button>
            <button
              onClick={() => setFilter('replies')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'replies'
                  ? 'bg-gabriola-green text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Replies ({getFilterCount('replies')})
            </button>
            <button
              onClick={() => setFilter('deleted')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'deleted'
                  ? 'bg-gabriola-green text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Deleted ({getFilterCount('deleted')})
            </button>
          </div>

          {/* Search and Sort */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search my posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortType)}
              className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="most_voted">Most Voted</option>
              <option value="most_replies">Most Replies</option>
            </select>
          </div>
        </div>

        {/* Posts List */}
        {filteredPosts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {searchQuery ? 'No matching posts found' : 'No posts yet'}
            </h3>
            <p className="text-gray-600">
              {searchQuery 
                ? 'Try a different search term' 
                : 'Start a conversation in the forum!'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPosts.map((post) => (
              <div
                key={`${post.type}-${post.id}`}
                className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Type Badge */}
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          post.type === 'thread'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        <MessageSquare className="w-3 h-3" />
                        {post.type === 'thread' ? 'Thread' : 'Reply'}
                      </span>
                      
                      {post.is_anonymous && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                          🕶️ Anonymous (You)
                        </span>
                      )}
                      
                      {!post.is_active && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          🗑️ Deleted
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    {post.type === 'thread' ? (
                      <>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                          {post.title}
                        </h3>
                        {post.category && (
                          <span className="text-sm text-gray-500">{post.category}</span>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-gray-600 mb-1">
                          Reply to: <span className="font-medium">{post.thread_title}</span>
                        </p>
                        <p className="text-gray-800 line-clamp-2">
                          {post.body}
                        </p>
                      </>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-4 h-4" />
                        {post.vote_score} votes
                      </span>
                      
                      {post.type === 'thread' && (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4" />
                          {post.reply_count || 0} replies
                        </span>
                      )}
                      
                      <span>
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </span>
                      
                      {post.edited_at && (
                        <span className="italic">(edited)</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <Link
                      href={post.type === 'thread' 
                        ? `/community/thread/${post.id}` 
                        : `/community/thread/${post.thread_id}#reply-${post.id}`}
                      className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                      title="View Post"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                    
                    {post.is_active && (
                      <button
                        onClick={() => handleDelete(post)}
                        className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
