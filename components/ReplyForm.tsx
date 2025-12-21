// components/ReplyForm.tsx
// Version: 3.1.1 - CRITICAL: Fixed state closure bug in paste handler
// Date: 2025-12-21

'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { Loader2, Link2 } from 'lucide-react';
import ImageUploadManager from './ImageUploadManager';

interface ImageData {
  id: string;
  url: string;
  file?: File;
  caption?: string;
  compressing?: boolean;
}

interface Props {
  postId: string;
  parentReplyId?: string | null;
  onSuccess?: () => void;
  onCancel?: () => void;
  placeholder?: string;
}

export default function ReplyForm({ postId, parentReplyId = null, onSuccess, onCancel, placeholder }: Props) {
  const { user } = useUser();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [images, setImages] = useState<ImageData[]>([]);
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

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    // Check if paste contains an image
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault(); // Prevent default paste of image data as text
        
        if (images.length >= 10) {
          alert('Maximum 10 images allowed.');
          return;
        }

        const file = item.getAsFile();
        if (file) {
          // Process the image using the same logic as ImageUploadManager
          const tempId = `temp-${Date.now()}-${Math.random()}`;
          
          // Add placeholder (use functional setState!)
          const placeholder = {
            id: tempId,
            url: '',
            compressing: true
          };
          setImages(prevImages => [...prevImages, placeholder]);

          try {
            // Import compression utility
            const { compressImage } = await import('@/lib/imageCompression');
            
            const result = await compressImage(file, {
              maxWidth: 1920,
              maxHeight: 1920,
              quality: 0.85,
              maxSizeMB: 10,
            });

            if (!result.success) {
              setImages(prevImages => prevImages.filter(img => img.id !== tempId));
              alert(result.error);
              return;
            }

            // Read as base64
            const reader = new FileReader();
            reader.onloadend = () => {
              const imageData = {
                id: tempId,
                url: reader.result as string,
                file: result.file,
                compressing: false
              };
              
              setImages(prevImages => 
                prevImages.map(img => img.id === tempId ? imageData : img)
              );
            };
            reader.readAsDataURL(result.file);
          } catch (err) {
            console.error('Image processing error:', err);
            setImages(prevImages => prevImages.filter(img => img.id !== tempId));
          }
        }
        break; // Only handle first image
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || loading) return;

    // Check if any images are still compressing
    if (images.some(img => img.compressing)) {
      alert('Please wait for all images to finish compressing.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Create the reply
      const { data: reply, error: insertError } = await supabase
        .from('bbs_replies')
        .insert({
          post_id: postId,
          parent_reply_id: parentReplyId,
          user_id: user.id,
          body: body.trim(),
          link_url: linkUrl.trim() || null,
          display_name: displayName,
          is_anonymous: isAnonymous,
          is_active: true,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 2. Insert all images with their order
      if (images.length > 0 && reply) {
        const imageInserts = images.map((img, index) => ({
          reply_id: reply.id,
          image_url: img.url,
          caption: img.caption || null,
          display_order: index,
          uploaded_by: user.id,
        }));

        const { error: imagesError } = await supabase
          .from('bbs_reply_images')
          .insert(imageInserts);

        if (imagesError) {
          console.error('Error inserting images:', imagesError);
          // Don't fail the whole reply if images fail
        }
      }

      // 3. Update parent post reply count
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
      <h3 className="text-2xl font-bold text-gray-900 mb-6">Post a Reply</h3>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Reply Body */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your Reply
        </label>
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onPaste={handlePaste}
          placeholder={placeholder || "Share your thoughts..."}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent resize-none"
          rows={6}
          required
        />
        <p className="text-xs text-gray-500 mt-1">{body.length} characters • Paste images with Ctrl+V</p>
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
          disabled={loading || !body.trim() || images.some(img => img.compressing)}
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
