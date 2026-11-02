// app/admin/audit/page.tsx
// Alert Audit Log: every alert posted, edited, taken down, put back up or deleted, with who did it
// (or "System" for the automatic ferry and power alerts) and when. Newest first.
// ?alert=<id> shows the history of one alert (the History link on Admin > Alerts).
// Version: 1.0.0
// Date: 2026-11-02
// Needs sql/2026-11-02-alert-audit.sql. Super admins and alert admins only.
'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, History } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { GABRIOLA_TZ } from '@/lib/gabriolaTime';

interface Entry {
  id: number;
  alert_id: string;
  alert_title: string | null;
  action: 'posted' | 'edited' | 'taken down' | 'put back up' | 'deleted';
  actor_id: string | null;
  actor_name: string;
  changes: Record<string, any> | null;
  at: string;
}

const FIELD: Record<string, string> = {
  title: 'Title', message: 'Message', severity: 'Level', category: 'Category', active: 'Showing',
  expires_at: 'Expires', link_url: 'Link', link_text: 'Link text', on_behalf_of_name: 'On behalf of',
  on_behalf_of_organization: 'Organization', affected_areas: 'Areas', image_url: 'Image', on_behalf_of: 'On behalf of',
};

const ACTION_STYLE: Record<Entry['action'], string> = {
  'posted': 'bg-green-100 text-green-800',
  'edited': 'bg-blue-100 text-blue-800',
  'taken down': 'bg-gray-200 text-gray-800',
  'put back up': 'bg-green-100 text-green-800',
  'deleted': 'bg-red-100 text-red-800',
};

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-CA', { timeZone: GABRIOLA_TZ, month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

function show(field: string, v: any): string {
  if (v === null || v === undefined || v === '') return '(none)';
  if (field === 'active') return v ? 'yes' : 'no';
  if (field === 'expires_at' && typeof v === 'string') return when(v);
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
}

function Changes({ e }: { e: Entry }) {
  const c = e.changes || {};
  const keys = Object.keys(c);
  if (keys.length === 0) return null;
  // Posted / deleted: a snapshot. Edited etc.: from -> to.
  const isDiff = keys.every(k => c[k] && typeof c[k] === 'object' && !Array.isArray(c[k]) && ('from' in c[k] || 'to' in c[k]));
  return (
    <dl className="mt-2 text-sm space-y-1">
      {keys.filter(k => k !== 'active' || isDiff).map(k => (
        <div key={k} className="flex flex-col sm:flex-row sm:gap-2">
          <dt className="font-semibold text-gray-700 sm:w-28 flex-shrink-0">{FIELD[k] || k}</dt>
          <dd className="text-gray-800 break-words min-w-0">
            {isDiff ? (
              <>
                <span className="line-through text-gray-500">{show(k, c[k].from)}</span>
                {' '}&rarr;{' '}
                <span>{show(k, c[k].to)}</span>
              </>
            ) : show(k, c[k])}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function AuditLog() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const params = useSearchParams();
  const alertId = params.get('alert');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const allowed = !!(user?.is_super_admin || (user as any)?.admin_alerts);

  useEffect(() => {
    if (userLoading) return;
    if (!allowed) {
      router.push('/');
      return;
    }
    (async () => {
      let q = supabase.from('alert_audit').select('*').order('at', { ascending: false }).limit(300);
      if (alertId) q = q.eq('alert_id', alertId);
      const { data, error } = await q;
      if (error) {
        console.error('Error loading audit log:', error);
        setError('Couldn\'t load the audit log. Has sql/2026-11-02-alert-audit.sql been run?');
      } else {
        setEntries((data as Entry[]) || []);
      }
      setLoading(false);
    })();
  }, [userLoading, allowed, alertId]); // eslint-disable-line react-hooks/exhaustive-deps

  const title = alertId ? (entries.find(e => e.alert_title)?.alert_title || 'This alert') : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/admin/alerts" className="inline-flex items-center gap-1 text-sm font-semibold text-gabriola-green mb-4">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Alert Administration
      </Link>
      <h1 className="text-3xl font-bold text-gabriola-green mb-1 flex items-center gap-2">
        <History className="w-7 h-7" aria-hidden="true" /> {alertId ? 'Alert history' : 'Alert Audit Log'}
      </h1>
      <p className="text-gray-600 mb-6">
        {alertId
          ? <>Every change to <strong>{title}</strong>, newest first. <Link href="/admin/audit" className="text-blue-700 hover:underline">See all alerts</Link></>
          : 'Every alert posted, edited, taken down or deleted, who did it and when, newest first. "System" means the automatic ferry and power checks. Entries can\'t be changed or deleted from the site.'}
      </p>

      {loading || userLoading ? (
        <p className="text-gray-600" role="status">Loading...</p>
      ) : error ? (
        <p className="font-semibold text-red-700" role="alert">{error}</p>
      ) : entries.length === 0 ? (
        <p className="text-gray-600">Nothing recorded yet. Changes are recorded from the moment the audit trail was turned on.</p>
      ) : (
        <ol className="space-y-3">
          {entries.map(e => (
            <li key={e.id} className="bg-white border-2 border-gray-200 rounded-xl p-4">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${ACTION_STYLE[e.action]}`}>{e.action}</span>
                <span className="font-semibold text-gray-900">{e.actor_name}</span>
                <span className="text-gray-600">· {when(e.at)}</span>
              </div>
              {!alertId && (
                <p className="mt-1 font-semibold text-gray-900">
                  <Link href={`/admin/audit?alert=${e.alert_id}`} className="hover:underline">{e.alert_title || 'Untitled alert'}</Link>
                </p>
              )}
              <Changes e={e} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default function AuditPage() {
  return (
    <Suspense fallback={<p className="max-w-4xl mx-auto px-4 py-8 text-gray-600">Loading...</p>}>
      <AuditLog />
    </Suspense>
  );
}
