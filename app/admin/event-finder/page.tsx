// app/admin/event-finder/page.tsx
// Event Finder: what the twice-weekly check of other calendars found (the Community Hall's for now).
//   New on their calendar: add to ours (all dates of a title at once, or one date), ignore,
//                          or always ignore that title (e.g. a private weekly booking).
//   Gone from their calendar: our events at that venue that aren't on their calendar any more,
//                          often because they're cancelled. Hide the event, or keep it.
// Nothing changes on the calendar until a button is pressed. Super admins only.
// Version: 1.0.0
// Date: 2026-11-08
// Needs sql/2026-11-08-event-finder.sql
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { ArrowLeft, CalendarPlus, EyeOff, Check, X, Ban, Loader2, Search } from 'lucide-react';
import { SOURCES, titleKey } from '@/lib/eventFinderSources';
import { prettyDate } from '@/lib/eventSeries';

interface Suggestion {
  id: string;
  kind: 'new' | 'not_listed';
  source: string;
  title: string;
  start_date: string;
  start_time: string | null;
  end_time: string | null;
  is_all_day: boolean;
  location: string | null;
  event_id: string | null;
  status: string;
}

const CATEGORIES = ['Community', 'Arts & Culture', 'Education & Workshops', 'Environment', 'Festival', 'Food & Drink',
  'Fundraiser', 'Health & Wellness', 'Kids & Family', 'Market', 'Meeting', 'Music', 'Seniors', 'Sports & Recreation', 'Other'];

const time12 = (t: string | null) => {
  if (!t) return '';
  const [h, m] = t.slice(0, 5).split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};
const whenText = (s: Suggestion) =>
  `${new Date(`${s.start_date}T12:00:00Z`).toLocaleDateString('en-CA', { timeZone: 'UTC', weekday: 'short' })} ${prettyDate(s.start_date)}` +
  (s.is_all_day ? ', all day' : s.start_time ? `, ${time12(s.start_time)}${s.end_time ? ` to ${time12(s.end_time)}` : ''}` : '');

