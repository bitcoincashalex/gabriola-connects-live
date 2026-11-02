// app/news/page.tsx
// Island News: the news posts from the forum (written by the Gabriola Connects account), newest
// first, from October 2026 on. Each opens the forum post, where the replies are, so every story
// has one place for comments.
// Version: 1.0.0
// Date: 2026-11-02
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Newspaper, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Footer from '@/components/Footer';
import { NEWS_AUTHOR_ID } from '@/lib/forum';
import { GABRIOLA_TZ } from '@/lib/gabriolaTime';

const NEWS_FROM = '2026-10-01T07:00:00Z';   // Oct. 1, 2026 in Gabriola: the current style of summaries

interface NewsPost {
  id: string;
  title: string;
  body: string;
  category: string | null;
  created_at: string;
  reply_count: number | null;
}

// The opening paragraph(s) of the post: no headings, lists, links, sources or footer
function preview(body: string): string {
  const main = body.split(/\n\*\*Sources\*\*|\n---\n/)[0];
  const paras = main.split(/\n\s*\n/).map(p => p.trim()).filter(p =>
    p && !/^\*\*[^*]+\*\*:?$/.test(p) && !/^[-•*]\s/.test(p) && !/^#/.test(p));
  let text = '';
  for (const p of paras) {
    const clean = p.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_#>`]/g, '').replace(/\s+/g, ' ').trim();
    text = text ? `${text} ${clean}` : clean;
    if (text.length >= 60) break;   // the first paragraph, plus the next only if it's very short
  }
  return text.length > 220 ? text.slice(0, 217).replace(/\s+\S*$/, '') + '...' : text;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: GABRIOLA_TZ });

export default function IslandNewsPage() {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [topics, setTopics] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    (async () => {
      const [postsRes, catsRes] = await Promise.all([
        supabase
          .from('bbs_posts')
          .select('id, title, body, category, created_at, reply_count')
          .eq('user_id', NEWS_AUTHOR_ID)
          .eq('is_active', true)
          .is('deleted_at', null)
          .gte('created_at', NEWS_FROM)
          .order('created_at', { ascending: false })
          .limit(60),
        supabase.from('bbs_categories').select('slug, name'),
      ]);
      if (postsRes.error) {
        console.error('Error loading Island News:', postsRes.error);
        setFailed(true);
      } else {
        setPosts((postsRes.data as NewsPost[]) || []);
      }
      const map: Record<string, string> = {};
      (catsRes.data || []).forEach((c: { slug: string; name: string }) => { map[c.slug] = c.name; });
      setTopics(map);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-[#F6F2EA] text-[#1F2A24]">
      <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-4">
        <Link href="/community-hub" className="inline-flex items-center gap-1 text-sm font-semibold text-gabriola-green mb-3">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Community Hub
        </Link>

        <div className="flex items-center gap-3 mb-1">
          <div className="w-11 h-11 rounded-xl bg-[#E3E8F4] text-[#002774] flex items-center justify-center flex-shrink-0">
            <Newspaper className="w-6 h-6" aria-hidden="true" />
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-gabriola-green-dark">Island News</h1>
        </div>
        <p className="text-[#5B6660] mb-5">
          Short summaries of Gabriola news, each with a link to the full story. Tap one to read it and join the conversation.
        </p>

        {loading ? (
          <p className="text-center py-16 text-[#5B6660]" role="status">Loading...</p>
        ) : failed ? (
          <p className="text-center py-16 text-[#5B6660]">The news couldn&apos;t be loaded. Please refresh the page.</p>
        ) : posts.length === 0 ? (
          <p className="text-center py-16 text-[#5B6660]">No news yet.</p>
        ) : (
          <ul className="space-y-3">
            {posts.map(p => (
              <li key={p.id}>
                <Link
                  href={`/community/thread/${p.id}`}
                  className="block bg-white border border-[#E3DCCF] rounded-2xl p-4 md:p-5 hover:border-[#002774] transition-colors"
                >
                  <p className="text-xs font-bold text-[#002774] mb-1">
                    {fmtDate(p.created_at)}{p.category && topics[p.category] ? ` · ${topics[p.category]}` : ''}
                  </p>
                  <h2 className="text-lg font-bold leading-snug text-[#1F2A24]">{p.title}</h2>
                  <p className="text-[15px] text-[#3A4640] leading-relaxed mt-1">{preview(p.body)}</p>
                  <p className="flex items-center gap-1.5 text-sm text-[#5B6660] mt-2">
                    <MessageCircle className="w-4 h-4" aria-hidden="true" />
                    {p.reply_count ? `${p.reply_count} ${p.reply_count === 1 ? 'reply' : 'replies'}` : 'Read and reply'}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Footer />
    </div>
  );
}
