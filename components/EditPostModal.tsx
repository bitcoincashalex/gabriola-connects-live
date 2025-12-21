// components/EditPostModal.tsx
// Version: 1.0.1 - Fixed author_id → user_id field name bug
// Date: 2025-12-21

'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Link2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ImageUploadManager from './ImageUploadManager';

interface ImageData {
  id: string;
  url: string;
  file?: File;
  caption?: string;
  compressing?: boolean;
  existingId?: string; // For tracking existing images from DB
}

interface Props {
  post: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditPostModal({ post, onClose, onSuccess }: Props) {
  const [title, setTitle] = useState(post.title || '');
  const [body, setBody] = useState(post.body || '');
  const [linkUrl, setLinkUrl] = useState(post.link_url || '');
  const [images, setImages] = useState<ImageData[]>([]);
  const [existingImages, setExistingImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingImages, setLoadingImages] = useState(true);
  const [error, setError] = useState('');

  // Fetch existing images
  useEffect(() => {
    fetchExistingImages();
  }, [post.id]);

  const fetchExistingImages = async () => {
    setLoadingImages(true);
    const { data, error } = await supabase
      .from('bbs_post_images')
      .select('*')
      .eq('post_id', post.id)
      .order('display_order', { ascending: true });

    if (!error && data) {
      setExistingImages(data);
      // Convert to ImageData format for the upload manager
      const imageData: ImageData[] = data.map(img => ({
        id: img.id,
        url: img.image_url,
        caption: img.caption || undefined,
        existingId: img.id, // Track that this is from DB
      }));
      setImages(imageData);
    }
    setLoadingImages(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim() || loading) return;

    // Check if any images are still compressing
    if (images.some(img => img.compressing)) {
      alert('Please wait for all images to finish compressing.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Update the post
      const { error: updateError } = await supabase
        .from('bbs_posts')
        .update({
          title: title.trim(),
          body: body.trim(),
          link_url: linkUrl.trim() || null,
          edited_at: new Date().toISOString(),
          edited_by: post.user_id,
          edit_count: (post.edit_count || 0) + 1,
        })
        .eq('id', post.id);

      if (updateError) throw updateError;

      // 2. Handle images
      // Delete images that were removed
      const existingImageIds = images
        .filter(img => img.existingId)
        .map(img => img.existingId);
      
      const imagesToDelete = existingImages
        .filter(img => !existingImageIds.includes(img.id))
        .map(img => img.id);

      if (imagesToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('bbs_post_images')
          .delete()
          .in('id', imagesToDelete);

        if (deleteError) console.error('Error deleting images:', deleteError);
      }

      // Insert new images (ones without existingId)
      const newImages = images.filter(img => !img.existingId);
      if (newImages.length > 0) {
        const imageInserts = newImages.map((img, index) => ({
          post_id: post.id,
          image_url: img.url,
          caption: img.caption || null,
          display_order: existingImageIds.length + index,
          uploaded_by: post.user_id,
        }));

        const { error: insertError } = await supabase
          .from('bbs_post_images')
          .insert(imageInserts);

        if (insertError) console.error('Error inserting images:', insertError);
      }

      // Update display_order for all remaining images
      const allFinalImages = images.map((img, index) => ({
        id: img.existingId || img.id,
        display_order: index,
      })).filter(img => img.id);

      for (const img of allFinalImages.filter(img => images.find(i => i.existingId === img.id))) {
        await supabase
          .from('bbs_post_images')
          .update({ display_order: img.display_order })
          .eq('id', img.id);
      }

      setLoading(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-900">Edit Post</h3>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Title */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">{title.length}/200 characters</p>
          </div>

          {/* Body */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content *
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={8}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">{body.length} characters</p>
          </div>

          {/* Images */}
          {loadingImages ? (
            <div className="mb-6 text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-gabriola-green mx-auto mb-2" />
              <p className="text-sm text-gray-600">Loading images...</p>
            </div>
          ) : (
            <div className="mb-6">
              <ImageUploadManager
                images={images}
                onImagesChange={setImages}
                maxImages={10}
                showCaptions={false}
              />
            </div>
          )}

          {/* Link */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              Link (optional)
            </label>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
            />
          </div>

          {/* Edit History Info */}
          {post.edit_count > 0 && (
            <div className="mb-6 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
              This post has been edited {post.edit_count} time{post.edit_count !== 1 ? 's' : ''}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || !title.trim() || !body.trim() || images.some(img => img.compressing)}
              className="flex-1 bg-gabriola-green text-white py-3 rounded-lg font-bold hover:bg-gabriola-green-dark transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
            
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
