// app/admin/audit/page.tsx
// Audit Log, newest first, with a filter by type:
//   Alerts: every alert posted, edited, taken down, put back up or deleted ("System" = the automatic
//           ferry and power alerts). ?alert=<id> shows one alert's history (History link on Admin > Alerts).
//   Admin powers: changes to a member's admin roles, permissions, bans, verification.
//   Removals: someone else's post, reply, listing, comment, event or business removed or put back.
//   Anonymous lookups: who looked up the poster of an anonymous item (the poster isn't recorded).
// Version: 1.1.0
// Date: 2026-11-02
// Needs sql/2026-11-02-alert-audit.sql and sql/2026-11-02-admin-audit.sql.
// Alerts: super admins and alert admins. The other three: super admins only.
'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, History } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { GABRIOLA_TZ } from '@/lib/gabriolaTime';

type Tab = 'alerts' | 'admin powers' | 'removal' | 'anonymous lookup';
const TABS: { key: Tab; label: string; blurb: string }[] = [
  { key: 'alerts', label: 'Alerts', blurb: 'Every alert posted, edited, taken down or deleted, who did it and when. "System" means the automatic ferry and power checks.' },
  { key: 'admin powers', label: 'Admin powers', blurb: 'Every change to a member\'s admin roles, permissions, bans, suspensions and verification, who made it and when.' },
  { key: 'removal', label: 'Removals', blurb: 'When someone removes or puts back another person\'s post, reply, listing, comment, event or business. People removing their own things aren\'t listed.' },
  { key: 'anonymous lookup', label: 'Anonymous lookups', blurb: 'Every time an admin looked up who posted something without a name. Who the poster was is never recorded here.' },
];

interface LogEntry {
  id: number;
  category: Tab;
  action: string;
  actor_id: string | null;
  actor_name: string;
  target_type: string;
  target_id: string | null;
  target_label: string | null;
  details: Record<string, any> | null;
  at: string;
}

const POWER: Record<string, string> = {
  role: 'Role', is_super_admin: 'Super admin', admin_events: 'Events admin', admin_forum: 'Forum admin',
  admin_bbs: 'Forum admin (old)', admin_directory: 'Directory admin', admin_alerts: 'Alerts admin',
  admin_alert_organizations: 'Alert organizations admin', admin_ferry: 'Ferry admin', admin_users: 'Members admin',
  admin_marketplace: 'Marketplace admin', can_create_events: 'Can add events', can_issue_alerts: 'Can issue alerts',
  alert_level_permission: 'Alert level allowed', alert_organization: 'Alert organization', can_post: 'Can post',
  can_create_posts: 'Can start forum posts', can_reply: 'Can reply', can_comment: 'Can comment',
  is_banned: 'Banned', is_suspended: 'Suspended', account_locked: 'Account locked', forum_read_only: 'Forum read only',
  is_verified: 'Verified', is_resident: 'Resident',
};

const showPower = (v: any) =>
  v === true ? 'yes' : v === false ? 'no' : v === null || v === undefined || v === '' ? '(none)' : String(v);

const LOG_ACTION_STYLE: Record<string, string> = {
  changed: 'bg-blue-100 text-blue-800',
  removed: 'bg-gray-200 text-gray-800',
  'put back': 'bg-green-100 text-green-800',
  deleted: 'bg-red-100 text-red-800',
  'looked up who posted': 'bg-amber-100 text-amber-900',
};

