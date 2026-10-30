// app/admin/news/page.tsx
// Island News drafts: the AI's summaries of new Gabriola Sounder stories, waiting for Alex.
// Edit the title, text or topic, then Publish (posts to the forum from the Gabriola Connects
// account) or Reject. Nothing is posted without pressing Publish.
// Version: 1.0.0
// Date: 2026-10-27
// Needs sql/2026-10-27-news-drafts.sql
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { ArrowLeft, CheckCircle, XCircle, Loader2, ExternalLink } from 'lucide-react';

interface Draft {
  id: string;
  source_url: string;
  source_title: string;
  source_author: string | null;
  source_date: string | null;
  title: string | null;
  body: string | null;
  topic_slug: string | null;
  status: 'pending' | 'published' | 'rejected' | 'skipped';
  skip_reason: string | null;
  post_id: string | null;
  created_at: string;
  reviewed_at: string | null;
}

const TOPICS: { slug: string; name: string }[] = [
  { slug: 'island-issues-governance', name: 'Local Government & Planning' },
  { slug: 'ferry-transportation', name: 'Ferry, Roads & Trails' },
  { slug: 'environment-infrastructure', name: 'Environment, Water & Power' },
  { slug: 'healthcare-seniors', name: 'Health, Housing & Safety' },
  { slug: 'business-economy', name: 'Business, Arts & Events' },
  { slug: 'general-chat', name: 'General Chat' },
];

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Vancouver' }) : '';

