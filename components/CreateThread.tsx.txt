// Path: components/CreateThread.tsx
// Version: 3.1.0 - Removed role text suffixes from display_name (now using visual badges)
// Date: 2024-12-13

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@/lib/types';
import { Image, Link2, X, Loader2 } from 'lucide-react';

interface Props {
  currentUser: User;
  defaultCategoryId?: string;  // Now expects category ID, not slug
  onSuccess: () => void;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  display_order: number;
  is_active: boolean;
}

export default function CreateThread({ currentUser, defaultCategoryId, onSuccess }: Props) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState(defaultCategoryId || '');
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Fetch categories from database
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('bbs_categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (!error && data) {
      setCategories(data);
      
      // Set default category if not already set
      if (!categoryId && data.length > 0) {
        // Find first parent category (no parent_id)
        const firstParent = data.find(cat => !cat.parent_id);
        if (firstParent) {
          setCategoryId(firstParent.id);
        }
      }
    }
    setLoadingCategories(false);
  };

  // Build display name - simple, no role suffixes (now using visual badges)
  const displayName = isAnonymous
    ? 'Island Neighbour'
    : currentUser.full_name || currentUser.email || 'User';

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        alert('Image must be smaller than 25MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImageUrl(result);
        setImagePreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageUrl('');
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !categoryId || loading) {
      if (!categoryId) alert('Please select a category');
      return;
    }

    setLoading(true);

    const { error } = await supabase.from('bbs_posts').insert({
      title: title.trim(),
      body: content.trim(),
      category_id: categoryId,  // FIXED: Use category_id instead of category
      link_url: linkUrl.trim() || null,
      image_url: imageUrl || null,
      user_id: currentUser.id,
      display_name: displayName,
      is_anonymous: isAnonymous,
    });

    if (!error) {
      setTitle('');
      setContent('');
      setLinkUrl('');
      setImageUrl('');
      setImagePreview(null);
      setIsAnonymous(false);
      onSuccess();
    } else {
      console.error('Error creating thread:', error);
      alert('Failed to create thread: ' + error.message);
    }

    setLoading(false);
  };

  // Organize categories hierarchically
  const parentCategories = categories.filter(cat => !cat.parent_id);
  const getChildren = (parentId: string) => 
    categories.filter(cat => cat.parent_id === parentId);

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Start a New Thread</h2>

      {/* Title */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Title *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
          maxLength={200}
          required
        />
        <p className="text-xs text-gray-500 mt-1">{title.length}/200 characters</p>
      </div>

      {/* Category */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Category *
        </label>
        {loadingCategories ? (
          <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-gray-500">Loading categories...</span>
          </div>
        ) : (
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
            required
          >
            <option value="">Select a category...</option>
            {parentCategories.map((parent) => (
              <optgroup key={parent.id} label={parent.name}>
                <option value={parent.id}>{parent.name}</option>
                {getChildren(parent.id).map((child) => (
                  <option key={child.id} value={child.id}>
                    &nbsp;&nbsp;→ {child.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        )}
      </div>

      {/* Content */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Content *
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share your thoughts with the community..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent resize-none"
          rows={8}
          required
        />
        <p className="text-xs text-gray-500 mt-1">{content.length} characters</p>
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

      {/* Image Upload */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          <Image className="w-4 h-4" />
          Add an Image (optional, max 25MB)
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
        />
        {imagePreview && (
          <div className="mt-4 relative">
            <img 
              src={imagePreview} 
              alt="Preview" 
              className="max-w-full h-auto rounded-lg border-2 border-gray-200"
              style={{ maxHeight: '400px' }}
            />
            <button
              type="button"
              onClick={removeImage}
              className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
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
        {isAnonymous && (
          <p className="text-xs text-gray-500 mt-2 ml-8">
            Your identity will be hidden from other users, but moderators can see who posted.
          </p>
        )}
      </div>

      {/* Display Name Preview */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          Posting as: <span className="font-medium text-gabriola-green">{displayName}</span>
        </p>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || !title.trim() || !content.trim() || !categoryId}
        className="w-full bg-gabriola-green text-white py-4 rounded-lg font-bold text-lg hover:bg-gabriola-green-dark transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
    </form>
  );
}