function LogItem({ e }: { e: LogEntry }) {
  const d = e.details || {};
  return (
    <li className="bg-white border-2 border-gray-200 rounded-xl p-4">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${LOG_ACTION_STYLE[e.action] || 'bg-gray-100 text-gray-800'}`}>{e.action}</span>
        <span className="font-semibold text-gray-900">{e.actor_name}</span>
        <span className="text-gray-600">· {when(e.at)}</span>
      </div>
      <p className="mt-1 text-gray-900">
        <span className="text-gray-600 capitalize">{e.target_type}: </span>
        <span className="font-semibold">{e.target_label || 'Untitled'}</span>
      </p>
      {e.category === 'admin powers' && Object.keys(d).length > 0 && (
        <dl className="mt-2 text-sm space-y-1">
          {Object.keys(d).map(k => (
            <div key={k} className="flex flex-col sm:flex-row sm:gap-2">
              <dt className="font-semibold text-gray-700 sm:w-48 flex-shrink-0">{POWER[k] || k}</dt>
              <dd className="text-gray-800 break-words min-w-0">
                <span className="line-through text-gray-500">{showPower(d[k]?.from)}</span>{' '}&rarr;{' '}<span>{showPower(d[k]?.to)}</span>
              </dd>
            </div>
          ))}
        </dl>
      )}
      {e.category === 'removal' && d.posted_by && (
        <p className="mt-1 text-sm text-gray-700">Posted by: {d.posted_by}</p>
      )}
    </li>
  );
}

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
  const isSuper = !!user?.is_super_admin;
  const asked = (params.get('type') as Tab) || 'alerts';
  const tab: Tab = alertId || !isSuper || !TABS.some(t => t.key === asked) ? 'alerts' : asked;
  const [entries, setEntries] = useState<Entry[]>([]);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const allowed = !!(user?.is_super_admin || (user as any)?.admin_alerts);

  useEffect(() => {
    if (userLoading) return;
    if (!allowed) {
      router.push('/');
      return;
    }
    setLoading(true);
    setError('');
    (async () => {
      if (tab !== 'alerts') {
        const { data, error } = await supabase.from('audit_log').select('*')
          .eq('category', tab).order('at', { ascending: false }).limit(300);
        if (error) {
          console.error('Error loading audit log:', error);
          setError('Couldn\'t load the audit log. Has sql/2026-11-02-admin-audit.sql been run?');
        } else {
          setLogEntries((data as LogEntry[]) || []);
        }
        setLoading(false);
        return;
      }
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
  }, [userLoading, allowed, alertId, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const title = alertId ? (entries.find(e => e.alert_title)?.alert_title || 'This alert') : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/admin/alerts" className="inline-flex items-center gap-1 text-sm font-semibold text-gabriola-green mb-4">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Alert Administration
      </Link>
      <h1 className="text-3xl font-bold text-gabriola-green mb-1 flex items-center gap-2">
        <History className="w-7 h-7" aria-hidden="true" /> {alertId ? 'Alert history' : 'Audit Log'}
      </h1>
      {!alertId && isSuper && (
        <nav aria-label="Type of entry" className="flex flex-wrap gap-2 mb-4">
          {TABS.map(t => (
            <Link
              key={t.key}
              href={t.key === 'alerts' ? '/admin/audit' : `/admin/audit?type=${encodeURIComponent(t.key)}`}
              aria-current={tab === t.key ? 'page' : undefined}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold border-2 ${tab === t.key ? 'bg-gabriola-green text-white border-gabriola-green' : 'bg-white text-gray-800 border-gray-300 hover:border-gabriola-green'}`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      )}
      <p className="text-gray-600 mb-6">
        {alertId
          ? <>Every change to <strong>{title}</strong>, newest first. <Link href="/admin/audit" className="text-blue-700 hover:underline">See all alerts</Link></>
          : <>{TABS.find(t => t.key === tab)?.blurb} Newest first. Entries can&apos;t be changed or deleted from the site.</>}
      </p>

      {loading || userLoading ? (
        <p className="text-gray-600" role="status">Loading...</p>
      ) : error ? (
        <p className="font-semibold text-red-700" role="alert">{error}</p>
      ) : tab !== 'alerts' ? (
        logEntries.length === 0 ? (
          <p className="text-gray-600">Nothing recorded yet. Changes are recorded from the moment the audit trail was turned on.</p>
        ) : (
          <ol className="space-y-3">
            {logEntries.map(e => <LogItem key={e.id} e={e} />)}
          </ol>
        )
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
