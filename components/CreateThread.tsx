// Path: components/CreateThread.tsx
// Version: 2.2.0 - 10MB limit + client-side image compression
// Date: 2024-12-09

'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@/lib/types';
import { Image, Link2, X, Loader2 } from 'lucide-react';
import { compressImage } from '@/lib/imageCompression';

interface Props {
  currentUser: User;
  defaultCategory?: string;
  onSuccess: () => void;
}

const categories = [
  'general', 'events', 'buy-sell', 'ferry', 'politics-canada', 'politics-us',
  'politics-world', 'politics-local', 'environment', 'housing', 'health',
  'lost-found', 'recommendations', 'announcements', 'rideshare', 'volunteer',
  'gardening-farming', 'arts-culture', 'spirituality', 'off-topic'
];

export default function CreateThread({ currentUser, defaultCategory = 'general', onSuccess }: Props) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(defaultCategory);
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [compressionStats, setCompressionStats] = useState<string>('');

  // Build display name with badges
  const displayName = isAnonymous
    ? 'Island Neighbour'
    : (() => {
        let name = currentUser.full_name || currentUser.email || 'User';
        const user = currentUser as any;
        if (user.is_resident) name += ' (Resident)';
        if (user.role === 'admin' || user.is_super_admin) name += ' (Admin)';
        if (user.is_moderator) name += ' (Mod)';
        if (user.is_fire) name += ' (Fire)';
        if (user.is_police) name += ' (Police)';
        if (user.is_medic) name += ' (Medic)';
        return name;
      })();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

  const removeImage = () => {
    setImageUrl('');
    setImagePreview(null);
    setCompressionStats('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || loading) return;

    setLoading(true);

    const { error } = await supabase.from('bbs_posts').insert({
      title: title.trim(),
      body: content.trim(),
      category,
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
      setCompressionStats('');
      onSuccess();
    } else {
      alert('Failed to create thread: ' + error.message);
    }

    setLoading(false);
  };

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
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
            </option>
          ))}
        </select>
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
          Add an Image (optional, max 10MB)
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          disabled={compressing}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent disabled:bg-gray-100"
        />
        
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
        disabled={loading || compressing || !title.trim() || !content.trim()}
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
