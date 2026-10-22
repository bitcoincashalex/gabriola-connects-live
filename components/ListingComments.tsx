// components/ListingComments.tsx
// Public questions and comments under a Buy, Sell & Free listing
// Version: 1.1.0 - The poster (or an admin) can turn comments off and on; when off, existing
//                  comments stay visible and nobody can add new ones
// Previous: 1.0.0
// Date: 2026-10-22
//
// Anyone can read them. Signed in members can comment while the listing is live; the seller's
// own comments are marked "Seller". People delete their own; the seller can delete any on their
// listing; admins any. The database fills in the name and the seller mark, and sends the notices.
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Trash2, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { timeAgo } from '@/lib/marketplace';

interface ListingComment {
  id: string;
  listing_id: string;
  user_id: string;
  author_name: string | null;
  is_seller: boolean;
  body: string;
  created_at: string;
}

interface Props {
  listingId: string;
  sellerId: string;
  isOpen: boolean;          // live listing: taking comments
  closedReason?: string;    // shown when not open, e.g. "This item has sold"
  userId?: string | null;
  isAdmin?: boolean;
  commentsEnabled?: boolean;          // the poster's setting
  onToggleComments?: () => void;      // shown to the poster (and admins) while the listing is live
  toggling?: boolean;
}

export default function ListingComments({
  listingId, sellerId, isOpen, closedReason, userId, isAdmin, commentsEnabled = true, onToggleComments, toggling,
}: Props) {
  const [comments, setComments] = useState<ListingComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [highlight, setHighlight] = useState<string | null>(null);
  const scrolled = useRef(false);

  const isSeller = !!userId && userId === sellerId;

  const load = async () => {
    const { data, error } = await supabase
      .from('marketplace_comments')
      .select('id, listing_id, user_id, author_name, is_seller, body, created_at')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: true });
    if (error) console.error('Error loading comments:', error);
    setComments((data as ListingComment[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [listingId]); // eslint-disable-line react-hooks/exhaustive-deps

  // A link from a notice (…#comment-<id>) jumps to that comment once it's on the page
  useEffect(() => {
    if (loading || scrolled.current || typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (!hash.startsWith('#comment-')) return;
    const el = document.getElementById(hash.slice(1));
    if (el) {
      scrolled.current = true;
      el.scrollIntoView({ block: 'center' });
      setHighlight(hash.slice('#comment-'.length));
      setTimeout(() => setHighlight(null), 5000);
    }
  }, [loading, comments]);

  const post = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || !userId) return;
    setPosting(true);
    setError('');
    const { error } = await supabase.from('marketplace_comments').insert({ listing_id: listingId, user_id: userId, body });
    if (error) {
      console.error('Error posting comment:', error);
      setError(isOpen ? 'Sorry, your comment couldn\'t be posted. Please try again.' : 'This listing isn\'t taking comments any more.');
    } else {
      setText('');
      await load();
    }
    setPosting(false);
  };

  const remove = async (c: ListingComment) => {
    if (!confirm('Delete this comment?')) return;
    const { data, error } = await supabase.from('marketplace_comments').delete().eq('id', c.id).select('id');
    if (error || !data || data.length === 0) {
      alert('Sorry, that comment couldn\'t be deleted.');
      return;
    }
    setComments(prev => prev.filter(x => x.id !== c.id));
  };

  const canDelete = (c: ListingComment) => !!userId && (c.user_id === userId || isSeller || !!isAdmin);

  return (
    <section className="bg-white border border-[#E3DCCF] rounded-2xl p-4 md:p-6" aria-labelledby="listing-comments-heading">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 id="listing-comments-heading" className="flex items-center gap-2 font-bold text-lg text-[#1F2A24]">
          <MessageCircle className="w-5 h-5 text-gabriola-green" aria-hidden="true" />
          Questions &amp; comments{comments.length > 0 ? ` (${comments.length})` : ''}
        </h2>
        {onToggleComments && (
          <button
            type="button"
            onClick={onToggleComments}
            disabled={toggling}
            className="min-h-[40px] px-3 rounded-lg border border-[#CFC6B4] bg-white text-sm font-semibold hover:border-gabriola-green disabled:opacity-60"
          >
            {commentsEnabled ? 'Turn off comments' : 'Turn on comments'}
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-[#5B6660]" role="status">Loading...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-[#5B6660] mb-4">
          {isOpen ? 'No questions yet. Ask here and everyone can see the answer.' : 'No comments.'}
        </p>
      ) : (
        <ul className="divide-y divide-[#EEE8DD] mb-4">
          {comments.map(c => (
            <li
              key={c.id}
              id={`comment-${c.id}`}
              className={`py-3 scroll-mt-24 transition-colors ${highlight === c.id ? 'bg-[#E6EFE8] -mx-3 px-3 rounded-lg' : ''}`}
            >
              <div className="flex items-center gap-2 text-sm mb-0.5">
                <span className="font-semibold text-[#1F2A24]">{c.author_name || 'A neighbour'}</span>
                {c.is_seller && (
                  <span className="px-2 py-0.5 rounded-full bg-gabriola-green text-white text-xs font-semibold">Seller</span>
                )}
                <span className="text-[#5B6660]">· {timeAgo(c.created_at)}</span>
                {canDelete(c) && (
                  <button
                    type="button"
                    onClick={() => remove(c)}
                    aria-label="Delete comment"
                    title="Delete"
                    className="ml-auto w-9 h-9 flex items-center justify-center rounded-lg text-[#5B6660] hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                )}
              </div>
              <p className="text-[15px] text-[#1F2A24] leading-relaxed whitespace-pre-line break-words">{c.body}</p>
            </li>
          ))}
        </ul>
      )}

      {!isOpen ? (
        <p className="text-sm text-[#5B6660]">{closedReason || 'This listing isn\'t taking comments any more.'}</p>
      ) : !userId ? (
        <p className="text-sm">
          <Link href="/signin" className="font-semibold text-gabriola-green hover:underline">Sign in</Link>
          {' '}to ask a question or leave a comment.
        </p>
      ) : (
        <form onSubmit={post} className="space-y-2">
          <label htmlFor="listing-comment" className="block text-sm font-semibold">
            {isSeller ? 'Reply or add a note' : 'Ask a question or leave a comment'}
          </label>
          <textarea
            id="listing-comment"
            value={text}
            onChange={e => setText(e.target.value)}
            maxLength={1000}
            placeholder={isSeller ? 'Everyone can see your reply.' : 'Everyone can see this. Use Message for anything private.'}
            className="w-full min-h-[80px] px-3 py-2 rounded-lg border border-[#CFC6B4] text-base focus:outline-none focus:ring-2 focus:ring-gabriola-green"
          />
          {error && <p className="text-sm font-semibold text-[#B42318]" role="alert">{error}</p>}
          <button
            type="submit"
            disabled={posting || !text.trim()}
            className="min-h-[44px] px-5 rounded-lg bg-gabriola-green text-white font-semibold hover:bg-gabriola-green-dark disabled:opacity-60"
          >
            {posting ? 'Posting...' : 'Post'}
          </button>
        </form>
      )}
    </section>
  );
}
