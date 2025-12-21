// Path: components/CreateThread.tsx
// Version: 3.0.0 - Added copy/paste image support
// Date: 2025-12-20

'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Image as ImageIcon, Link2, X, Clipboard } from 'lucide-react';
import { compressImage } from '@/lib/imageCompression';

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
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [compressionStats, setCompressionStats] = useState<string>('');
  const [error, setError] = useState('');
  const [pasteHint, setPasteHint] = useState(false);

  // Fetch categories
  useState(() => {
    fetchCategories();
  });

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

  // Process image from File object (used by both file upload and paste)
  const processImageFile = async (file: File) => {
    setCompressing(true);
    setCompressionStats('');

    try {
      // Compress image (max 10MB before compression, resizes to 1920px, 85% quality)
      const result = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.85,
        maxSizeMB: 10,
      });

      if (!result.success) {
        alert(result.error);
        setCompressing(false);
        return;
      }

      // Calculate compression savings
      const originalMB = (result.originalSize / 1024 / 1024).toFixed(2);
      const compressedMB = (result.compressedSize / 1024 / 1024).toFixed(2);
      const savedPercent = (((result.originalSize - result.compressedSize) / result.originalSize) * 100).toFixed(0);
      
      setCompressionStats(`✅ Compressed from ${originalMB} MB to ${compressedMB} MB (saved ${savedPercent}%)`);

      // Read compressed file
      const reader = new FileReader();
      reader.onloadend = () => {
        const resultData = reader.result as string;
        setImageUrl(resultData);
        setImagePreview(resultData);
        setCompressing(false);
      };
      reader.readAsDataURL(result.file);

    } catch (err) {
      console.error('Compression error:', err);
      alert('Failed to compress image. Please try a smaller file.');
      setCompressing(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processImageFile(file);
  };

  // Handle paste event for images
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    // Look for image in clipboard
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault(); // Prevent default paste behavior for images
        
        const file = item.getAsFile();
        if (file) {
          // Show hint that image was pasted
          setPasteHint(true);
          setTimeout(() => setPasteHint(false), 3000);
          
          await processImageFile(file);
        }
        break;
      }
    }
  };

  const removeImage = () => {
    setImageUrl('');
    setImagePreview(null);
    setCompressionStats('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim() || !categoryId || loading) return;

    setLoading(true);
    setError('');

    const { error: insertError } = await supabase.from('bbs_posts').insert({
      category_id: categoryId,
      title: title.trim(),
      body: body.trim(),
      author_id: currentUser.id,
      link_url: linkUrl.trim() || null,
      image_url: imageUrl || null,
      display_name: displayName,
      is_anonymous: isAnonymous,
      view_count: 0,
      reply_count: 0,
      is_pinned: false,
      is_active: true,
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
    } else {
      // Reset form
      setTitle('');
      setBody('');
      setCategoryId(defaultCategoryId || '');
      setLinkUrl('');
      setImageUrl('');
      setImagePreview(null);
      setIsAnonymous(false);
      setCompressionStats('');
      setLoading(false);
      if (onSuccess) onSuccess();
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

      {/* Paste hint */}
      {pasteHint && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 animate-fade-in">
          <Clipboard className="w-5 h-5 text-green-600" />
          <p className="text-green-800 text-sm font-medium">Image pasted! Processing...</p>
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
          <span className="ml-2 text-xs text-gray-500 font-normal">
            (💡 Tip: You can paste images with Ctrl+V or Cmd+V)
          </span>
        </label>
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onPaste={handlePaste}
          placeholder="Share your thoughts, questions, or information..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent resize-none"
          rows={8}
          required
        />
        <p className="text-xs text-gray-500 mt-1">{body.length} characters</p>
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
          <ImageIcon className="w-4 h-4" />
          Add an Image (optional, max 10MB)
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          disabled={compressing}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent disabled:bg-gray-100"
        />
        <p className="text-xs text-gray-500 mt-1">
          Or paste an image with Ctrl+V (Cmd+V on Mac) in the content area above
        </p>
        
        {/* Compression Status */}
        {compressing && (
          <div className="mt-3 flex items-center gap-2 text-blue-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Compressing image...</span>
          </div>
        )}
        
        {compressionStats && (
          <div className="mt-2 text-xs text-green-600 font-medium">
            {compressionStats}
          </div>
        )}

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
          disabled={loading || compressing || !title.trim() || !body.trim() || !categoryId}
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
