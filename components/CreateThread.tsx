// components/CreateThread.tsx — FINAL, COMPILES, ALL ROLES
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@/lib/types';

interface Props {
  currentUser: User;
  onSuccess: () => void;
}

const categories = [
  'general', 'events', 'buy-sell', 'ferry', 'politics-canada', 'politics-us',
  'politics-world', 'politics-local', 'environment', 'housing', 'health',
  'lost-found', 'recommendations', 'announcements', 'rideshare', 'volunteer',
  'gardening-farming', 'arts-culture', 'spirituality', 'off-topic'
];

export default function CreateThread({ currentUser, onSuccess }: Props) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);

  // Build display name with badges — safe fallback
  const displayName = isAnonymous
    ? 'Island Neighbour'
    : (() => {
        let name = currentUser.full_name || currentUser.email || 'User';
        if ((currentUser as any).is_resident) name += ' (Resident)';
        if ((currentUser as any).role === 'admin' || (currentUser as any).is_super_admin) name += ' (Admin)';
        if ((currentUser as any).is_moderator) name += ' (Mod)';
        if ((currentUser as any).is_fire) name += ' (Fire)';
        if ((currentUser as any).is_police) name += ' (Police)';
        if ((currentUser as any).is_medic) name += ' (Medic)';
        return name;
      })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || loading) return;

    setLoading(true);

    const { error } = await supabase.from('bbs_posts').insert({
      title: title.trim(),
      content: content.trim(),
      category,
      user_id: currentUser.id,
      display_name: displayName,
      is_anonymous: isAnonymous,
    });

    if (!error) {
      setTitle('');
      setContent('');
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

      <input type="text" placeholder="Title..." value={title} onChange={e => setTitle(e.target.value)} required className="w-full p-4 border rounded-lg text-lg font-medium" />

      <textarea placeholder="Your message..." value={content} onChange={e => setContent(e.target.value)} rows={6} required className="w-full p-4 border rounded-lg resize-none" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-4 border rounded-lg">
          {categories.map(c => (
            <option key={c} value={c}>{c.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
          ))}
        </select>

        <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer">
          <input type="checkbox" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)} className="w-5 h-5" />
          <span className="font-medium">Post anonymously (as “Island Neighbour”)</span>
        </label>
      </div>

      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600 mb-1">Your post will appear as:</p>
        <p className="font-bold text-gabriola-green">{displayName}</p>
      </div>

      <button type="submit" disabled={loading} className="w-full bg-gabriola-green text-white py-4 rounded-lg font-bold text-lg hover:bg-gabriola-green-dark disabled:opacity-60">
        {loading ? 'Creating...' : 'Create Thread'}
      </button>
    </form>
  );
}