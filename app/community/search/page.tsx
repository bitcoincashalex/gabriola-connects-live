// app/community/search/page.tsx
// Mobile-first advanced search with simple progressive filters (matches /search)
// Version: 2.1.0 - Fixed date timezone bug and event links
// Date: 2025-12-20

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Calendar, MessageSquare, MapPin, Ship, AlertTriangle, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import {
  eventCategories,
  directoryCategories,
  locations,
  ferryRoutes,
  daysOfWeek,
  alertSeverities,
  eventAdvancedFilters,
  directoryAdvancedFilters,
  ferryAdvancedFilters,
  alertAdvancedFilters,
  forumFilters,
  isEventFree,
  isAlertActive,
  operatesOnDay
} from '@/lib/filters/simpleFilters';

// CRITICAL: Parse dates in local timezone to prevent day-shift
// Database stores dates as YYYY-MM-DD strings
const parseLocalDate = (dateStr: string | Date): Date => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

type SearchModule = 'all' | 'events' | 'forum' | 'directory' | 'ferry' | 'alerts';

export default function CommunitySearchPage() {
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

  // Filter panel state
  const [showFilters, setShowFilters] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Core filters (always visible when filters shown)
  const [category, setCategory] = useState('all');
  const [location, setLocation] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Events/Directory core
  const [islanderOwned, setIslanderOwned] = useState(false);
  
  // Ferry core
  const [ferryDay, setFerryDay] = useState('all');
  const [ferryRoute, setFerryRoute] = useState('all');
  
  // Alerts core
  const [alertSeverity, setAlertSeverity] = useState('all');
  const [activeAlertsOnly, setActiveAlertsOnly] = useState(false);
  
  // Forum core
  const [forumCategory, setForumCategory] = useState('all');
  const [forumCategories, setForumCategories] = useState<any[]>([]);
  
  // Advanced filters (behind toggle)
  const [registrationRequired, setRegistrationRequired] = useState(false);
  const [recurringOnly, setRecurringOnly] = useState(false);
  const [weatherDependent, setWeatherDependent] = useState(false);
  const [freeOnly, setFreeOnly] = useState(false);
  
  const [localBusiness, setLocalBusiness] = useState(false);
  const [wheelchairAccessible, setWheelchairAccessible] = useState(false);
  const [parkingAvailable, setParkingAvailable] = useState(false);
  const [acceptsCash, setAcceptsCash] = useState(false);
  const [acceptsCredit, setAcceptsCredit] = useState(false);
  const [offersDelivery, setOffersDelivery] = useState(false);
  
  const [ferryActiveOnly, setFerryActiveOnly] = useState(false);
  
  const [officialOrgOnly, setOfficialOrgOnly] = useState(false);
  const [actionRequiredOnly, setActionRequiredOnly] = useState(false);
  
  const [hasReplies, setHasReplies] = useState(false);
  const [pinnedOnly, setPinnedOnly] = useState(false);

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

    if (data) {
      setForumCategories(data);
    }
  };

  // Perform search
  const performSearch = async () => {
    if (!query || query.trim().length < 2) {
      setResults({
        events: [],
        forum: [],
        directory: [],
        ferry: [],
        alerts: [],
        totalCount: 0,
      });
      return;
    }

    setLoading(true);
    const searchTerm = `%${query.trim()}%`;

    try {
      const searchResults: any = {
        events: [],
        forum: [],
        directory: [],
        ferry: [],
        alerts: [],
        totalCount: 0,
      };

      // Search Events
      if (activeModule === 'all' || activeModule === 'events') {
        let eventsQuery = supabase
          .from('events')
          .select('*')
          .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
          .order('start_date', { ascending: false })
          .limit(50);

        const { data } = await eventsQuery;
        searchResults.events = data || [];
      }

      // Search Forum Posts
      if (activeModule === 'all' || activeModule === 'forum') {
        let postsQuery = supabase
          .from('bbs_posts')
          .select('*')
          .or(`title.ilike.${searchTerm},body.ilike.${searchTerm}`)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(50);

        const { data } = await postsQuery;
        searchResults.forum = data || [];
      }

      // Search Directory
      if (activeModule === 'all' || activeModule === 'directory') {
        let directoryQuery = supabase
          .from('directory_businesses')
          .select('*')
          .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
          .eq('is_active', true)
          .limit(50);

        const { data } = await directoryQuery;
        searchResults.directory = data || [];
      }

      // Search Ferry
      if (activeModule === 'all' || activeModule === 'ferry') {
        let ferryQuery = supabase
          .from('ferry_schedule')
          .select('*')
          .eq('is_active', true)
          .order('departure_time', { ascending: true })
          .limit(50);

        const { data } = await ferryQuery;
        searchResults.ferry = data || [];
      }

      // Search Alerts
      if (activeModule === 'all' || activeModule === 'alerts') {
        let alertsQuery = supabase
          .from('alerts')
          .select('*')
          .or(`title.ilike.${searchTerm},message.ilike.${searchTerm}`)
          .order('created_at', { ascending: false })
          .limit(50);

        const { data } = await alertsQuery;
        searchResults.alerts = data || [];
      }

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

  // Auto-search when query changes
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch();
    }, 300);
    return () => clearTimeout(timer);
  }, [query, activeModule]);

  // Filter results
  const filterResults = () => {
    let filtered = { ...results };

    // Event filters
    if (activeModule === 'all' || activeModule === 'events') {
      filtered.events = filtered.events.filter(event => {
        if (category !== 'all' && event.category !== category) return false;
        if (location !== 'all' && event.location && !event.location.includes(location)) return false;
        if (dateFrom && event.start_date && new Date(event.start_date) < new Date(dateFrom)) return false;
        if (dateTo && event.start_date && new Date(event.start_date) > new Date(dateTo)) return false;
        if (registrationRequired && !event.registration_required) return false;
        if (recurringOnly && !event.is_recurring) return false;
        if (weatherDependent && !event.weather_dependent) return false;
        if (freeOnly && !isEventFree(event.fees)) return false;
        return true;
      });
    }

    // Forum filters
    if (activeModule === 'all' || activeModule === 'forum') {
      filtered.forum = filtered.forum.filter(post => {
        if (forumCategory !== 'all' && post.category_id !== forumCategory) return false;
        if (dateFrom && post.created_at && new Date(post.created_at) < new Date(dateFrom)) return false;
        if (dateTo && post.created_at && new Date(post.created_at) > new Date(dateTo)) return false;
        if (hasReplies && post.reply_count === 0) return false;
        if (pinnedOnly && !post.is_pinned && !post.global_pinned) return false;
        return true;
      });
    }

    // Directory filters
    if (activeModule === 'all' || activeModule === 'directory') {
      filtered.directory = filtered.directory.filter(business => {
        if (category !== 'all' && business.category !== category) return false;
        if (location !== 'all' && business.address && !business.address.includes(location)) return false;
        if (islanderOwned && !business.islander_owned) return false;
        if (localBusiness && !business.local_business) return false;
        if (wheelchairAccessible && !business.wheelchair_accessible) return false;
        if (parkingAvailable && !business.parking_available) return false;
        if (acceptsCash && !business.accepts_cash) return false;
        if (acceptsCredit && !business.accepts_credit) return false;
        if (offersDelivery && !business.offers_delivery) return false;
        return true;
      });
    }

    // Ferry filters
    if (activeModule === 'all' || activeModule === 'ferry') {
      filtered.ferry = filtered.ferry.filter(schedule => {
        if (ferryDay !== 'all' && !operatesOnDay(schedule, ferryDay)) return false;
        if (ferryRoute !== 'all' && !schedule.departure_terminal?.includes(ferryRoute)) return false;
        if (ferryActiveOnly && !schedule.is_active) return false;
        return true;
      });
    }

    // Alert filters
    if (activeModule === 'all' || activeModule === 'alerts') {
      filtered.alerts = filtered.alerts.filter(alert => {
        if (alertSeverity !== 'all' && alert.severity !== alertSeverity) return false;
        if (activeAlertsOnly && !isAlertActive(alert.active, alert.expires_at)) return false;
        if (dateFrom && alert.created_at && new Date(alert.created_at) < new Date(dateFrom)) return false;
        if (dateTo && alert.created_at && new Date(alert.created_at) > new Date(dateTo)) return false;
        if (actionRequiredOnly && !alert.action_required) return false;
        return true;
      });
    }

    filtered.totalCount =
      filtered.events.length +
      filtered.forum.length +
      filtered.directory.length +
      filtered.ferry.length +
      filtered.alerts.length;

    return filtered;
  };

  const filteredResults = filterResults();

  // Clear all filters
  const clearAllFilters = () => {
    setCategory('all');
    setLocation('all');
    setDateFrom('');
    setDateTo('');
    setIslanderOwned(false);
    setFerryDay('all');
    setFerryRoute('all');
    setAlertSeverity('all');
    setActiveAlertsOnly(false);
    setForumCategory('all');
    
    setRegistrationRequired(false);
    setRecurringOnly(false);
    setWeatherDependent(false);
    setFreeOnly(false);
    setLocalBusiness(false);
    setWheelchairAccessible(false);
    setParkingAvailable(false);
    setAcceptsCash(false);
    setAcceptsCredit(false);
    setOffersDelivery(false);
    setFerryActiveOnly(false);
    setOfficialOrgOnly(false);
    setActionRequiredOnly(false);
    setHasReplies(false);
    setPinnedOnly(false);
  };

  // Count active filters
  const activeFilterCount = () => {
    let count = 0;
    if (category !== 'all') count++;
    if (location !== 'all') count++;
    if (dateFrom || dateTo) count++;
    if (islanderOwned) count++;
    if (ferryDay !== 'all') count++;
    if (ferryRoute !== 'all') count++;
    if (alertSeverity !== 'all') count++;
    if (activeAlertsOnly) count++;
    if (forumCategory !== 'all') count++;
    
    if (registrationRequired) count++;
    if (recurringOnly) count++;
    if (weatherDependent) count++;
    if (freeOnly) count++;
    if (localBusiness) count++;
    if (wheelchairAccessible) count++;
    if (parkingAvailable) count++;
    if (acceptsCash) count++;
    if (acceptsCredit) count++;
    if (offersDelivery) count++;
    if (ferryActiveOnly) count++;
    if (officialOrgOnly) count++;
    if (actionRequiredOnly) count++;
    if (hasReplies) count++;
    if (pinnedOnly) count++;
    
    return count;
  };

  const filterCount = activeFilterCount();

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Advanced Search</h1>
        <p className="text-gray-600">Search across events, forum, directory, ferry, and alerts</p>
      </div>

      {/* Search Input - Large on Mobile */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search everything..."
            className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
          />
        </div>
      </div>

      {/* Module Tabs - Swipeable on Mobile */}
      <div className="mb-6 overflow-x-auto -mx-4 px-4">
        <div className="flex gap-2 min-w-max">
          {(['all', 'forum', 'events', 'directory', 'ferry', 'alerts'] as SearchModule[]).map((module) => (
            <button
              key={module}
              onClick={() => setActiveModule(module)}
              className={`px-4 py-3 rounded-lg font-medium whitespace-nowrap transition ${
                activeModule === module
                  ? 'bg-gabriola-green text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {module === 'all' ? 'ALL' : module.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Toggle Button - Large Touch Target */}
      <div className="mb-6">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-gray-300 rounded-lg hover:border-gabriola-green transition"
        >
          <Filter className="w-5 h-5" />
          <span className="font-medium">Filters</span>
          {filterCount > 0 && (
            <span className="px-2 py-1 bg-gabriola-green text-white text-sm rounded-full">
              {filterCount}
            </span>
          )}
          {showFilters ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {/* Filter Panel - Mobile Optimized (IDENTICAL to /search) */}
      {showFilters && (
        <div className="mb-6 p-4 md:p-6 bg-white border-2 border-gray-200 rounded-lg">
          {/* Forum Filters (Community Search Specific) */}
          {(activeModule === 'all' || activeModule === 'forum') && (
            <div className="space-y-4 mb-6 pb-6 border-b">
              <h3 className="font-bold text-lg text-gray-900">Forum Filters</h3>
              
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={forumCategory}
                  onChange={(e) => setForumCategory(e.target.value)}
                  className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
                >
                  <option value="all">All Categories</option>
                  {forumCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
                  />
                </div>
              </div>

              {/* Advanced Forum Filters */}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-gabriola-green font-medium"
              >
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                More Filters
              </button>

              {showAdvanced && (
                <div className="grid grid-cols-1 gap-3 p-4 bg-gray-50 rounded-lg">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasReplies}
                      onChange={(e) => setHasReplies(e.target.checked)}
                      className="w-5 h-5 text-gabriola-green border-gray-300 rounded focus:ring-gabriola-green"
                    />
                    <span className="text-base">Has Replies</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pinnedOnly}
                      onChange={(e) => setPinnedOnly(e.target.checked)}
                      className="w-5 h-5 text-gabriola-green border-gray-300 rounded focus:ring-gabriola-green"
                    />
                    <span className="text-base">Pinned Posts</span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Events Filters - SAME AS /search */}
          {(activeModule === 'all' || activeModule === 'events') && (
            <div className="space-y-4 mb-6 pb-6 border-b">
              <h3 className="font-bold text-lg text-gray-900">Event Filters</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
                >
                  {eventCategories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
                >
                  {locations.map(loc => (
                    <option key={loc.value} value={loc.value}>{loc.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
                  />
                </div>
              </div>

              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-gabriola-green font-medium"
              >
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                More Filters
              </button>

              {showAdvanced && (
                <div className="grid grid-cols-1 gap-3 p-4 bg-gray-50 rounded-lg">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={registrationRequired}
                      onChange={(e) => setRegistrationRequired(e.target.checked)}
                      className="w-5 h-5 text-gabriola-green border-gray-300 rounded focus:ring-gabriola-green"
                    />
                    <span className="text-base">Registration Required</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={recurringOnly}
                      onChange={(e) => setRecurringOnly(e.target.checked)}
                      className="w-5 h-5 text-gabriola-green border-gray-300 rounded focus:ring-gabriola-green"
                    />
                    <span className="text-base">Recurring Events</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={weatherDependent}
                      onChange={(e) => setWeatherDependent(e.target.checked)}
                      className="w-5 h-5 text-gabriola-green border-gray-300 rounded focus:ring-gabriola-green"
                    />
                    <span className="text-base">Weather Dependent</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={freeOnly}
                      onChange={(e) => setFreeOnly(e.target.checked)}
                      className="w-5 h-5 text-gabriola-green border-gray-300 rounded focus:ring-gabriola-green"
                    />
                    <span className="text-base">Free Events Only</span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Directory Filters - SAME AS /search */}
          {(activeModule === 'all' || activeModule === 'directory') && (
            <div className="space-y-4 mb-6 pb-6 border-b">
              <h3 className="font-bold text-lg text-gray-900">Directory Filters</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
                >
                  {directoryCategories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
                >
                  {locations.map(loc => (
                    <option key={loc.value} value={loc.value}>{loc.label}</option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-3 cursor-pointer p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                <input
                  type="checkbox"
                  checked={islanderOwned}
                  onChange={(e) => setIslanderOwned(e.target.checked)}
                  className="w-6 h-6 text-gabriola-green border-gray-300 rounded focus:ring-gabriola-green"
                />
                <span className="text-base font-medium">Islander Owned</span>
              </label>

              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-gabriola-green font-medium"
              >
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                More Filters
              </button>

              {showAdvanced && (
                <div className="grid grid-cols-1 gap-3 p-4 bg-gray-50 rounded-lg">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localBusiness}
                      onChange={(e) => setLocalBusiness(e.target.checked)}
                      className="w-5 h-5 text-gabriola-green border-gray-300 rounded focus:ring-gabriola-green"
                    />
                    <span className="text-base">Local Business</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={wheelchairAccessible}
                      onChange={(e) => setWheelchairAccessible(e.target.checked)}
                      className="w-5 h-5 text-gabriola-green border-gray-300 rounded focus:ring-gabriola-green"
                    />
                    <span className="text-base">Wheelchair Accessible</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={parkingAvailable}
                      onChange={(e) => setParkingAvailable(e.target.checked)}
                      className="w-5 h-5 text-gabriola-green border-gray-300 rounded focus:ring-gabriola-green"
                    />
                    <span className="text-base">Parking Available</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptsCash}
                      onChange={(e) => setAcceptsCash(e.target.checked)}
                      className="w-5 h-5 text-gabriola-green border-gray-300 rounded focus:ring-gabriola-green"
                    />
                    <span className="text-base">Accepts Cash</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptsCredit}
                      onChange={(e) => setAcceptsCredit(e.target.checked)}
                      className="w-5 h-5 text-gabriola-green border-gray-300 rounded focus:ring-gabriola-green"
                    />
                    <span className="text-base">Accepts Credit</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={offersDelivery}
                      onChange={(e) => setOffersDelivery(e.target.checked)}
                      className="w-5 h-5 text-gabriola-green border-gray-300 rounded focus:ring-gabriola-green"
                    />
                    <span className="text-base">Offers Delivery</span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Ferry Filters - SAME AS /search */}
          {(activeModule === 'all' || activeModule === 'ferry') && (
            <div className="space-y-4 mb-6 pb-6 border-b">
              <h3 className="font-bold text-lg text-gray-900">Ferry Filters</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Day of Week</label>
                <select
                  value={ferryDay}
                  onChange={(e) => setFerryDay(e.target.value)}
                  className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
                >
                  {daysOfWeek.map(day => (
                    <option key={day.value} value={day.value}>{day.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Route</label>
                <select
                  value={ferryRoute}
                  onChange={(e) => setFerryRoute(e.target.value)}
                  className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
                >
                  {ferryRoutes.map(route => (
                    <option key={route.value} value={route.value}>{route.label}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-gabriola-green font-medium"
              >
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                More Filters
              </button>

              {showAdvanced && (
                <div className="grid grid-cols-1 gap-3 p-4 bg-gray-50 rounded-lg">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ferryActiveOnly}
                      onChange={(e) => setFerryActiveOnly(e.target.checked)}
                      className="w-5 h-5 text-gabriola-green border-gray-300 rounded focus:ring-gabriola-green"
                    />
                    <span className="text-base">Active Schedule Only</span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Alert Filters - SAME AS /search */}
          {(activeModule === 'all' || activeModule === 'alerts') && (
            <div className="space-y-4 mb-6">
              <h3 className="font-bold text-lg text-gray-900">Alert Filters</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
                <select
                  value={alertSeverity}
                  onChange={(e) => setAlertSeverity(e.target.value)}
                  className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
                >
                  {alertSeverities.map(sev => (
                    <option key={sev.value} value={sev.value}>{sev.label}</option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-3 cursor-pointer p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                <input
                  type="checkbox"
                  checked={activeAlertsOnly}
                  onChange={(e) => setActiveAlertsOnly(e.target.checked)}
                  className="w-6 h-6 text-gabriola-green border-gray-300 rounded focus:ring-gabriola-green"
                />
                <span className="text-base font-medium">Active Alerts Only</span>
              </label>

              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-gabriola-green font-medium"
              >
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                More Filters
              </button>

              {showAdvanced && (
                <div className="grid grid-cols-1 gap-3 p-4 bg-gray-50 rounded-lg">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={officialOrgOnly}
                      onChange={(e) => setOfficialOrgOnly(e.target.checked)}
                      className="w-5 h-5 text-gabriola-green border-gray-300 rounded focus:ring-gabriola-green"
                    />
                    <span className="text-base">Official Organizations Only</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={actionRequiredOnly}
                      onChange={(e) => setActionRequiredOnly(e.target.checked)}
                      className="w-5 h-5 text-gabriola-green border-gray-300 rounded focus:ring-gabriola-green"
                    />
                    <span className="text-base">Action Required</span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Clear Filters Button */}
          {filterCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="w-full px-6 py-3 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition"
            >
              Clear All Filters
            </button>
          )}
        </div>
      )}

      {/* Results */}
      <div>
        <div className="mb-4">
          <p className="text-gray-600">
            {loading ? 'Searching...' : `${filteredResults.totalCount} results found`}
          </p>
        </div>

        {!loading && filteredResults.totalCount === 0 && query.trim().length >= 2 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No results found for "{query}"</p>
            <p className="text-gray-400 mt-2">Try different keywords or adjust your filters</p>
          </div>
        )}

        {/* Forum Results */}
        {filteredResults.forum.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-gabriola-green" />
              Forum Posts ({filteredResults.forum.length})
            </h2>
            <div className="space-y-4">
              {filteredResults.forum.map((post: any) => (
                <Link
                  key={post.id}
                  href={`/community/${post.id}`}
                  className="block p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-gabriola-green transition"
                >
                  <h3 className="font-bold text-lg text-gray-900 mb-1">{post.title}</h3>
                  <p className="text-gray-600 text-sm mb-2 line-clamp-2">{post.body}</p>
                  <div className="flex flex-wrap gap-2 text-sm text-gray-500">
                    <span>{post.reply_count || 0} replies</span>
                    <span>•</span>
                    <span>{format(new Date(post.created_at), 'MMM d, yyyy')}</span>
                    {post.is_pinned && (
                      <>
                        <span>•</span>
                        <span className="text-gabriola-green font-medium">Pinned</span>
                      </>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Event, Directory, Ferry, Alert Results - SAME AS /search */}
        {/* (Reusing same result display code from search-page-mobile-first.tsx) */}
        
        {filteredResults.events.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-gabriola-green" />
              Events ({filteredResults.events.length})
            </h2>
            <div className="space-y-4">
              {filteredResults.events.map((event: any) => (
                <Link
                  key={event.id}
                  href="/calendar"
                  className="block p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-gabriola-green transition"
                >
                  <h3 className="font-bold text-lg text-gray-900 mb-1">{event.title}</h3>
                  <p className="text-gray-600 text-sm mb-2 line-clamp-2">{event.description}</p>
                  <div className="flex flex-wrap gap-2 text-sm text-gray-500">
                    {event.start_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(parseLocalDate(event.start_date), 'MMM d, yyyy')}
                      </span>
                    )}
                    {event.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {event.location}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {filteredResults.directory.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-6 h-6 text-gabriola-green" />
              Directory ({filteredResults.directory.length})
            </h2>
            <div className="space-y-4">
              {filteredResults.directory.map((business: any) => (
                <Link
                  key={business.id}
                  href={`/directory/${business.id}`}
                  className="block p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-gabriola-green transition"
                >
                  <h3 className="font-bold text-lg text-gray-900 mb-1">{business.name}</h3>
                  <p className="text-gray-600 text-sm mb-2 line-clamp-2">{business.description}</p>
                  <div className="flex flex-wrap gap-2 text-sm text-gray-500">
                    {business.category && <span className="px-2 py-1 bg-gray-100 rounded">{business.category}</span>}
                    {business.address && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {business.address}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {filteredResults.ferry.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Ship className="w-6 h-6 text-gabriola-green" />
              Ferry Schedule ({filteredResults.ferry.length})
            </h2>
            <div className="space-y-2">
              {filteredResults.ferry.map((schedule: any) => (
                <div
                  key={schedule.id}
                  className="p-4 bg-white border-2 border-gray-200 rounded-lg"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900">
                        {schedule.departure_terminal} → {schedule.arrival_terminal}
                      </p>
                      <p className="text-sm text-gray-600">{schedule.departure_time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredResults.alerts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-gabriola-green" />
              Alerts ({filteredResults.alerts.length})
            </h2>
            <div className="space-y-4">
              {filteredResults.alerts.map((alert: any) => (
                <Link
                  key={alert.id}
                  href="/alerts"
                  className="block p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-gabriola-green transition"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-lg text-gray-900">{alert.title}</h3>
                    <span className={`px-3 py-1 text-xs rounded-full ${
                      alert.severity === 'emergency' ? 'bg-red-100 text-red-700' :
                      alert.severity === 'warning' ? 'bg-orange-100 text-orange-700' :
                      alert.severity === 'advisory' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-gray-700 mb-2 line-clamp-2">{alert.message}</p>
                  {alert.created_at && (
                    <p className="text-sm text-gray-500">
                      {format(new Date(alert.created_at), 'MMM d, yyyy')}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
