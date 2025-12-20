// lib/useSearch.ts
// Unified search hook for context-aware searching
// Date: 2025-12-11

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export type SearchScope = 'all' | 'events' | 'directory' | 'ferry' | 'alerts';

interface EventResult {
  id: string;
  title: string;
  description: string;
  start_date: string;
  start_time: string | null;
  location: string;
  venue_name: string | null;
  image_url: string | null;
  category: string | null;
  relevance: number;
}

interface DirectoryResult {
  id: string;
  name: string;
  description: string;
  category: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  relevance: number;
}

interface FerryResult {
  id: string;
  from_location: string;
  to_location: string;
  departure_time: string;
  day_of_week: string;
  notes: string | null;
  relevance: number;
}

interface AlertResult {
  id: string;
  title: string;
  message: string;
  alert_type: string;
  severity: string;
  start_date: string;
  end_date: string | null;
  created_at: string;
  relevance: number;
}

export interface SearchResults {
  events: EventResult[];
  directory: DirectoryResult[];
  ferry: FerryResult[];
  alerts: AlertResult[];
  totalCount: number;
}

export function useSearch() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResults>({
    events: [],
    directory: [],
    ferry: [],
    alerts: [],
    totalCount: 0,
  });

  const search = async (query: string, scope: SearchScope = 'all') => {
    if (!query || query.trim().length < 2) {
      setResults({
        events: [],
        directory: [],
        ferry: [],
        alerts: [],
        totalCount: 0,
      });
      return;
    }

    setLoading(true);
    const trimmedQuery = query.trim();

    try {
      const newResults: SearchResults = {
        events: [],
        directory: [],
        ferry: [],
        alerts: [],
        totalCount: 0,
      };

      // Search events
      if (scope === 'all' || scope === 'events') {
        const { data: eventsData, error: eventsError } = await supabase.rpc(
          'search_events',
          { search_query: trimmedQuery }
        );
        if (!eventsError && eventsData) {
          newResults.events = eventsData;
        }
      }

      // Search directory
      if (scope === 'all' || scope === 'directory') {
        const { data: directoryData, error: directoryError } = await supabase.rpc(
          'search_directory',
          { search_query: trimmedQuery }
        );
        if (!directoryError && directoryData) {
          newResults.directory = directoryData;
        }
      }

      // Search ferry
      if (scope === 'all' || scope === 'ferry') {
        const { data: ferryData, error: ferryError } = await supabase.rpc(
          'search_ferry',
          { search_query: trimmedQuery }
        );
        if (!ferryError && ferryData) {
          newResults.ferry = ferryData;
        }
      }

      // Search alerts
      if (scope === 'all' || scope === 'alerts') {
        const { data: alertsData, error: alertsError } = await supabase.rpc(
          'search_alerts',
          { search_query: trimmedQuery }
        );
        if (!alertsError && alertsData) {
          newResults.alerts = alertsData;
        }
      }

      // Calculate total count
      newResults.totalCount =
        newResults.events.length +
        newResults.directory.length +
        newResults.ferry.length +
        newResults.alerts.length;

      setResults(newResults);
    } catch (error) {
      console.error('Search error:', error);
      setResults({
        events: [],
        directory: [],
        ferry: [],
        alerts: [],
        totalCount: 0,
      });
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
