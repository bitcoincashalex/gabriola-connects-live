// components/SearchResultsInline.tsx
// Mobile-optimized inline search results dropdown
// Version: 2.1.0 - Fixed date timezone bug and event links
// Date: 2025-12-20

'use client';

import { SearchResults } from '@/lib/useSearch';
import { Calendar, MapPin, Ship, AlertTriangle, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

// CRITICAL: Parse dates in local timezone to prevent day-shift
// Database stores dates as YYYY-MM-DD strings
const parseLocalDate = (dateStr: string | Date): Date => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

interface SearchResultsInlineProps {
  results: SearchResults;
  loading: boolean;
  query: string;
  onClose: () => void;
}

export default function SearchResultsInline({ 
  results, 
  loading, 
  query,
  onClose 
}: SearchResultsInlineProps) {
  
  if (loading) {
    return (
      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 z-50 max-h-[70vh] overflow-y-auto">
        <div className="text-center py-8 text-gray-500">
          Searching...
        </div>
      </div>
    );
  }

  if (!query || query.trim().length < 2) {
    return null;
  }

  if (results.totalCount === 0) {
    return (
      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 z-50">
        <div className="text-center py-8 text-gray-500">
          No results found for "{query}"
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 max-h-[70vh] overflow-y-auto">
      <div className="p-4 space-y-4">
        
        {/* Events Results */}
        {results.events.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-gabriola-green" />
              <h3 className="font-semibold text-gray-900">Events ({results.events.length})</h3>
            </div>
            <div className="space-y-2">
              {results.events.slice(0, 3).map(event => (
                <Link
                  key={event.id}
                  href="/calendar"
                  onClick={onClose}
                  className="block p-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="font-medium text-gray-900">{event.title}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {event.start_date && format(parseLocalDate(event.start_date), 'MMM d, yyyy')}
                    {event.start_time && ` • ${event.start_time}`}
                  </div>
                  {event.location && (
                    <div className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {event.location}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Directory Results */}
        {results.directory.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-gabriola-green" />
              <h3 className="font-semibold text-gray-900">Directory ({results.directory.length})</h3>
            </div>
            <div className="space-y-2">
              {results.directory.slice(0, 3).map(business => (
                <Link
                  key={business.id}
                  href={`/directory#${business.id}`}
                  onClick={onClose}
                  className="block p-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="font-medium text-gray-900">{business.name}</div>
                  <div className="text-sm text-gray-600 mt-1">{business.category}</div>
                  {business.description && (
                    <div className="text-sm text-gray-500 mt-1 line-clamp-1">
                      {business.description}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Ferry Results */}
        {results.ferry.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Ship className="w-4 h-4 text-gabriola-green" />
              <h3 className="font-semibold text-gray-900">Ferry ({results.ferry.length})</h3>
            </div>
            <div className="space-y-2">
              {results.ferry.slice(0, 3).map((schedule, idx) => (
                <Link
                  key={schedule.id || idx}
                  href="/ferry"
                  onClick={onClose}
                  className="block p-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="font-medium text-gray-900">
                    {schedule.departure_terminal} → {schedule.arrival_terminal}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Departs {schedule.departure_time}
                  </div>
                  {schedule.schedule_name && (
                    <div className="text-sm text-gray-500 mt-1">{schedule.schedule_name}</div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Alerts Results */}
        {results.alerts.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-gabriola-green" />
              <h3 className="font-semibold text-gray-900">Alerts ({results.alerts.length})</h3>
            </div>
            <div className="space-y-2">
              {results.alerts.slice(0, 3).map(alert => (
                <Link
                  key={alert.id}
                  href="/alerts"
                  onClick={onClose}
                  className="block p-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="font-medium text-gray-900">{alert.title}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {alert.category && `${alert.category} • `}{alert.severity}
                  </div>
                  {alert.message && (
                    <div className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {alert.message}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* See All Results Link */}
        {results.totalCount > 6 && (
          <Link
            href={`/search?q=${encodeURIComponent(query)}`}
            onClick={onClose}
            className="block text-center py-3 text-gabriola-green hover:text-gabriola-green-dark font-medium border-t border-gray-200"
          >
            See all {results.totalCount} results →
          </Link>
        )}
      </div>
    </div>
  );
}
