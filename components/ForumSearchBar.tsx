// components/ForumSearchBar.tsx
// Version: 1.4.0 - Block forum search for anon, NO duplicate CTA message
// Date: 2025-01-14
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

  const handleInputFocus = () => {
    if (!user) {
      // Just show a brief tooltip-style message
      alert('Please sign in to search the forum.');
    }
  };

  const handleAdvancedClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      alert('Please sign in to use advanced search.');
    }
  };

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="flex gap-3 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              if (user) {
                setQuery(e.target.value);
              }
            }}
            onFocus={handleInputFocus}
            placeholder={user ? "Search threads and replies..." : "Sign in to search forum..."}
            disabled={!user}
            className={`w-full pl-12 pr-12 py-3 text-base border-2 rounded-xl transition ${
              user 
                ? 'border-gray-300 focus:border-gabriola-green focus:outline-none' 
                : 'border-gray-200 bg-gray-50 cursor-not-allowed text-gray-500'
            }`}
          />
          {query && user && (
            <button
              onClick={handleClear}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
              title="Clear search"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Advanced Search Button */}
        {user ? (
          <Link
            href="/community/search"
            className="flex items-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition font-medium whitespace-nowrap"
            title="Advanced Search"
          >
            <SlidersHorizontal className="w-5 h-5" />
            <span>Advanced</span>
          </Link>
        ) : (
          <button
            onClick={handleAdvancedClick}
            className="flex items-center gap-2 px-4 py-3 bg-gray-100 text-gray-400 rounded-xl font-medium whitespace-nowrap opacity-50 cursor-not-allowed"
            title="Sign in to use advanced search"
          >
            <SlidersHorizontal className="w-5 h-5" />
            <span>Advanced</span>
          </button>
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
            ✓ Found <span className="font-semibold text-gabriola-green">{resultCount}</span> {resultCount === 1 ? 'result' : 'results'} for "{debouncedQuery}"
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