export default function EventFinderPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [category, setCategory] = useState<Record<string, string>>({});

  const load = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('event_suggestions')
      .select('*')
      .eq('status', 'pending')
      .gte('start_date', today)
      .order('start_date')
      .order('start_time', { nullsFirst: true })
      .limit(500);
    if (error) {
      console.error('Error loading suggestions:', error);
      setError('Couldn\'t load the suggestions. Has sql/2026-11-08-event-finder.sql been run?');
    } else {
      setItems((data as Suggestion[]) || []);
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

  // New suggestions grouped by source + title, so a weekly program is one decision
  const groups = useMemo(() => {
    const map = new Map<string, Suggestion[]>();
    items.filter(s => s.kind === 'new').forEach(s => {
      const k = `${s.source}|${titleKey(s.title)}`;
      map.set(k, [...(map.get(k) || []), s]);
    });
    return Array.from(map.entries());
  }, [items]);
  const gone = items.filter(s => s.kind === 'not_listed');

  const mark = async (ids: string[], status: string) => {
    const { error } = await supabase.from('event_suggestions')
      .update({ status, decided_by: user?.id, decided_at: new Date().toISOString() })
      .in('id', ids);
    if (error) throw error;
  };

  const addEvents = async (key: string, list: Suggestion[]) => {
    const cat = category[key] || 'Community';
    const src = SOURCES.find(s => s.name === list[0].source);
    setBusy(key);
    try {
      const firstId = crypto.randomUUID();
      const rows = list.map((s, i) => ({
        id: i === 0 ? firstId : crypto.randomUUID(),
        title: s.title,
        description: `From the ${s.source}${src ? ` (${src.pageUrl})` : ''}.`,
        start_date: s.start_date,
        end_date: null,
        start_time: s.is_all_day ? null : s.start_time,
        end_time: s.is_all_day ? null : s.end_time,
        is_all_day: s.is_all_day,
        venue_name: src?.venueName || null,
        location: s.location,
        venue_city: 'Gabriola Island',
        category: cat,
        is_approved: true,
        created_by: user?.id,
        source_name: s.source,
        source_url: src?.pageUrl || null,
        series_id: list.length > 1 ? firstId : null,
        is_recurring: list.length > 1,
      }));
      const { error } = await supabase.from('events').insert(rows);
      if (error) throw error;
      await mark(list.map(s => s.id), 'added');
      await load();
    } catch (e: any) {
      alert('Sorry, that didn\'t save: ' + (e?.message || e));
    } finally {
      setBusy(null);
    }
  };

  const ignore = async (key: string, list: Suggestion[], always: boolean) => {
    setBusy(key);
    try {
      if (always) {
        const { error } = await supabase.from('event_finder_ignores')
          .upsert({ source: list[0].source, title_key: titleKey(list[0].title), title: list[0].title }, { onConflict: 'source,title_key' });
        if (error) throw error;
      }
      await mark(list.map(s => s.id), 'ignored');
      await load();
    } catch (e: any) {
      alert('Sorry, that didn\'t work: ' + (e?.message || e));
    } finally {
      setBusy(null);
    }
  };

  const decideGone = async (s: Suggestion, hide: boolean) => {
    if (hide && !confirm(`Hide "${s.title}" on ${prettyDate(s.start_date)} from the calendar? You can bring it back in Supabase.`)) return;
    setBusy(s.id);
    try {
      if (hide && s.event_id) {
        const { error } = await supabase.from('events').update({ deleted_at: new Date().toISOString() }).eq('id', s.event_id);
        if (error) throw error;
      }
      await mark([s.id], hide ? 'hidden' : 'kept');
      await load();
    } catch (e: any) {
      alert('Sorry, that didn\'t work: ' + (e?.message || e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/events" className="inline-flex items-center gap-1 text-sm font-semibold text-gabriola-green mb-4">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Events
      </Link>
      <h1 className="text-3xl font-bold text-gabriola-green mb-1 flex items-center gap-2">
        <Search className="w-7 h-7" aria-hidden="true" /> Event Finder
      </h1>
      <p className="text-gray-600 mb-6">
        Twice a week (Tuesday and Friday mornings) the site checks the {SOURCES.map(s => s.name).join(', ')} for the next 4 weeks.
        Nothing is added or removed until you press a button. Room bookings like set-ups, rehearsals and memorials are left out.
      </p>

      {loading || userLoading ? (
        <p className="text-gray-600" role="status">Loading...</p>
      ) : error ? (
        <p className="font-semibold text-red-700" role="alert">{error}</p>
      ) : (
        <>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Not on our calendar ({groups.length})</h2>
          <p className="text-sm text-gray-600 mb-3">Events on their calendar that we don&apos;t have.</p>
          {groups.length === 0 ? (
            <p className="text-gray-600 mb-8">Nothing new.</p>
          ) : (
            <ul className="space-y-3 mb-8">
              {groups.map(([key, list]) => (
                <li key={key} className="bg-white border-2 border-gray-200 rounded-xl p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-lg font-semibold text-gray-900">{list[0].title}</h3>
                    <span className="text-xs text-gray-500">{list[0].source}</span>
                  </div>
                  {list[0].location && <p className="text-sm text-gray-600">{list[0].location}</p>}
                  <ul className="mt-2 text-sm text-gray-800 space-y-0.5">
                    {list.map(s => <li key={s.id}>{whenText(s)}</li>)}
                  </ul>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <label className="text-sm text-gray-700 flex items-center gap-2">
                      Category
                      <select
                        value={category[key] || 'Community'}
                        onChange={e => setCategory(c => ({ ...c, [key]: e.target.value }))}
                        className="border rounded-lg px-2 py-1.5 text-sm bg-white"
                      >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </label>
                    {busy === key ? (
                      <span className="inline-flex items-center gap-1 text-sm text-gray-700" role="status">
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Saving...
                      </span>
                    ) : (
                      <>
                        <button onClick={() => addEvents(key, list)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gabriola-green text-white text-sm font-semibold hover:opacity-90">
                          <CalendarPlus className="w-4 h-4" aria-hidden="true" />
                          {list.length > 1 ? `Add all ${list.length} dates` : 'Add to calendar'}
                        </button>
                        <button onClick={() => ignore(key, list, false)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border-2 border-gray-300 text-gray-800 text-sm font-semibold hover:bg-gray-50">
                          <X className="w-4 h-4" aria-hidden="true" /> Ignore
                        </button>
                        <button onClick={() => ignore(key, list, true)}
                          title="Never suggest this title again"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border-2 border-gray-300 text-gray-800 text-sm font-semibold hover:bg-gray-50">
                          <Ban className="w-4 h-4" aria-hidden="true" /> Always ignore
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <h2 className="text-xl font-bold text-gray-900 mb-1">Gone from their calendar ({gone.length})</h2>
          <p className="text-sm text-gray-600 mb-3">
            Our events at that venue that aren&apos;t on their calendar that day any more. Often this means cancelled, but check before hiding.
          </p>
          {gone.length === 0 ? (
            <p className="text-gray-600">Nothing gone.</p>
          ) : (
            <ul className="space-y-3">
              {gone.map(s => (
                <li key={s.id} className="bg-white border-2 border-orange-200 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-900">{s.title}</h3>
                  <p className="text-sm text-gray-700">{whenText(s)}</p>
                  <p className="text-xs text-gray-500">Not on the {s.source} that day</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {busy === s.id ? (
                      <span className="inline-flex items-center gap-1 text-sm text-gray-700" role="status">
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Saving...
                      </span>
                    ) : (
                      <>
                        <button onClick={() => decideGone(s, true)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700">
                          <EyeOff className="w-4 h-4" aria-hidden="true" /> Hide from calendar
                        </button>
                        <button onClick={() => decideGone(s, false)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border-2 border-gray-300 text-gray-800 text-sm font-semibold hover:bg-gray-50">
                          <Check className="w-4 h-4" aria-hidden="true" /> Keep
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
