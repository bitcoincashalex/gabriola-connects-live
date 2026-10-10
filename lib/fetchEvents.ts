// lib/fetchEvents.ts
// Loads approved, non-deleted events for the calendar and events pages
// Version: 1.0.0
// Date: 2026-10-10
//
// Supabase returns at most 1,000 rows per request. Loading every event in one
// request silently dropped everything after the first 1,000 (oldest first), so
// current and upcoming events disappeared once the table grew past that.
// This loads events from 6 months ago onward, 1,000 at a time, until done.

import { supabase } from '@/lib/supabase';

const PAGE_SIZE = 1000;
const MONTHS_BACK = 6;

export async function fetchApprovedEvents(): Promise<any[]> {
  const since = new Date();
  since.setMonth(since.getMonth() - MONTHS_BACK);
  const sinceDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Vancouver', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(since);

  const all: any[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('is_approved', true)
      .is('deleted_at', null)
      .gte('start_date', sinceDate)
      .order('start_date', { ascending: true })
      .order('start_time', { ascending: true })
      .order('id', { ascending: true })          // stable order so pages don't overlap
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    all.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return all;
}
