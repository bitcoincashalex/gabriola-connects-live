// Path: components/CreateThread.tsx
// Version: 2.1.0 - Use category_id from database lookup
// Date: 2024-12-09

'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@/lib/types';
import { Image, Link2, X } from 'lucide-react';

interface Props {
  currentUser: User;
  defaultCategory?: string;  // Category slug (e.g., 'general', 'politics-us')
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

  // Build display name with badges
  const displayName = isAnonymous
    ? 'Island Neighbour'
    : (() => {
        let name = currentUser.full_name || currentUser.email || 'User';
        const user = currentUser as any; // Cast to access badge fields
        if (user.is_resident) name += ' (Resident)';
        if (user.role === 'admin' || user.is_super_admin) name += ' (Admin)';
        if (user.is_moderator) name += ' (Mod)';
        if (user.is_fire) name += ' (Fire)';
        if (user.is_police) name += ' (Police)';
        if (user.is_medic) name += ' (Medic)';
        return name;
      })();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 25MB)
      if (file.size > 25 * 1024 * 1024) {
        alert('Image must be smaller than 25MB');
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }

      // Read file as base64
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setImageUrl(base64);
        setImagePreview(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || loading) return;

    setLoading(true);

    try {
      // STEP 1: Look up category_id from slug
      const { data: categoryData, error: categoryError } = await supabase
        .from('bbs_categories')
        .select('id')
        .eq('slug', category)
        .single();

      if (categoryError || !categoryData) {
        alert('Error: Invalid category selected');
        setLoading(false);
        return;
      }

      // STEP 2: Insert post with category_id
      const { error: insertError } = await supabase.from('bbs_posts').insert({
        title: title.trim(),
        body: content.trim(),
        category_id: categoryData.id,  // ✅ Use UUID from database
        category: category,             // ✅ Keep text field for backwards compatibility (trigger will sync)
        link_url: linkUrl.trim() || null,
        image_url: imageUrl || null,
        user_id: currentUser.id,
        display_name: displayName,
        is_anonymous: isAnonymous,
      });

      if (insertError) {
        console.error('Insert error:', insertError);
        alert('Error creating thread: ' + insertError.message);
      } else {
        // Success - clear form
        setTitle('');
        setContent('');
        setLinkUrl('');
        setImageUrl('');
        setImagePreview(null);
        setIsAnonymous(false);
        onSuccess();
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('An unexpected error occurred');
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-2xl font-bold text-gabriola-green">Start a New Conversation</h2>

      {/* Title */}
      <input 
        type="text" 
        placeholder="Title..." 
        value={title} 
        onChange={e => setTitle(e.target.value)} 
        className="w-full p-4 border rounded-lg text-lg focus:ring-2 focus:ring-gabriola-green"
        required
      />

      {/* Category Dropdown */}
      <select 
        value={category} 
        onChange={e => setCategory(e.target.value)}
        className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
      >
        {categories.map(cat => (
          <option key={cat} value={cat}>
            {cat.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
          </option>
        ))}
      </select>

      {/* Content */}
      <textarea 
        placeholder="What's on your mind?" 
        value={content} 
        onChange={e => setContent(e.target.value)} 
        className="w-full p-4 border rounded-lg min-h-[150px] focus:ring-2 focus:ring-gabriola-green"
        required
      />

      {/* Link URL */}
      <div className="flex items-center gap-3">
        <Link2 className="w-5 h-5 text-gray-500" />
        <input 
          type="url" 
          placeholder="Add a link (optional)" 
          value={linkUrl} 
          onChange={e => setLinkUrl(e.target.value)}
          className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
        />
      </div>

      {/* Image Upload */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Image className="w-5 h-5 text-gray-500" />
          <label className="flex-1 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 focus-within:ring-2 focus-within:ring-gabriola-green">
            <span className="text-gray-600">{imagePreview ? 'Change image' : 'Upload an image (optional)'}</span>
            <input 
              type="file" 
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>
        </div>
        {imagePreview && (
          <div className="relative">
            <img src={imagePreview} alt="Preview" className="max-h-64 rounded-lg" />
            <button
              type="button"
              onClick={() => {
                setImageUrl('');
                setImagePreview(null);
              }}
              className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Anonymous Toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input 
          type="checkbox" 
          checked={isAnonymous} 
          onChange={e => setIsAnonymous(e.target.checked)}
          className="w-5 h-5"
        />
        <span className="text-gray-700">Post anonymously as "Island Neighbour"</span>
      </label>

      {/* Preview Display Name */}
      <div className="text-sm text-gray-600">
        Posting as: <strong>{displayName}</strong>
      </div>

      {/* Submit */}
      <button 
        type="submit" 
        disabled={loading || !title.trim() || !content.trim()}
        className="w-full py-4 bg-gabriola-green text-white rounded-lg font-bold text-lg hover:bg-gabriola-green-dark transition disabled:bg-gray-400"
      >
        {loading ? 'Posting...' : 'Post to Forum'}
      </button>
    </form>
  );
}
