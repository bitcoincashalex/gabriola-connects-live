// app/admin/forum/deleted-posts/page.tsx
// Version: 1.0.0 - Super Admin page to manage permanently deleted posts
// Date: 2025-12-21

'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Trash2, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface DeletedPost {
  id: string;
  original_id: string;
  data: any;
  deleted_at: string;
  deleted_by: string;
}

export default function DeletedPostsPage() {
  const { user } = useUser();
  const [deletedPosts, setDeletedPosts] = useState<DeletedPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Only super admin can access
  const isSuperAdmin = user?.is_super_admin;

  useEffect(() => {
    if (!isSuperAdmin) {
      window.location.href = '/';
      return;
    }
    fetchDeletedPosts();
  }, [isSuperAdmin]);

  const fetchDeletedPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('bbs_deleted_posts')
        .select('*')
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      setDeletedPosts(data || []);
    } catch (error) {
      console.error('Error fetching deleted posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestorePost = async (deletedPost: DeletedPost) => {
    if (!confirm('Restore this post? It will become visible in the forum again.')) return;

    try {
      // 1. Restore to bbs_posts
      const { error: restoreError } = await supabase
        .from('bbs_posts')
        .insert({
          ...deletedPost.data,
          is_active: true,
          deleted_at: null,
          deleted_by: null
        });

      if (restoreError) throw restoreError;

      // 2. Remove from bbs_deleted_posts
      const { error: removeError } = await supabase
        .from('bbs_deleted_posts')
        .delete()
        .eq('id', deletedPost.id);

      if (removeError) throw removeError;

      // 3. Log action
      await supabase.rpc('log_moderation_action', {
        p_moderator_id: user?.id,
        p_action_type: 'super_admin_restore_post',
        p_target_type: 'post',
        p_target_id: deletedPost.original_id
      });

      alert('Post restored successfully!');
      fetchDeletedPosts();
    } catch (error) {
      console.error('Error restoring post:', error);
      alert('Failed to restore post: ' + (error as Error).message);
    }
  };

  const handlePermanentDelete = async (deletedPost: DeletedPost) => {
    if (!confirm('PERMANENTLY delete this post? This cannot be undone!')) return;
    if (!confirm('Are you absolutely sure? This will delete the post and all its replies forever.')) return;

    try {
      const postId = deletedPost.original_id;

      // 1. Delete all replies
      await supabase.from('bbs_replies').delete().eq('post_id', postId);

      // 2. Delete all reply images  
      await supabase.from('bbs_reply_images').delete().eq('post_id', postId);

      // 3. Delete all post images
      await supabase.from('bbs_post_images').delete().eq('post_id', postId);

      // 4. Delete all post votes
      await supabase.from('bbs_post_votes').delete().eq('post_id', postId);

      // 5. Delete all reply votes
      await supabase.from('bbs_reply_votes').delete().eq('post_id', postId);

      // 6. Delete from bbs_deleted_posts
      const { error } = await supabase
        .from('bbs_deleted_posts')
        .delete()
        .eq('id', deletedPost.id);

      if (error) throw error;

      // 7. Log action
      await supabase.rpc('log_moderation_action', {
        p_moderator_id: user?.id,
        p_action_type: 'super_admin_permanent_delete',
        p_target_type: 'post',
        p_target_id: postId
      });

      alert('Post permanently deleted from database!');
      fetchDeletedPosts();
    } catch (error) {
      console.error('Error permanently deleting post:', error);
      alert('Failed to permanently delete: ' + (error as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gabriola-green"></div>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/forum/posts"
          className="inline-flex items-center gap-2 text-gabriola-green hover:text-green-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Post Moderation
        </Link>
        <h1 className="text-4xl font-bold text-gray-900">Deleted Posts (Super Admin)</h1>
        <p className="text-gray-600 mt-2">
          Posts that were permanently deleted by forum admins. Only you can restore or remove these.
        </p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Total Deleted Posts</div>
          <div className="text-3xl font-bold text-gray-900">{deletedPosts.length}</div>
        </div>
        <div className="bg-red-50 rounded-xl shadow p-6">
          <div className="text-sm text-red-600 mb-1">⚠️ Warning</div>
          <div className="text-sm text-gray-700">Permanent delete cannot be undone</div>
        </div>
      </div>

      {/* Deleted Posts List */}
      {deletedPosts.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-xl">
          <Trash2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-xl text-gray-600">No deleted posts</p>
          <p className="text-gray-500 mt-2">Posts deleted by forum admins will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {deletedPosts.map(deletedPost => {
            const post = deletedPost.data;
            return (
              <div
                key={deletedPost.id}
                className="bg-red-50 border-2 border-red-200 rounded-xl p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{post.title}</h3>
                      <span className="px-2 py-1 bg-red-600 text-white text-xs rounded-full font-medium">
                        DELETED
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-3">
                      <span>By {post.display_name || 'Anonymous'}</span>
                      <span className="mx-2">•</span>
                      <span>Deleted {new Date(deletedPost.deleted_at).toLocaleString()}</span>
                      <span className="mx-2">•</span>
                      <span>Category: {post.category}</span>
                    </div>

                    <p className="text-gray-700 line-clamp-3 mb-4">{post.body}</p>

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>⬆️ {post.vote_score || 0} votes</span>
                      <span>💬 {post.reply_count || 0} replies</span>
                      <span>👁️ {post.view_count || 0} views</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleRestorePost(deletedPost)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 font-medium whitespace-nowrap"
                    >
                      <AlertCircle className="w-4 h-4" />
                      Restore Post
                    </button>

                    <button
                      onClick={() => handlePermanentDelete(deletedPost)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2 font-medium whitespace-nowrap"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Forever
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
