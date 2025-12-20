// lib/useSearch.ts
// Search hook with complete types from lib/types/search.ts
// Version: 2.2.0 - Enhanced search to include schedule/recurrence fields
// Date: 2025-12-20

'use client';

import { useState } from 'react';
import { supabase } from './supabase';
import type { Event, DirectoryBusiness, FerrySchedule, Alert } from './types/search';

export type SearchScope = 'all' | 'events' | 'directory' | 'ferry' | 'alerts';

export interface SearchResults {
  events: Event[];
  directory: DirectoryBusiness[];
  ferry: FerrySchedule[];
  alerts: Alert[];
  totalCount: number;
}

export function useSearch() {
  const [results, setResults] = useState<SearchResults>({
    events: [],
    directory: [],
    ferry: [],
    alerts: [],
    totalCount: 0,
  });
  const [loading, setLoading] = useState(false);

  const search = async (query: string, scope: SearchScope = 'all') => {
    if (!query || query.trim().length < 2) {
      clearResults();
      return;
    }

    setLoading(true);

    try {
      const searchResults: SearchResults = {
        events: [],
        directory: [],
        ferry: [],
        alerts: [],
        totalCount: 0,
      };

      const searchTerm = `%${query.toLowerCase()}%`;
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      // Search Events - ALL fields, chronological order, future only
      if (scope === 'all' || scope === 'events') {
        const { data } = await supabase
          .from('events')
          .select('*') // SELECT ALL FIELDS
          .eq('is_approved', true)
          .gte('start_date', today) // ONLY FUTURE EVENTS
          .or(`title.ilike.${searchTerm},description.ilike.${searchTerm},location.ilike.${searchTerm},category.ilike.${searchTerm},recurrence_pattern.ilike.${searchTerm},additional_info.ilike.${searchTerm},venue_name.ilike.${searchTerm},organizer_name.ilike.${searchTerm},organizer_organization.ilike.${searchTerm}`)
          .order('start_date', { ascending: true }) // CHRONOLOGICAL
          .order('start_time', { ascending: true });
        
        searchResults.events = (data || []) as Event[];
      }

      // Search Directory - ALL fields, alphabetical
      if (scope === 'all' || scope === 'directory') {
        const { data } = await supabase
          .from('directory_businesses')
          .select('*') // SELECT ALL FIELDS
          .eq('is_active', true)
          .or(`name.ilike.${searchTerm},description.ilike.${searchTerm},category.ilike.${searchTerm},services.ilike.${searchTerm},specialties.ilike.${searchTerm}`)
          .order('name', { ascending: true });
        
        searchResults.directory = (data || []) as DirectoryBusiness[];
      }

      // Search Ferry - ALL fields
      if (scope === 'all' || scope === 'ferry') {
        const { data } = await supabase
          .from('ferry_schedules')
          .select('*') // SELECT ALL FIELDS
          .or(`schedule_name.ilike.${searchTerm},departure_terminal.ilike.${searchTerm},arrival_terminal.ilike.${searchTerm},notes.ilike.${searchTerm},day_of_week.ilike.${searchTerm},operating_days.ilike.${searchTerm},route_name.ilike.${searchTerm}`)
          .order('departure_time', { ascending: true });
        
        searchResults.ferry = (data || []) as FerrySchedule[];
      }

      // Search Alerts - ALL fields, newest first
      if (scope === 'all' || scope === 'alerts') {
        const { data } = await supabase
          .from('alerts')
          .select('*') // SELECT ALL FIELDS
          .or(`title.ilike.${searchTerm},message.ilike.${searchTerm},category.ilike.${searchTerm}`)
          .order('created_at', { ascending: false });
        
        searchResults.alerts = (data || []) as Alert[];
      }

      // Calculate total
      searchResults.totalCount =
        searchResults.events.length +
        searchResults.directory.length +
        searchResults.ferry.length +
        searchResults.alerts.length;

      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
      clearResults();
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResults({
      events: [],
      directory: [],
      ferry: [],
      alerts: [],
      totalCount: 0,
    });
  };

  return {
    search,
    results,
    loading,
    clearResults,
  };
}
