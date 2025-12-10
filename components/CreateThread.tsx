// Path: components/CreateThread.tsx
// Version: 2.0.0 - Accept defaultCategory prop from parent
// Date: 2024-12-09

'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@/lib/types';
import { Image, Link2, X } from 'lucide-react';

interface Props {
  currentUser: User;
  defaultCategory?: string;  // NEW: Default category from parent
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
  const [category, setCategory] = useState(defaultCategory);  // Use prop instead of 'general'
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
      onSuccess();
    } else {
      alert('Error: ' + error.message);
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
        required 
        className="w-full p-4 border-2 border-gray-200 rounded-lg text-lg font-medium focus:ring-2 focus:ring-gabriola-green focus:border-transparent" 
      />

      {/* Content */}
      <textarea 
        placeholder="Your message..." 
        value={content} 
        onChange={e => setContent(e.target.value)} 
        rows={8} 
        required 
        className="w-full p-4 border-2 border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-gabriola-green focus:border-transparent" 
      />

      {/* URL Link */}
      <div className="relative">
        <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input 
          type="url" 
          placeholder="Add a link (optional)" 
          value={linkUrl} 
          onChange={e => setLinkUrl(e.target.value)} 
          className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent" 
        />
      </div>

      {/* Image Upload */}
      <div>
        <label className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gabriola-green hover:bg-gabriola-green/5 transition">
          <Image className="w-6 h-6 text-gray-400" />
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

        {/* Image Preview */}
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

      {/* Category and Anonymous */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
          <select 
            value={category} 
            onChange={e => setCategory(e.target.value)} 
            className="w-full p-4 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
          >
            {categories.map(c => (
              <option key={c} value={c}>
                {c.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Privacy</label>
          <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input 
              type="checkbox" 
              checked={isAnonymous} 
              onChange={e => setIsAnonymous(e.target.checked)} 
              className="w-5 h-5" 
            />
            <span className="font-medium">Post anonymously</span>
          </label>
        </div>
      </div>

      {/* Preview Name */}
      <div className="p-4 bg-gabriola-green/5 border-2 border-gabriola-green/20 rounded-lg">
        <p className="text-sm text-gray-600 mb-1">Your post will appear as:</p>
        <p className="font-bold text-gabriola-green text-lg">{displayName}</p>
      </div>

      {/* Submit */}
      <button 
        type="submit" 
        disabled={loading} 
        className="w-full bg-gradient-to-r from-gabriola-green to-gabriola-green-light text-white py-4 rounded-lg font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-60 transform hover:scale-[1.02] active:scale-[0.98]"
      >
        {loading ? 'Creating...' : 'Create Thread'}
      </button>
    </form>
  );
}
