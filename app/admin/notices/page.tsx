// app/admin/notices/page.tsx
// Notices inbox: every email sent to notices@gabriolaconnects.ca, what the AI decided,
// and one-click Publish / Dismiss for emails held for review
// Version: 1.0.0
// Date: 2026-10-10

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { Inbox, CheckCircle, XCircle, ShieldCheck, ShieldAlert, ArrowLeft, RefreshCw } from 'lucide-react';

interface Notice {
  id: string;
  received_at: string | null;
  from_address: string | null;
  subject: string | null;
  body_excerpt: string | null;
  sender_trusted: boolean;
  auth_summary: string | null;
  status: string;
  alert_id: string | null;
  error: string | null;
  ai: {
    decision: string;
    reason: string;
    title: string;
    message: string;
    severity: string;
    category: string;
    expires_in_hours: number;
    source_name: string;
    link_url: string | null;
  } | null;
}

const FILTERS = [
  { key: 'held', label: 'Needs review' },
  { key: 'published', label: 'Published' },
  { key: 'ignored', label: 'Ignored' },
  { key: 'all', label: 'All' },
];

const STATUS_STYLE: Record<string, string> = {
  held: 'bg-amber-100 text-amber-800',
  published: 'bg-green-100 text-green-800',
  ignored: 'bg-gray-100 text-gray-600',
  dismissed: 'bg-gray-100 text-gray-600',
  error: 'bg-red-100 text-red-800',
};

export default function NoticesInboxPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [filter, setFilter] = useState('held');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (userLoading) return;
    if (!user?.is_super_admin) router.push('/');
  }, [user, userLoading, router]);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from('inbound_notices')
      .select('id, received_at, from_address, subject, body_excerpt, sender_trusted, auth_summary, status, alert_id, error, ai')
      .order('created_at', { ascending: false })
      .limit(100);
    if (filter === 'held') q = q.in('status', ['held', 'error']);
    else if (filter !== 'all') q = q.eq('status', filter);
    const { data, error } = await q;
    if (error) setMessage('Could not load notices: ' + error.message);
    setNotices((data as Notice[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (user?.is_super_admin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, user]);

  const publish = async (n: Notice) => {
    if (!n.ai || !user) return;
    setBusyId(n.id);
    setMessage(null);
    const { data: alert, error } = await supabase.from('alerts').insert({
      title: n.ai.title,
      message: n.ai.message,
      severity: n.ai.severity,
      category: n.ai.category,
      issued_by: user.id,
      on_behalf_of_name: n.ai.source_name || null,
      on_behalf_of_organization: n.ai.source_name || null,
      affected_areas: ['Gabriola Island'],
      active: true,
      expires_at: new Date(Date.now() + (n.ai.expires_in_hours || 24) * 3600 * 1000).toISOString(),
      link_url: n.ai.link_url,
      link_text: n.ai.link_url ? 'More information' : null,
    }).select('id').single();
    if (error) {
      setMessage('Publish failed: ' + error.message);
    } else {
      await supabase.from('inbound_notices').update({
        status: 'published', alert_id: alert.id, reviewed_at: new Date().toISOString(), reviewed_by: user.id,
      }).eq('id', n.id);
      setMessage(`Published: ${n.ai.title}`);
      await load();
    }
    setBusyId(null);
  };

  const dismiss = async (n: Notice) => {
    if (!user) return;
    setBusyId(n.id);
    await supabase.from('inbound_notices').update({
      status: 'dismissed', reviewed_at: new Date().toISOString(), reviewed_by: user.id,
    }).eq('id', n.id);
    await load();
    setBusyId(null);
  };

  if (userLoading || !user?.is_super_admin) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/admin/alerts" className="inline-flex items-center gap-2 text-gabriola-green hover:underline mb-6">
          <ArrowLeft className="w-4 h-4" /> Alert Administration
        </Link>

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Inbox className="w-8 h-8 text-gabriola-green" />
            <h1 className="text-3xl font-bold text-gray-900">Notices Inbox</h1>
          </div>
          <button onClick={load} className="p-2 rounded-lg hover:bg-gray-200" aria-label="Refresh">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-6">
          Emails to notices@gabriolaconnects.ca, checked every 5 minutes. Verified emails from trusted senders
          that the AI marks as important are published automatically. Everything else the AI thinks may matter waits here.
        </p>

        <div className="flex gap-2 mb-6 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-full text-sm font-semibold ${filter === f.key ? 'bg-gabriola-green text-white' : 'bg-white text-gray-700 border border-gray-200'}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {message && <div className="mb-4 p-3 rounded-lg bg-blue-50 text-blue-900 text-sm">{message}</div>}

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : notices.length === 0 ? (
          <p className="text-gray-500">Nothing here.</p>
        ) : (
          <div className="space-y-4">
            {notices.map(n => (
              <div key={n.id} className="bg-white rounded-xl shadow p-5 border border-gray-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-gray-500">
                      {n.received_at ? new Date(n.received_at).toLocaleString('en-CA', { timeZone: 'America/Vancouver' }) : ''} · {n.from_address}
                    </div>
                    <div className="font-semibold text-gray-900 truncate">{n.subject}</div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_STYLE[n.status] || 'bg-gray-100'}`}>
                    {n.status}
                  </span>
                </div>

                <div className={`mt-2 flex items-center gap-1 text-xs ${n.sender_trusted ? 'text-green-700' : 'text-amber-700'}`}>
                  {n.sender_trusted ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                  {n.auth_summary}
                </div>

                {n.error && <div className="mt-2 text-sm text-red-700">Error: {n.error}</div>}

                {n.ai && (
                  <div className="mt-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <div className="text-xs text-gray-500 mb-1">
                      AI: <strong>{n.ai.decision}</strong> · {n.ai.severity} · {n.ai.category} · {n.ai.expires_in_hours}h · {n.ai.reason}
                    </div>
                    <div className="font-semibold text-gray-900">{n.ai.title}</div>
                    <div className="text-sm text-gray-700">{n.ai.message}</div>
                    {n.ai.link_url && (
                      <a href={n.ai.link_url} target="_blank" rel="noopener noreferrer" className="text-xs text-gabriola-green underline break-all">
                        {n.ai.link_url}
                      </a>
                    )}
                  </div>
                )}

                <button onClick={() => setExpanded(expanded === n.id ? null : n.id)} className="mt-2 text-xs text-gray-500 underline">
                  {expanded === n.id ? 'Hide original email' : 'Show original email'}
                </button>
                {expanded === n.id && (
                  <pre className="mt-2 p-3 bg-gray-50 rounded text-xs text-gray-700 whitespace-pre-wrap max-h-80 overflow-auto">{n.body_excerpt}</pre>
                )}

                {(n.status === 'held' || n.status === 'error') && n.ai && (
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => publish(n)}
                      disabled={busyId === n.id}
                      className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-gabriola-green text-white text-sm font-semibold disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" /> Publish as alert
                    </button>
                    <button
                      onClick={() => dismiss(n)}
                      disabled={busyId === n.id}
                      className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-semibold disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" /> Dismiss
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
