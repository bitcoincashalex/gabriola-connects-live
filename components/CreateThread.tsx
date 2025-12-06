// components/CreateThread.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import FileUploader from './FileUploader';
import { User } from '@/lib/types';

interface Props {
  currentUser: User;
  onSuccess: () => void;
}

const allCategories = [
  'general', 'events', 'buy-sell', 'ferry', 'politics-canada', 'politics-us',
  'politics-world', 'politics-local', 'environment', 'housing', 'health',
  'lost-found', 'recommendations', 'announcements', 'rideshare', 'volunteer',
  'gardening-farming', 'arts-culture', 'spirituality', 'off-topic'
];

export default function CreateThread({ currentUser, onSuccess }: Props) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [externalLink, setExternalLink] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || loading) return;

    setLoading(true);

    const { error } = await supabase.from('bbs_posts').insert({
      title: title.trim(),
      content: content.trim(),
      category,
      user_id: currentUser.id,
      display_name: isAnonymous ? 'Island Neighbour' : currentUser.full_name,
      is_anonymous: isAnonymous,
      external_url: externalLink || null,
      file_urls: files.length ? files : null,
    });

    if (!error) {
      setTitle(''); setContent(''); setExternalLink(''); setFiles([]); onSuccess();
    } else {
      alert('Error: ' + error.message);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 mb-12 border">
      <h2 className="text-2xl font-bold mb-6 text-gabriola-green">Start a New Conversation</h2>

      <input type="text" placeholder="Title..." value={title} onChange={e => setTitle(e.target.value)} required className="w-full p-4 border rounded-lg mb-4 text-lg font-medium" />
      
      <div className="mb-4">
        <input type="url" placeholder="Link (optional)" value={externalLink} onChange={e => setExternalLink(e.target.value)} className="w-full p-4 border rounded-lg" />
      </div>

      <textarea placeholder="Your message..." value={content} onChange={e => setContent(e.target.value)} rows={6} required className="w-full p-4 border rounded-lg mb-6 resize-none" />

      {/* Fixed layout — dropdown no longer cut off */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-gabriola-green outline-none text-base"
        >
          <option value="general">General</option>
          <option value="events">Events</option>
          <option value="buy-sell">Buy & Sell</option>
          <option value="ferry">Ferry</option>
          <option value="politics-canada">Politics – Canada</option>
          <option value="politics-us">Politics – US</option>
          <option value="politics-world">Politics – World</option>
          <option value="politics-local">Politics – Local</option>
          <option value="environment">Environment</option>
          <option value="housing">Housing</option>
          <option value="health">Health</option>
          <option value="lost-found">Lost & Found</option>
          <option value="recommendations">Recommendations</option>
          <option value="announcements">Announcements</option>
          <option value="rideshare">Rideshare</option>
          <option value="volunteer">Volunteer</option>
          <option value="gardening-farming">Gardening & Farming</option>
          <option value="arts-culture">Arts & Culture</option>
          <option value="spirituality">Spirituality</option>
          <option value="off-topic">Off Topic</option>
        </select>

        <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer">
          <input type="checkbox" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)} className="w-5 h-5" />
          <span className="font-medium">Post anonymously (as “Island Neighbour”)</span>
        </label>
      </div>

      <FileUploader onUpload={setFiles} />

      <button type="submit" disabled={loading} className="w-full bg-gabriola-green text-white py-4 rounded-lg font-bold text-lg hover:bg-gabriola-green-dark disabled:opacity-60">
        {loading ? 'Creating...' : 'Create Thread'}
      </button>
    </form>
  );
}