// components/CreateThread.tsx
// Version: 4.0.1 - Fixed author_id → user_id field name bug
// Date: 2025-12-21

'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Link2, X, Clipboard } from 'lucide-react';
import ImageUploadManager from './ImageUploadManager';

interface ImageData {
  id: string;
  url: string;
  file?: File;
  caption?: string;
  compressing?: boolean;
}

interface Props {
  currentUser: any;
  defaultCategoryId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function CreateThread({ currentUser, defaultCategoryId, onSuccess, onCancel }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [categoryId, setCategoryId] = useState(defaultCategoryId || '');
  const [linkUrl, setLinkUrl] = useState('');
  const [images, setImages] = useState<ImageData[]>([]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch categories
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('bbs_categories')
      .select('*')
      .eq('is_active', true)
      .eq('is_archived', false)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error);
      return;
    }

    setCategories(data || []);
  };

  const displayName = isAnonymous ? 'Island Neighbour' : (currentUser?.full_name || currentUser?.email || 'Anonymous');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim() || !categoryId || loading) return;

    // Check if any images are still compressing
    if (images.some(img => img.compressing)) {
      alert('Please wait for all images to finish compressing.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Create the post
      const { data: post, error: insertError } = await supabase
        .from('bbs_posts')
        .insert({
          category_id: categoryId,
          title: title.trim(),
          body: body.trim(),
          user_id: currentUser.id,
          link_url: linkUrl.trim() || null,
          display_name: displayName,
          is_anonymous: isAnonymous,
          view_count: 0,
          reply_count: 0,
          is_pinned: false,
          is_active: true,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 2. Insert all images with their order
      if (images.length > 0 && post) {
        const imageInserts = images.map((img, index) => ({
          post_id: post.id,
          image_url: img.url,
          caption: img.caption || null,
          display_order: index,
          uploaded_by: currentUser.id,
        }));

        const { error: imagesError } = await supabase
          .from('bbs_post_images')
          .insert(imageInserts);

        if (imagesError) {
          console.error('Error inserting images:', imagesError);
          // Don't fail the whole post if images fail
        }
      }

      // Reset form
      setTitle('');
      setBody('');
      setCategoryId(defaultCategoryId || '');
      setLinkUrl('');
      setImages([]);
      setIsAnonymous(false);
      setLoading(false);
      
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8">
      <h3 className="text-2xl font-bold text-gray-900 mb-6">Create New Thread</h3>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Category */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Category *
        </label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
        >
          <option value="">Select a category...</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.icon} {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Title */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Thread Title *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What's your thread about?"
          required
          maxLength={200}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">{title.length}/200 characters</p>
      </div>

      {/* Body */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Thread Content *
        </label>
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share your thoughts, questions, or information..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent resize-none"
          rows={8}
          required
        />
        <p className="text-xs text-gray-500 mt-1">{body.length} characters</p>
      </div>

      {/* Multi-Image Upload */}
      <div className="mb-6">
        <ImageUploadManager
          images={images}
          onImagesChange={setImages}
          maxImages={10}
          showCaptions={false}
        />
      </div>

      {/* Link */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          <Link2 className="w-4 h-4" />
          Add a Link (optional)
        </label>
        <input
          type="url"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder="https://example.com"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
        />
      </div>

      {/* Anonymous Toggle */}
      <div className="mb-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="w-5 h-5 text-gabriola-green border-gray-300 rounded focus:ring-gabriola-green"
          />
          <span className="text-sm text-gray-700">
            Post anonymously as "Island Neighbour" 🕶️
          </span>
        </label>
      </div>

      {/* Display Name Preview */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          Posting as: <span className="font-medium text-gabriola-green">{displayName}</span>
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading || !title.trim() || !body.trim() || !categoryId || images.some(img => img.compressing)}
          className="flex-1 bg-gabriola-green text-white py-3 rounded-lg font-bold hover:bg-gabriola-green-dark transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating Thread...
            </>
          ) : (
            'Create Thread'
          )}
        </button>
        
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
