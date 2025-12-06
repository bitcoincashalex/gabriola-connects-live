// components/ReplyForm.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';

export default function ReplyForm({ threadId }: { threadId: string }) {
  const { user } = useUser();
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || loading) return;

    setLoading(true);

    await supabase.from('bbs_replies').insert({
      thread_id: threadId,
      user_id: user.id,
      display_name: isAnonymous ? 'Island Neighbour' : user.full_name,
      is_anonymous: isAnonymous,
      content: content.trim(),
    });

    setContent('');
    setLoading(false);
    window.location.reload(); // simple refresh
  };

  return (
    <div className="max-w-full mx-auto">   {/* ← THIS IS THE MOBILE-FRIENDLY WRAPPER */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 mt-8">
        <textarea
          placeholder="Write your reply..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          required
          className="w-full p-4 border rounded-lg mb-4 focus:ring-2 focus:ring-gabriola-green outline-none resize-none"
        />

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="w-5 h-5"
            />
            <span className="text-sm font-medium">Reply anonymously (as “Island Neighbour”)</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto bg-gabriola-green text-white px-8 py-3 rounded-lg font-bold hover:bg-gabriola-green-dark disabled:opacity-60 transition"
        >
          {loading ? 'Posting...' : 'Post Reply'}
        </button>
      </form>
    </div>
  );
}