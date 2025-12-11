// app/search/page.tsx
// Full search page with tabs for filtering results
// Date: 2025-12-11

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSearch, SearchScope } from '@/lib/useSearch';
import { Calendar, MapPin, Ship, AlertTriangle, Search as SearchIcon } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';
  const scopeParam = searchParams.get('scope') as SearchScope | null;
  const [activeScope, setActiveScope] = useState<SearchScope>(scopeParam || 'all');
  const { search, results, loading } = useSearch();

  // Perform search on mount and when query/scope changes
  useEffect(() => {
    if (query.trim().length >= 2) {
      search(query, activeScope);
    }
  }, [query, activeScope]);

  const handleScopeChange = (newScope: SearchScope) => {
    setActiveScope(newScope);
    const params = new URLSearchParams();
    params.set('q', query);
    if (newScope !== 'all') {
      params.set('scope', newScope);
    }
    router.push(`/search?${params.toString()}`);
  };

  if (!query) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center py-20">
          <SearchIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Search Gabriola Connects</h1>
          <p className="text-gray-600">Enter a search query to find events, businesses, ferry schedules, and alerts.</p>
        </div>
      </div>
    );
  }

  const getCountForScope = (scope: SearchScope): number => {
    if (scope === 'all') return results.totalCount;
    if (scope === 'events') return results.events.length;
    if (scope === 'directory') return results.directory.length;
    if (scope === 'ferry') return results.ferry.length;
    if (scope === 'alerts') return results.alerts.length;
    return 0;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Search Results for "{query}"
        </h1>
        {loading ? (
          <p className="text-gray-600">Searching...</p>
        ) : (
          <p className="text-gray-600">
            {results.totalCount} {results.totalCount === 1 ? 'result' : 'results'} found
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-gray-200 overflow-x-auto">
        {(['all', 'events', 'directory', 'ferry', 'alerts'] as SearchScope[]).map((scope) => (
          <button
            key={scope}
            onClick={() => handleScopeChange(scope)}
            className={`px-4 py-3 font-medium whitespace-nowrap transition-colors ${
              activeScope === scope
                ? 'text-gabriola-green border-b-2 border-gabriola-green'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {scope.charAt(0).toUpperCase() + scope.slice(1)} ({getCountForScope(scope)})
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gabriola-green"></div>
          <p className="mt-4 text-gray-600">Searching...</p>
        </div>
      )}

      {/* No Results */}
      {!loading && results.totalCount === 0 && (
        <div className="text-center py-12">
          <p className="text-xl text-gray-600">No results found for "{query}"</p>
          <p className="text-gray-500 mt-2">Try different keywords or check your spelling</p>
        </div>
      )}

      {/* Results */}
      {!loading && results.totalCount > 0 && (
        <div className="space-y-8">
          
          {/* Events Results */}
          {(activeScope === 'all' || activeScope === 'events') && results.events.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-6 h-6 text-gabriola-green" />
                <h2 className="text-2xl font-bold text-gray-900">Events ({results.events.length})</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {results.events.map(event => (
                  <Link
                    key={event.id}
                    href={`/events#${event.id}`}
                    className="block p-6 bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-shadow"
                  >
                    {event.image_url && (
                      <img
                        src={event.image_url}
                        alt={event.title}
                        className="w-full h-40 object-cover rounded-lg mb-4"
                      />
                    )}
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h3>
                    <div className="text-sm text-gray-600 mb-2">
                      {format(new Date(event.start_date), 'EEEE, MMMM d, yyyy')}
                      {event.start_time && ` at ${event.start_time}`}
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                        <MapPin className="w-4 h-4" />
                        {event.location}
                      </div>
                    )}
                    {event.description && (
                      <p className="text-gray-700 line-clamp-2">{event.description}</p>
                    )}
                    {event.category && (
                      <span className="inline-block mt-3 px-3 py-1 bg-gabriola-green/10 text-gabriola-green text-xs rounded-full">
                        {event.category}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Directory Results */}
          {(activeScope === 'all' || activeScope === 'directory') && results.directory.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-6 h-6 text-gabriola-green" />
                <h2 className="text-2xl font-bold text-gray-900">Directory ({results.directory.length})</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {results.directory.map(business => (
                  <Link
                    key={business.id}
                    href={`/directory#${business.id}`}
                    className="block p-6 bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-shadow"
                  >
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{business.name}</h3>
                    <div className="text-sm font-medium text-gabriola-green mb-2">{business.category}</div>
                    {business.description && (
                      <p className="text-gray-700 mb-3 line-clamp-2">{business.description}</p>
                    )}
                    <div className="space-y-1 text-sm text-gray-600">
                      {business.address && <div>{business.address}</div>}
                      {business.phone && <div>{business.phone}</div>}
                      {business.email && <div>{business.email}</div>}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Ferry Results */}
          {(activeScope === 'all' || activeScope === 'ferry') && results.ferry.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Ship className="w-6 h-6 text-gabriola-green" />
                <h2 className="text-2xl font-bold text-gray-900">Ferry Schedule ({results.ferry.length})</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {results.ferry.map((schedule, idx) => (
                  <Link
                    key={schedule.id || idx}
                    href="/ferry"
                    className="block p-6 bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-shadow"
                  >
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {schedule.from_location} → {schedule.to_location}
                    </h3>
                    <div className="text-lg text-gabriola-green font-semibold mb-2">
                      {schedule.departure_time}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">{schedule.day_of_week}</div>
                    {schedule.notes && (
                      <p className="text-gray-700 text-sm">{schedule.notes}</p>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Alerts Results */}
          {(activeScope === 'all' || activeScope === 'alerts') && results.alerts.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-6 h-6 text-gabriola-green" />
                <h2 className="text-2xl font-bold text-gray-900">Alerts ({results.alerts.length})</h2>
              </div>
              <div className="space-y-4">
                {results.alerts.map(alert => (
                  <Link
                    key={alert.id}
                    href="/alerts"
                    className="block p-6 bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{alert.title}</h3>
                      <span className={`px-3 py-1 text-xs rounded-full ${
                        alert.severity === 'critical' ? 'bg-red-100 text-red-700' :
                        alert.severity === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {alert.severity}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">{alert.alert_type}</div>
                    <p className="text-gray-700">{alert.message}</p>
                    <div className="text-sm text-gray-500 mt-2">
                      {format(new Date(alert.start_date), 'MMM d, yyyy')}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gabriola-green"></div>
        </div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}
