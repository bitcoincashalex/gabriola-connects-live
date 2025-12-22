// app/admin/forum/posts/page.tsx
// Version: 2.1.0 - Correct two-level delete: soft delete in bbs_posts, Forum Admin can move to bbs_deleted_posts
// Date: 2025-12-21

'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { 
  MessageSquare, Search, Eye, EyeOff, Trash2, Pin, 
  AlertCircle, Flag, Globe, X, Calendar
} from 'lucide-react';
import Link from 'next/link';

interface PostData {
  id: string;
  title: string;
  body: string;
  user_id: string;
  display_name: string | null;
  is_anonymous: boolean;
  is_hidden: boolean;
  is_pinned: boolean;
  global_pinned: boolean;
  category: string;
  vote_score: number;
  reply_count: number;
  view_count: number;
  reported_count: number;
  created_at: string;
  deleted_at: string | null;
}

export default function PostModerationPage() {
  const { user } = useUser();
  const [posts, setPosts] = useState<PostData[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'reports' | 'votes'>('newest');
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedPost, setSelectedPost] = useState<PostData | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Check admin access
  const isAdmin = user && (
    (user as any).is_super_admin ||
    (user as any).admin_forum ||
    (user as any).forum_moderator
  );

  const isForumAdmin = user && ((user as any).is_super_admin || (user as any).admin_forum);

  useEffect(() => {
    if (!isAdmin) {
      window.location.href = '/';
      return;
    }
    fetchCategories();
    fetchPosts();
  }, [isAdmin]);

  useEffect(() => {
    filterAndSortPosts();
  }, [posts, searchQuery, filterCategory, filterStatus, sortBy]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('bbs_categories')
      .select('slug, name')
      .eq('is_active', true)
      .order('display_order');
    
    setCategories(data || []);
  };

  const fetchPosts = async () => {
    try {
      // Only fetch from bbs_posts (includes soft-deleted with deleted_at)
      const { data, error } = await supabase
        .from('bbs_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortPosts = () => {
    let filtered = [...posts];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.body?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(p => p.category === filterCategory);
    }

    // Status filter
    if (filterStatus !== 'all') {
      if (filterStatus === 'hidden') {
        filtered = filtered.filter(p => p.is_hidden);
      } else if (filterStatus === 'pinned') {
        filtered = filtered.filter(p => p.is_pinned || p.global_pinned);
      } else if (filterStatus === 'reported') {
        filtered = filtered.filter(p => p.reported_count > 0);
      } else if (filterStatus === 'deleted') {
        filtered = filtered.filter(p => p.deleted_at !== null);
      }
    }

    // Sort
    if (sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === 'reports') {
      filtered.sort((a, b) => (b.reported_count || 0) - (a.reported_count || 0));
    } else if (sortBy === 'votes') {
      filtered.sort((a, b) => (b.vote_score || 0) - (a.vote_score || 0));
    }

    setFilteredPosts(filtered);
  };

  const handleToggleHidden = async (postId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('bbs_posts')
        .update({ is_hidden: !currentStatus })
        .eq('id', postId);

      if (error) throw error;

      // Log action
      await supabase.rpc('log_moderation_action', {
        p_moderator_id: user?.id,
        p_action_type: currentStatus ? 'unhide_post' : 'hide_post',
        p_target_type: 'post',
        p_target_id: postId
      });

      fetchPosts();
    } catch (error) {
      console.error('Error toggling hidden:', error);
      alert('Failed to update post');
    }
  };

  const handleTogglePinned = async (postId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('bbs_posts')
        .update({ is_pinned: !currentStatus })
        .eq('id', postId);

      if (error) throw error;

      // Log action
      await supabase.rpc('log_moderation_action', {
        p_moderator_id: user?.id,
        p_action_type: currentStatus ? 'unpin_post' : 'pin_post',
        p_target_type: 'post',
        p_target_id: postId
      });

      fetchPosts();
    } catch (error) {
      console.error('Error toggling pinned:', error);
      alert('Failed to update post');
    }
  };

  const handleToggleGlobalPinned = async (postId: string, currentStatus: boolean) => {
    if (!isForumAdmin) return;

    try {
      const { error } = await supabase
        .from('bbs_posts')
        .update({ global_pinned: !currentStatus })
        .eq('id', postId);

      if (error) throw error;

      // Log action
      await supabase.rpc('log_moderation_action', {
        p_moderator_id: user?.id,
        p_action_type: currentStatus ? 'global_unpin_post' : 'global_pin_post',
        p_target_type: 'post',
        p_target_id: postId
      });

      fetchPosts();
    } catch (error) {
      console.error('Error toggling global pinned:', error);
      alert('Failed to update post');
    }
  };

  const handleDeletePost = async () => {
    if (!selectedPost || !isForumAdmin) return;

    setActionLoading(true);
    try {
      // Soft delete - mark as deleted in bbs_posts
      const { error: deleteError } = await supabase
        .from('bbs_posts')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id,
          is_active: false
        })
        .eq('id', selectedPost.id);

      if (deleteError) throw deleteError;

      // Log action
      await supabase.rpc('log_moderation_action', {
        p_moderator_id: user?.id,
        p_action_type: 'delete_post',
        p_target_type: 'post',
        p_target_id: selectedPost.id,
        p_reason: deleteReason
      });

      setShowDeleteModal(false);
      setDeleteReason('');
      setSelectedPost(null);
      alert('Post soft deleted. You can restore it or permanently delete it from the admin panel.');
      fetchPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestorePost = async (postId: string) => {
    if (!isForumAdmin) return;
    if (!confirm('Restore this post? It will become visible in the forum again.')) return;

    try {
      const { error } = await supabase
        .from('bbs_posts')
        .update({
          deleted_at: null,
          deleted_by: null,
          is_active: true
        })
        .eq('id', postId);

      if (error) throw error;

      // Log action
      await supabase.rpc('log_moderation_action', {
        p_moderator_id: user?.id,
        p_action_type: 'restore_post',
        p_target_type: 'post',
        p_target_id: postId
      });

      alert('Post restored successfully!');
      fetchPosts();
    } catch (error) {
      console.error('Error restoring post:', error);
      alert('Failed to restore post');
    }
  };

  const handleMoveToDeleted = async (postId: string) => {
    if (!isForumAdmin) return;
    if (!confirm('Move this post to deleted posts? Only super admin can restore it after this.')) return;

    try {
      // 1. Get the post data
      const { data: post, error: fetchError } = await supabase
        .from('bbs_posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (fetchError) throw fetchError;
      if (!post) throw new Error('Post not found');

      // 2. Move to bbs_deleted_posts
      const { error: moveError } = await supabase
        .from('bbs_deleted_posts')
        .insert({
          original_id: post.id,
          data: post,
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id
        });

      if (moveError) throw moveError;

      // 3. Delete from bbs_posts
      const { error: deleteError } = await supabase
        .from('bbs_posts')
        .delete()
        .eq('id', postId);

      if (deleteError) throw deleteError;

      // 4. Log action
      await supabase.rpc('log_moderation_action', {
        p_moderator_id: user?.id,
        p_action_type: 'move_to_deleted',
        p_target_type: 'post',
        p_target_id: postId
      });

      alert('Post moved to deleted posts. Only super admin can access it now.');
      fetchPosts();
    } catch (error) {
      console.error('Error moving post to deleted:', error);
      alert('Failed to move post: ' + (error as Error).message);
    }
  };

  if (!isAdmin) {
    return <div className="text-center py-20">Access Denied</div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gabriola-green"></div>
          <p className="mt-4 text-gray-600">Loading posts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Link href="/admin/forum" className="text-gray-500 hover:text-gray-700">
              Admin
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900">Post Moderation</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Post Moderation</h1>
          <p className="text-gray-600">Review, hide, pin, and manage forum posts</p>
          
          {/* Super Admin Link to Deleted Posts */}
          {user?.is_super_admin && (
            <Link
              href="/admin/forum/deleted-posts"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition font-medium"
            >
              <Trash2 className="w-4 h-4" />
              View Permanently Deleted Posts ({filteredPosts.filter(p => p.deleted_at).length} soft-deleted here)
            </Link>
          )}
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600">Total Posts</p>
            <p className="text-2xl font-bold text-gray-900">{posts.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600">Hidden</p>
            <p className="text-2xl font-bold text-yellow-600">
              {posts.filter(p => p.is_hidden).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600">Reported</p>
            <p className="text-2xl font-bold text-red-600">
              {posts.filter(p => p.reported_count > 0).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600">Pinned</p>
            <p className="text-2xl font-bold text-green-600">
              {posts.filter(p => p.is_pinned || p.global_pinned).length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search posts..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
              />
            </div>

            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat.slug} value={cat.slug}>{cat.name}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="hidden">Hidden</option>
              <option value="pinned">Pinned</option>
              <option value="reported">Reported</option>
              <option value="deleted">Deleted</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
            >
              <option value="newest">Newest First</option>
              <option value="reports">Most Reported</option>
              <option value="votes">Highest Voted</option>
            </select>
          </div>
        </div>

        {/* Posts List */}
        <div className="space-y-4">
          {filteredPosts.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
              No posts found
            </div>
          ) : (
            filteredPosts.map((post) => (
              <div
                key={post.id}
                className={`bg-white rounded-xl shadow-sm p-6 ${
                  post.is_hidden ? 'border-2 border-yellow-300' : ''
                } ${post.deleted_at ? 'opacity-50 border-2 border-red-300' : ''}`}
              >
                {/* Post Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{post.title}</h3>
                      {post.global_pinned && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          Global Pin
                        </span>
                      )}
                      {post.is_pinned && !post.global_pinned && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                          <Pin className="w-3 h-3" />
                          Pinned
                        </span>
                      )}
                      {post.is_hidden && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full flex items-center gap-1">
                          <EyeOff className="w-3 h-3" />
                          Hidden
                        </span>
                      )}
                      {post.reported_count > 0 && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full flex items-center gap-1">
                          <Flag className="w-3 h-3" />
                          {post.reported_count} {post.reported_count === 1 ? 'Report' : 'Reports'}
                        </span>
                      )}
                      {post.deleted_at && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full flex items-center gap-1">
                          <Trash2 className="w-3 h-3" />
                          Deleted
                        </span>
                      )}
                    </div>
                    <p className="text-gray-700 line-clamp-2 mb-2">{post.body}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>By {post.display_name || 'Anonymous'}</span>
                      <span>•</span>
                      <span>{new Date(post.created_at).toLocaleString()}</span>
                      <span>•</span>
                      <span>⬆️ {post.vote_score || 0}</span>
                      <span>💬 {post.reply_count || 0}</span>
                      <span>👁️ {post.view_count || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  {post.deleted_at ? (
                    // Soft-deleted post - show disabled View link
                    <span className="px-3 py-1 bg-gray-200 text-gray-500 rounded-lg text-sm cursor-not-allowed">
                      View Post (Deleted)
                    </span>
                  ) : (
                    // Active post - show working link
                    <Link
                      href={`/community/thread/${post.id}`}
                      target="_blank"
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition"
                    >
                      View Post
                    </Link>
                  )}

                  {!post.deleted_at && (
                    <>
                      <button
                        onClick={() => handleToggleHidden(post.id, post.is_hidden)}
                        className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-sm hover:bg-yellow-200 transition flex items-center gap-1"
                      >
                        {post.is_hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        {post.is_hidden ? 'Unhide' : 'Hide'}
                      </button>

                      <button
                        onClick={() => handleTogglePinned(post.id, post.is_pinned)}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 transition flex items-center gap-1"
                      >
                        <Pin className="w-4 h-4" />
                        {post.is_pinned ? 'Unpin' : 'Pin'}
                      </button>

                      {isForumAdmin && (
                        <>
                          <button
                            onClick={() => handleToggleGlobalPinned(post.id, post.global_pinned)}
                            className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200 transition flex items-center gap-1"
                          >
                            <Globe className="w-4 h-4" />
                            {post.global_pinned ? 'Remove Global' : 'Global Pin'}
                          </button>

                          <button
                            onClick={() => {
                              setSelectedPost(post);
                              setShowDeleteModal(true);
                            }}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 transition flex items-center gap-1"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </>
                      )}
                    </>
                  )}

                  {/* Actions for SOFT-DELETED posts - Forum Admin can restore or permanently delete */}
                  {post.deleted_at && isForumAdmin && (
                    <>
                      <button
                        onClick={() => handleRestorePost(post.id)}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 transition flex items-center gap-1 font-medium"
                      >
                        <AlertCircle className="w-4 h-4" />
                        Restore Post
                      </button>

                      <button
                        onClick={() => handleMoveToDeleted(post.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition flex items-center gap-1 font-medium"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Permanently
                      </button>
                    </>
                  )}

                  {post.reported_count > 0 && (
                    <Link
                      href={`/admin/forum/reports?post=${post.id}`}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 transition flex items-center gap-1"
                    >
                      <Flag className="w-4 h-4" />
                      View Reports
                    </Link>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Results Count */}
        <div className="mt-6 text-sm text-gray-600 text-center">
          Showing {filteredPosts.length} of {posts.length} posts
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && selectedPost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Delete Post</h2>
            <p className="text-gray-600 mb-4">
              You are about to delete: <strong>{selectedPost.title}</strong>
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for deletion (optional)
              </label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Why are you deleting this post?"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-500 focus:outline-none"
              />
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                This post will be soft-deleted and can be restored from the deleted_posts table.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDeletePost}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50"
              >
                {actionLoading ? 'Deleting...' : 'Delete Post'}
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteReason('');
                }}
                disabled={actionLoading}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