export default function NewsDraftsPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [edits, setEdits] = useState<Record<string, { title: string; body: string; topic: string }>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showDone, setShowDone] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from('news_drafts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(60);
    if (error) {
      console.error('Error loading news drafts:', error);
      setError('Couldn\'t load the drafts. Has sql/2026-10-27-news-drafts.sql been run?');
    } else {
      const rows = (data as Draft[]) || [];
      setDrafts(rows);
      setEdits(prev => {
        const next = { ...prev };
        rows.filter(d => d.status === 'pending' && !next[d.id]).forEach(d => {
          next[d.id] = { title: d.title || '', body: d.body || '', topic: d.topic_slug || 'general-chat' };
        });
        return next;
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (userLoading) return;
    if (!user?.is_super_admin) {
      router.push('/');
      return;
    }
    load();
  }, [userLoading, user?.is_super_admin]); // eslint-disable-line react-hooks/exhaustive-deps

  const publish = async (d: Draft) => {
    const e = edits[d.id];
    if (!e) return;
    setBusy(d.id);
    const { data, error } = await supabase.rpc('publish_news_draft', { p_draft: d.id, p_title: e.title, p_body: e.body, p_topic: e.topic });
    setBusy(null);
    if (error) {
      alert('Sorry, that didn\'t publish: ' + error.message);
      return;
    }
    await load();
    if (data && confirm('Posted. Open it in the forum?')) router.push(`/community/thread/${data}`);
  };

  const reject = async (d: Draft) => {
    if (!confirm(`Reject the draft for "${d.source_title}"? It won't be drafted again.`)) return;
    setBusy(d.id);
    const { error } = await supabase.rpc('reject_news_draft', { p_draft: d.id });
    setBusy(null);
    if (error) alert('Sorry, that didn\'t work: ' + error.message);
    await load();
  };

  const setEdit = (id: string, field: 'title' | 'body' | 'topic', value: string) =>
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

  const pending = drafts.filter(d => d.status === 'pending');
  const done = drafts.filter(d => d.status !== 'pending');

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/community" className="inline-flex items-center gap-1 text-sm font-semibold text-gabriola-green mb-4">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Forum
      </Link>
      <h1 className="text-3xl font-bold text-gabriola-green mb-1">Island News drafts</h1>
      <p className="text-gray-600 mb-6">
        Summaries of new Gabriola Sounder stories, drafted on Mondays and Thursdays. Check each one
        against the Sounder story, fix anything, then publish. Nothing goes up until you press Publish.
      </p>

      {loading || userLoading ? (
        <p className="text-gray-600" role="status">Loading...</p>
      ) : error ? (
        <p className="font-semibold text-red-700" role="alert">{error}</p>
      ) : (
        <>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Waiting ({pending.length})</h2>
          {pending.length === 0 && <p className="text-gray-600 mb-8">No drafts waiting.</p>}
          <div className="space-y-6 mb-10">
            {pending.map(d => {
              const e = edits[d.id];
              if (!e) return null;
              return (
                <article key={d.id} className="bg-white border-2 border-gray-200 rounded-xl p-4 md:p-5">
                  <p className="text-sm text-gray-600 mb-3">
                    From the Sounder{d.source_date ? `, ${fmt(d.source_date)}` : ''}{d.source_author ? `, by ${d.source_author}` : ''}:{' '}
                    <a href={d.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline">
                      {d.source_title} <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    </a>
                  </p>

                  <label htmlFor={`t-${d.id}`} className="block text-sm font-semibold text-gray-800 mb-1">Title</label>
                  <input
                    id={`t-${d.id}`}
                    value={e.title}
                    onChange={ev => setEdit(d.id, 'title', ev.target.value)}
                    maxLength={200}
                    className="w-full min-h-[44px] px-3 rounded-lg border border-gray-300 text-base font-semibold mb-3 focus:outline-none focus:ring-2 focus:ring-gabriola-green"
                  />

                  <label htmlFor={`b-${d.id}`} className="block text-sm font-semibold text-gray-800 mb-1">Text</label>
                  <textarea
                    id={`b-${d.id}`}
                    value={e.body}
                    onChange={ev => setEdit(d.id, 'body', ev.target.value)}
                    rows={14}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-[15px] leading-relaxed font-mono mb-3 focus:outline-none focus:ring-2 focus:ring-gabriola-green"
                  />

                  <label htmlFor={`c-${d.id}`} className="block text-sm font-semibold text-gray-800 mb-1">Forum topic</label>
                  <select
                    id={`c-${d.id}`}
                    value={e.topic}
                    onChange={ev => setEdit(d.id, 'topic', ev.target.value)}
                    className="w-full md:w-auto min-h-[44px] px-3 rounded-lg border border-gray-300 text-base mb-4"
                  >
                    {TOPICS.map(t => <option key={t.slug} value={t.slug}>{t.name}</option>)}
                  </select>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => publish(d)}
                      disabled={busy === d.id || !e.title.trim() || !e.body.trim()}
                      className="inline-flex items-center gap-1.5 min-h-[44px] px-5 rounded-lg bg-gabriola-green text-white font-semibold hover:bg-gabriola-green-dark disabled:opacity-60"
                    >
                      {busy === d.id ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <CheckCircle className="w-4 h-4" aria-hidden="true" />}
                      Publish
                    </button>
                    <button
                      type="button"
                      onClick={() => reject(d)}
                      disabled={busy === d.id}
                      className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-lg border-2 border-gray-300 font-semibold hover:border-red-400 hover:text-red-700 disabled:opacity-60"
                    >
                      <XCircle className="w-4 h-4" aria-hidden="true" />
                      Reject
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowDone(v => !v)}
            className="text-sm font-semibold text-blue-700 hover:underline mb-3"
            aria-expanded={showDone}
          >
            {showDone ? 'Hide' : 'Show'} published, rejected and skipped stories ({done.length})
          </button>
          {showDone && (
            <ul className="divide-y divide-gray-200 bg-white border-2 border-gray-200 rounded-xl">
              {done.map(d => (
                <li key={d.id} className="px-4 py-3 text-sm">
                  <a href={d.source_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-gray-900 hover:underline">{d.source_title}</a>
                  <span className="text-gray-600">
                    {' · '}
                    {d.status === 'published' ? (
                      <>Published {fmt(d.reviewed_at)}{d.post_id && <> · <Link href={`/community/thread/${d.post_id}`} className="text-blue-700 hover:underline">view post</Link></>}</>
                    ) : d.status === 'rejected' ? (
                      <>Rejected {fmt(d.reviewed_at)}</>
                    ) : (
                      <>Skipped: {d.skip_reason}</>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
