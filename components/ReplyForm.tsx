// components/ReplyForm.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { Loader2, Image as ImageIcon, Link2, X } from 'lucide-react';

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

      setBody('');
      setLinkUrl('');
      setImageUrl('');
      setImagePreview(null);
      setIsAnonymous(false);
      setLoading(false);
      
      if (onSuccess) {
        onSuccess();
      } else {
        window.location.reload();
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">
        {parentReplyId ? 'Reply to Comment' : placeholder || 'Add a Reply'}
      </h3>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <textarea
        placeholder="Write your reply..."
        value={body}
        onChange={e => setBody(e.target.value)}
        rows={4}
        required
        className="w-full p-4 border-2 border-gray-200 rounded-lg mb-4 focus:ring-2 focus:ring-gabriola-green focus:border-transparent outline-none resize-none"
      />

      {/* URL Link */}
      <div className="relative mb-4">
        <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input 
          type="url" 
          placeholder="Add a link (optional)" 
          value={linkUrl} 
          onChange={e => setLinkUrl(e.target.value)} 
          className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent" 
        />
      </div>

      {/* Image Upload */}
      <div className="mb-4">
        <label className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gabriola-green hover:bg-gabriola-green/5 transition">
          <ImageIcon className="w-6 h-6 text-gray-400" />
          <div className="flex-1">
            <p className="font-medium text-gray-700">Add an image (optional)</p>
            <p className="text-sm text-gray-500">Max 25MB • JPG, PNG, GIF, WebP</p>
          </div>
          <input 
            type="file" 
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden" 
          />
        </label>

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
              className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input 
            type="checkbox" 
            checked={isAnonymous} 
            onChange={e => setIsAnonymous(e.target.checked)} 
            className="w-5 h-5" 
          />
          <span className="text-sm font-medium text-gray-700">Reply anonymously</span>
        </label>

        <div className="flex gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border-2 border-gray-300 rounded-lg font-bold hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
          <button 
            type="submit" 
            disabled={loading || !body.trim()}
            className="bg-gabriola-green text-white px-6 py-3 rounded-lg font-bold hover:bg-gabriola-green-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Posting...' : 'Post Reply'}
          </button>
        </div>
      </div>

      <div className="mt-3 text-sm text-gray-600">
        Posting as: <span className="font-bold text-gabriola-green">{displayName}</span>
      </div>
    </form>
  );
}
