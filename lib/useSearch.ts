// lib/useSearch.ts
// Search hook with complete types from lib/types/search.ts
// Version: 2.0.0 - Using Complete Shared Types
// Date: 2025-12-18

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

      // Search Events
      if (scope === 'all' || scope === 'events') {
        const { data } = await supabase.rpc('search_events', { search_query: query });
        searchResults.events = (data || []) as Event[];
      }

      // Search Directory
      if (scope === 'all' || scope === 'directory') {
        const { data } = await supabase.rpc('search_directory', { search_query: query });
        searchResults.directory = (data || []) as DirectoryBusiness[];
      }

      // Search Ferry
      if (scope === 'all' || scope === 'ferry') {
        const { data } = await supabase.rpc('search_ferry', { search_query: query });
        searchResults.ferry = (data || []) as FerrySchedule[];
      }

      // Search Alerts
      if (scope === 'all' || scope === 'alerts') {
        const { data } = await supabase.rpc('search_alerts', { search_query: query });
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
