// components/ForumSearchBar.tsx
// Version: 1.5.0 - Forum redesign: one full-width box (no longer cut off on phones); guests see
//                  "Sign in to search the forum" with no greyed-out Advanced button; Advanced is
//                  an icon button for members; no pop-up alert for guests
// Previous: 1.4.0 - Block forum search for anon, NO duplicate CTA message
// Date: 2026-10-10
'use client';

import { useState, useEffect } from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/components/AuthProvider';

interface ForumSearchBarProps {
  onSearch: (query: string) => void;
  onClear: () => void;
  resultCount?: number;
  isSearching?: boolean;
}

export default function ForumSearchBar({ 
  onSearch, 
  onClear, 
  resultCount,
  isSearching 
}: ForumSearchBarProps) {
  const { user } = useUser();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search input (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Trigger search ONLY if user is logged in
  useEffect(() => {
    if (!user) {
      return; // Don't search if not logged in
    }

    if (debouncedQuery.length >= 2) {
      onSearch(debouncedQuery);
    } else if (debouncedQuery.length === 0) {
      onClear();
    }
  }, [debouncedQuery, onSearch, onClear, user]);

  const handleClear = () => {
    setQuery('');
    setDebouncedQuery('');
    onClear();
  };



  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center">
        <label className="flex-1 relative">
          <span className="sr-only">Search the forum</span>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#5B6660]" aria-hidden="true" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              if (user) {
                setQuery(e.target.value);
              }
            }}
            placeholder={user ? 'Search threads and replies...' : 'Sign in to search the forum'}
            disabled={!user}
            className={`w-full min-h-[44px] pl-10 pr-10 text-[15px] border rounded-xl transition ${
              user
                ? 'border-[#CFC6B4] bg-white focus:border-gabriola-green focus:outline-none focus:ring-2 focus:ring-gabriola-green/30'
                : 'border-[#E3DCCF] bg-[#F6F2EA] cursor-not-allowed text-[#5B6660]'
            }`}
          />
          {query && user && (
            <button
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-[#5B6660] hover:text-[#1F2A24]"
              aria-label="Clear search"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </label>

        {/* Advanced search (members only) */}
        {user && (
          <Link
            href="/community/search"
            className="flex items-center justify-center gap-2 min-h-[44px] min-w-[44px] px-3 border border-[#CFC6B4] bg-white hover:border-gabriola-green text-[#1F2A24] rounded-xl transition font-medium whitespace-nowrap"
            aria-label="Advanced search"
            title="Advanced search"
          >
            <SlidersHorizontal className="w-5 h-5" />
            <span className="hidden sm:inline text-sm">Advanced</span>
          </Link>
        )}
      </div>

      {/* Search Status - Only for logged-in users */}
      {user && isSearching && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-4 h-4 border-2 border-gabriola-green border-t-transparent rounded-full animate-spin" />
          Searching...
        </div>
      )}

      {user && !isSearching && debouncedQuery.length >= 2 && resultCount !== undefined && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Found <span className="font-semibold text-gabriola-green">{resultCount}</span> {resultCount === 1 ? 'result' : 'results'} for "{debouncedQuery}"
          </div>
          <button
            onClick={handleClear}
            className="text-sm text-gabriola-green hover:text-gabriola-green-dark font-medium"
          >
            Clear search
          </button>
        </div>
      )}

      {user && !isSearching && debouncedQuery.length >= 2 && resultCount === 0 && (
        <div className="text-sm text-gray-600">
          No results found for "{debouncedQuery}" – try different keywords
        </div>
      )}
    </div>
  );
}
