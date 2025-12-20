// app/community/search/page.tsx
// Version: 2.0.0 - Enabled anonymous user access for forum search
// Date: 2025-12-18

'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Search, Calendar, MessageSquare, MapPin, Ship, AlertTriangle, Filter, X, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

type SearchModule = 'all' | 'events' | 'forum' | 'directory' | 'ferry' | 'alerts';

export default function CommunitySearchPage() {
  const { user } = useUser();
  
  // Search state
  const [query, setQuery] = useState('');
  const [activeModule, setActiveModule] = useState<SearchModule>('all');
  const [loading, setLoading] = useState(false);
  
  // Results
  const [results, setResults] = useState({
    events: [] as any[],
    forum: [] as any[],
    directory: [] as any[],
    ferry: [] as any[],
    alerts: [] as any[],
    totalCount: 0
  });

  // Forum-specific filters
  const [forumSearchIn, setForumSearchIn] = useState({
    titles: true,
    content: true,
    replies: true
  });
  const [forumCategory, setForumCategory] = useState('all');
  const [forumAuthor, setForumAuthor] = useState('');
  const [forumSortBy, setForumSortBy] = useState<'votes' | 'newest' | 'replies'>('votes');

  // Events-specific filters
  const [eventCategory, setEventCategory] = useState('all');
  const [eventLocation, setEventLocation] = useState('');
  
  // Directory-specific filters
  const [directoryCategory, setDirectoryCategory] = useState('all');

  // Alerts-specific filters
  const [alertSeverity, setAlertSeverity] = useState('all');
  const [alertStatus, setAlertStatus] = useState('all');

  // Date range (shared)
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Categories
  const [forumCategories, setForumCategories] = useState<any[]>([]);

  // Fetch forum categories on mount
  useEffect(() => {
    fetchForumCategories();
  }, []);

  const fetchForumCategories = async () => {
    const { data } = await supabase
      .from('bbs_categories')
      .select('*')
      .eq('is_active', true)
      .eq('is_archived', false)
      .order('display_order', { ascending: true });
    
    setForumCategories(data || []);
  };

  const performSearch = async () => {
    if (query.trim().length < 2) return;

    setLoading(true);
    const searchResults = {
      events: [] as any[],
      forum: [] as any[],
      directory: [] as any[],
      ferry: [] as any[],
      alerts: [] as any[],
      totalCount: 0
    };

    const searchTerm = `%${query.trim()}%`;

    try {
      // Search Events
      if (activeModule === 'all' || activeModule === 'events') {
        let eventsQuery = supabase
          .from('events')
          .select('*')
          .eq('is_approved', true)
          .or(`title.ilike.${searchTerm},description.ilike.${searchTerm},location.ilike.${searchTerm}`);

        if (eventCategory !== 'all') {
          eventsQuery = eventsQuery.eq('category', eventCategory);
        }

        if (eventLocation) {
          eventsQuery = eventsQuery.ilike('location', `%${eventLocation}%`);
        }

        if (dateFrom) {
          eventsQuery = eventsQuery.gte('start_date', dateFrom);
        }

        if (dateTo) {
          eventsQuery = eventsQuery.lte('start_date', dateTo);
        }

        const { data } = await eventsQuery.order('start_date', { ascending: true }).limit(50);
        searchResults.events = data || [];
      }

      // Search Forum
      if (activeModule === 'all' || activeModule === 'forum') {
        let forumQuery = supabase
          .from('bbs_posts')
          .select('*, reply_count, vote_score')
          .eq('is_active', true);

        // Build OR conditions based on what user wants to search
        const searchConditions = [];
        if (forumSearchIn.titles) searchConditions.push(`title.ilike.${searchTerm}`);
        if (forumSearchIn.content) searchConditions.push(`body.ilike.${searchTerm}`);

        if (searchConditions.length > 0) {
          forumQuery = forumQuery.or(searchConditions.join(','));
        }

        if (forumCategory !== 'all') {
          forumQuery = forumQuery.eq('category', forumCategory);
        }

        if (forumAuthor) {
          forumQuery = forumQuery.ilike('display_name', `%${forumAuthor}%`);
        }

        if (dateFrom) {
          forumQuery = forumQuery.gte('created_at', dateFrom);
        }

        if (dateTo) {
          forumQuery = forumQuery.lte('created_at', dateTo);
        }

        // Sort
        if (forumSortBy === 'votes') {
          forumQuery = forumQuery.order('vote_score', { ascending: false });
        } else if (forumSortBy === 'newest') {
          forumQuery = forumQuery.order('created_at', { ascending: false });
        } else if (forumSortBy === 'replies') {
          forumQuery = forumQuery.order('reply_count', { ascending: false });
        }

        const { data: forumData } = await forumQuery.limit(50);
        let forumResults = forumData || [];

        // Search replies if enabled
        if (forumSearchIn.replies) {
          const { data: replyMatches } = await supabase
            .from('bbs_replies')
            .select('post_id')
            .ilike('body', searchTerm)
            .eq('is_active', true);

          if (replyMatches && replyMatches.length > 0) {
            const postIdsFromReplies = Array.from(new Set(replyMatches.map(r => r.post_id)));
            const existingIds = new Set(forumResults.map(t => t.id));
            const additionalIds = postIdsFromReplies.filter(id => !existingIds.has(id));

            if (additionalIds.length > 0) {
              const { data: additionalPosts } = await supabase
                .from('bbs_posts')
                .select('*, reply_count, vote_score')
                .eq('is_active', true)
                .in('id', additionalIds);

              if (additionalPosts) {
                forumResults = [...forumResults, ...additionalPosts];
              }
            }
          }
        }

        searchResults.forum = forumResults;
      }

      // Search Directory
      if (activeModule === 'all' || activeModule === 'directory') {
        let directoryQuery = supabase
          .from('directory_businesses')
          .select('*')
          .or(`name.ilike.${searchTerm},description.ilike.${searchTerm},services.ilike.${searchTerm}`);

        if (directoryCategory !== 'all') {
          directoryQuery = directoryQuery.eq('category', directoryCategory);
        }

        const { data } = await directoryQuery.order('name', { ascending: true }).limit(50);
        searchResults.directory = data || [];
      }

      // Search Ferry
      if (activeModule === 'all' || activeModule === 'ferry') {
        const { data } = await supabase
          .from('ferry_schedules')
          .select('*')
          .or(`from_location.ilike.${searchTerm},to_location.ilike.${searchTerm},notes.ilike.${searchTerm}`)
          .order('departure_time', { ascending: true })
          .limit(50);

        searchResults.ferry = data || [];
      }

      // Search Alerts
      if (activeModule === 'all' || activeModule === 'alerts') {
        let alertsQuery = supabase
          .from('alerts')
          .select('*')
          .or(`title.ilike.${searchTerm},message.ilike.${searchTerm}`);

        if (alertStatus === 'active') {
          alertsQuery = alertsQuery.eq('active', true);
        } else if (alertStatus === 'resolved') {
          alertsQuery = alertsQuery.eq('active', false);
        }

        if (alertSeverity !== 'all') {
          alertsQuery = alertsQuery.eq('severity', alertSeverity);
        }

        if (dateFrom) {
          alertsQuery = alertsQuery.gte('created_at', dateFrom);
        }

        if (dateTo) {
          alertsQuery = alertsQuery.lte('created_at', dateTo);
        }

        const { data } = await alertsQuery.order('created_at', { ascending: false }).limit(50);
        searchResults.alerts = data || [];
      }

      // Calculate total
      searchResults.totalCount = 
        searchResults.events.length +
        searchResults.forum.length +
        searchResults.directory.length +
        searchResults.ferry.length +
        searchResults.alerts.length;

      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      performSearch();
    }
  };

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setForumCategory('all');
    setForumAuthor('');
    setForumSortBy('votes');
    setEventCategory('all');
    setEventLocation('');
    setDirectoryCategory('all');
    setAlertSeverity('all');
    setAlertStatus('all');
  };

  if (!user) {
    return <div className="text-center py-20">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gabriola-green mb-2">Community Search</h1>
          <p className="text-gray-600">Search across all of Gabriola Connects</p>
        </div>

        {/* Module Selector */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">Search In:</label>
          <div className="flex gap-2 flex-wrap">
            {(['all', 'events', 'forum', 'directory', 'ferry', 'alerts'] as SearchModule[]).map((module) => (
              <button
                key={module}
                onClick={() => setActiveModule(module)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeModule === module
                    ? 'bg-gabriola-green text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {module.charAt(0).toUpperCase() + module.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Search Input */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Search ${activeModule === 'all' ? 'everything' : activeModule}...`}
                className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
              />
            </div>
            <button
              onClick={performSearch}
              disabled={query.trim().length < 2}
              className="px-8 py-4 bg-gabriola-green text-white rounded-lg font-medium hover:bg-gabriola-green-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Search
            </button>
          </div>

          {/* Module-Specific Filters */}
          {activeModule === 'forum' && (
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-gray-900">Forum Filters</h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                {/* Search In */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search In:</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={forumSearchIn.titles}
                        onChange={(e) => setForumSearchIn({...forumSearchIn, titles: e.target.checked})}
                        className="rounded"
                      />
                      <span className="text-sm">Thread Titles</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={forumSearchIn.content}
                        onChange={(e) => setForumSearchIn({...forumSearchIn, content: e.target.checked})}
                        className="rounded"
                      />
                      <span className="text-sm">Thread Content</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={forumSearchIn.replies}
                        onChange={(e) => setForumSearchIn({...forumSearchIn, replies: e.target.checked})}
                        className="rounded"
                      />
                      <span className="text-sm">Replies</span>
                    </label>
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category:</label>
                  <select
                    value={forumCategory}
                    onChange={(e) => setForumCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
                  >
                    <option value="all">All Categories</option>
                    {forumCategories.map(cat => (
                      <option key={cat.slug} value={cat.slug}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                {/* Author */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Author:</label>
                  <input
                    type="text"
                    value={forumAuthor}
                    onChange={(e) => setForumAuthor(e.target.value)}
                    placeholder="Username or display name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
                  />
                </div>

                {/* Sort By */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sort By:</label>
                  <select
                    value={forumSortBy}
                    onChange={(e) => setForumSortBy(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
                  >
                    <option value="votes">Highest Votes</option>
                    <option value="newest">Newest First</option>
                    <option value="replies">Most Replies</option>
                  </select>
                </div>
              </div>

              {/* Date Range */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">From Date:</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">To Date:</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Events Filters */}
          {activeModule === 'events' && (
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-gray-900">Event Filters</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category:</label>
                  <input
                    type="text"
                    value={eventCategory}
                    onChange={(e) => setEventCategory(e.target.value)}
                    placeholder="e.g., Arts & Culture"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location:</label>
                  <input
                    type="text"
                    value={eventLocation}
                    onChange={(e) => setEventLocation(e.target.value)}
                    placeholder="e.g., Commons"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">From Date:</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">To Date:</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Directory Filters */}
          {activeModule === 'directory' && (
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-gray-900">Directory Filters</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category:</label>
                <input
                  type="text"
                  value={directoryCategory}
                  onChange={(e) => setDirectoryCategory(e.target.value)}
                  placeholder="e.g., Food & Dining"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Alerts Filters */}
          {activeModule === 'alerts' && (
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-gray-900">Alert Filters</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Severity:</label>
                  <select
                    value={alertSeverity}
                    onChange={(e) => setAlertSeverity(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
                  >
                    <option value="all">All Severities</option>
                    <option value="emergency">Emergency</option>
                    <option value="warning">Warning</option>
                    <option value="advisory">Advisory</option>
                    <option value="info">Info</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status:</label>
                  <select
                    value={alertStatus}
                    onChange={(e) => setAlertStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
                  >
                    <option value="all">All Alerts</option>
                    <option value="active">Active Only</option>
                    <option value="resolved">Resolved Only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">From Date:</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">To Date:</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Clear Filters Button */}
          <div className="pt-4 flex justify-end">
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <X className="w-4 h-4" />
              Clear Filters
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gabriola-green"></div>
            <p className="mt-4 text-gray-600">Searching...</p>
          </div>
        )}

        {/* No Results */}
        {!loading && query && results.totalCount === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <p className="text-xl text-gray-600">No results found for "{query}"</p>
            <p className="text-gray-500 mt-2">Try different keywords or adjust your filters</p>
          </div>
        )}

        {/* Results */}
        {!loading && query && results.totalCount > 0 && (
          <div className="space-y-8">
            
            {/* Forum Results */}
            {(activeModule === 'all' || activeModule === 'forum') && results.forum.length > 0 && (
              <section className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-6 h-6 text-gabriola-green" />
                  <h2 className="text-2xl font-bold text-gray-900">Forum ({results.forum.length})</h2>
                </div>
                <div className="space-y-4">
                  {results.forum.map(thread => (
                    <Link
                      key={thread.id}
                      href={`/community/thread/${thread.id}`}
                      className="block p-4 border border-gray-200 rounded-lg hover:shadow-md transition"
                    >
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{thread.title}</h3>
                      <p className="text-gray-700 line-clamp-2 mb-2">{thread.body}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>By {thread.display_name || 'Anonymous'}</span>
                        <span>•</span>
                        <span>{format(new Date(thread.created_at), 'MMM d, yyyy')}</span>
                        <span>•</span>
                        <span>⬆️ {thread.vote_score || 0}</span>
                        <span>💬 {thread.reply_count || 0}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Events Results */}
            {(activeModule === 'all' || activeModule === 'events') && results.events.length > 0 && (
              <section className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-6 h-6 text-gabriola-green" />
                  <h2 className="text-2xl font-bold text-gray-900">Events ({results.events.length})</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {results.events.map(event => (
                    <Link
                      key={event.id}
                      href={`/calendar#${event.id}`}
                      className="block p-4 border border-gray-200 rounded-lg hover:shadow-md transition"
                    >
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{event.title}</h3>
                      <div className="text-sm text-gray-600 mb-2">
                        {format(new Date(event.start_date), 'EEEE, MMMM d, yyyy')}
                        {event.start_time && ` at ${event.start_time}`}
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <MapPin className="w-4 h-4" />
                          {event.location}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Directory Results */}
            {(activeModule === 'all' || activeModule === 'directory') && results.directory.length > 0 && (
              <section className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-6 h-6 text-gabriola-green" />
                  <h2 className="text-2xl font-bold text-gray-900">Directory ({results.directory.length})</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {results.directory.map(business => (
                    <Link
                      key={business.id}
                      href={`/directory#${business.id}`}
                      className="block p-4 border border-gray-200 rounded-lg hover:shadow-md transition"
                    >
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{business.name}</h3>
                      <div className="text-sm font-medium text-gabriola-green mb-2">{business.category}</div>
                      {business.description && (
                        <p className="text-gray-700 text-sm line-clamp-2">{business.description}</p>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Ferry Results */}
            {(activeModule === 'all' || activeModule === 'ferry') && results.ferry.length > 0 && (
              <section className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Ship className="w-6 h-6 text-gabriola-green" />
                  <h2 className="text-2xl font-bold text-gray-900">Ferry ({results.ferry.length})</h2>
                </div>
                <div className="space-y-2">
                  {results.ferry.map((schedule, idx) => (
                    <div key={schedule.id || idx} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{schedule.from_location} → {schedule.to_location}</div>
                          <div className="text-sm text-gray-600">{schedule.departure_time}</div>
                        </div>
                        {schedule.notes && <div className="text-sm text-gray-500">{schedule.notes}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Alerts Results */}
            {(activeModule === 'all' || activeModule === 'alerts') && results.alerts.length > 0 && (
              <section className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-6 h-6 text-gabriola-green" />
                  <h2 className="text-2xl font-bold text-gray-900">Alerts ({results.alerts.length})</h2>
                </div>
                <div className="space-y-4">
                  {results.alerts.map(alert => (
                    <Link
                      key={alert.id}
                      href="/alerts"
                      className="block p-4 border border-gray-200 rounded-lg hover:shadow-md transition"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-bold text-gray-900">{alert.title}</h3>
                        <span className={`px-3 py-1 text-xs rounded-full ${
                          alert.severity === 'emergency' ? 'bg-red-100 text-red-700' :
                          alert.severity === 'warning' ? 'bg-orange-100 text-orange-700' :
                          alert.severity === 'advisory' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-gray-700 mb-2">{alert.message}</p>
                      <div className="text-sm text-gray-500">
                        {format(new Date(alert.created_at), 'MMM d, yyyy')}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
