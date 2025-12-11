// components/HeaderSearch.tsx
// Context-aware search that changes based on current page
// Date: 2025-12-11

'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { useSearch, SearchScope } from '@/lib/useSearch';
import SearchResultsInline from './SearchResultsInline';

export default function HeaderSearch() {
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const { search, results, loading, clearResults } = useSearch();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Determine search scope based on current page
  const scope: SearchScope = 
    pathname === '/' ? 'all' :
    pathname.includes('/events') ? 'events' :
    pathname.includes('/directory') ? 'directory' :
    pathname.includes('/ferry') ? 'ferry' :
    pathname.includes('/alerts') ? 'alerts' :
    'all';

  // Get placeholder text based on scope
  const placeholder = 
    scope === 'all' ? 'Search everything...' :
    scope === 'events' ? 'Search events...' :
    scope === 'directory' ? 'Search directory...' :
    scope === 'ferry' ? 'Search ferry schedule...' :
    scope === 'alerts' ? 'Search alerts...' :
    'Search...';

  // Perform search when query changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        search(query, scope);
        setShowResults(true);
      } else {
        clearResults();
        setShowResults(false);
      }
    }, 300); // Debounce 300ms

    return () => clearTimeout(timer);
  }, [query, scope]);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close results when pathname changes
  useEffect(() => {
    setShowResults(false);
    setQuery('');
    clearResults();
  }, [pathname]);

  const handleClear = () => {
    setQuery('');
    clearResults();
    setShowResults(false);
    inputRef.current?.focus();
  };

  const handleClose = () => {
    setShowResults(false);
    setQuery('');
    clearResults();
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length >= 2 && setShowResults(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-white/20"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {showResults && (
        <SearchResultsInline
          results={results}
          loading={loading}
          query={query}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
