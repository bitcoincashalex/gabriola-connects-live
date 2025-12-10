// Path: components/ReplyForm.tsx
// Version: 2.1.0 - 10MB limit + client-side image compression
// Date: 2024-12-09

'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { Loader2, Image as ImageIcon, Link2, X } from 'lucide-react';
import { compressImage } from '@/lib/imageCompression';

interface Props {
  postId: string;
  parentReplyId?: string | null;
  onSuccess?: () => void;
  onCancel?: () => void;
  placeholder?: string;
}

export default function ReplyForm({ postId, parentReplyId = null, onSuccess, onCancel, placeholder }: Props) {
  const { user } = useUser();
  const [body, setBody] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [compressionStats, setCompressionStats] = useState<string>('');
  const [error, setError] = useState('');

  if (!user) {
    return (
      <div className="bg-gray-50 rounded-xl p-6 text-center">
        <p className="text-gray-600 mb-4">Sign in to reply to this thread</p>
        <a 
          href="/signin" 
          className="inline-block bg-gabriola-green text-white px-6 py-3 rounded-lg font-bold hover:bg-gabriola-green-dark"
        >
          Sign In
        </a>
      </div>
    );
  }

  const displayName = isAnonymous ? 'Island Neighbour' : (user.full_name || user.email || 'Anonymous');

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
    if (!body.trim() || loading) return;

    setLoading(true);
    setError('');

    const { error: insertError } = await supabase.from('bbs_replies').insert({
      post_id: postId,
      parent_reply_id: parentReplyId,
      user_id: user.id,
      body: body.trim(),
      link_url: linkUrl.trim() || null,
      image_url: imageUrl || null,
      display_name: displayName,
      is_anonymous: isAnonymous,
      is_active: true,
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
    } else {
      // Update parent post reply count
      const { count } = await supabase
        .from('bbs_replies')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId)
        .eq('is_active', true);

      await supabase
        .from('bbs_posts')
        .update({ reply_count: count || 0 })
        .eq('id', postId);

      // Reset form
      setBody('');
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
      <h3 className="text-2xl font-bold text-gray-900 mb-6">Post a Reply</h3>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Reply Body */}
      <div className="mb-6">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={placeholder || "Share your thoughts..."}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent resize-none"
          rows={6}
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
            Reply anonymously as "Island Neighbour" 🕶️
          </span>
        </label>
      </div>

      {/* Display Name Preview */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          Replying as: <span className="font-medium text-gabriola-green">{displayName}</span>
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading || compressing || !body.trim()}
          className="flex-1 bg-gabriola-green text-white py-3 rounded-lg font-bold hover:bg-gabriola-green-dark transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Posting...
            </>
          ) : (
            'Post Reply'
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
