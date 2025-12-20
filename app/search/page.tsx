// app/search/page.tsx
// Mobile-first search with simple progressive filters
// Version: 3.0.0 - Simple Mobile-First
// Date: 2025-12-18

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSearch, SearchScope } from '@/lib/useSearch';
import { Calendar, MapPin, Ship, AlertTriangle, Search as SearchIcon, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
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
  isEventFree,
  isAlertActive,
  operatesOnDay
} from '@/lib/filters/simpleFilters';

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') || '';
  const scopeParam = searchParams.get('scope') as SearchScope | null;
  
  // Search state
  const [query, setQuery] = useState(initialQuery);
  const [activeScope, setActiveScope] = useState<SearchScope>(scopeParam || 'all');
  const { search, results, loading } = useSearch();
  
  // Filter panel state
  const [showFilters, setShowFilters] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Core filters (always visible when filters shown)
  const [category, setCategory] = useState('all');
  const [location, setLocation] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Events core
  const [islanderOwned, setIslanderOwned] = useState(false);
  
  // Ferry core
  const [ferryDay, setFerryDay] = useState('all');
  const [ferryRoute, setFerryRoute] = useState('all');
  
  // Alerts core
  const [alertSeverity, setAlertSeverity] = useState('all');
  const [activeAlertsOnly, setActiveAlertsOnly] = useState(false);
  
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
  const [ferryUpcomingOnly, setFerryUpcomingOnly] = useState(false);
  
  const [officialOrgOnly, setOfficialOrgOnly] = useState(false);
  const [actionRequiredOnly, setActionRequiredOnly] = useState(false);

  // Perform search
  const performSearch = () => {
    if (query.trim().length >= 2) {
      search(query, activeScope);
      
      // Update URL
      const params = new URLSearchParams();
      params.set('q', query);
      if (activeScope !== 'all') params.set('scope', activeScope);
      router.push(`/search?${params.toString()}`);
    }
  };

  // Auto-search when query or scope changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        performSearch();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, activeScope]);

  // Filter results
  const filterResults = () => {
    let filtered = { ...results };

    // Event filters
    if (activeScope === 'all' || activeScope === 'events') {
      filtered.events = filtered.events.filter(event => {
        // Category filter
        if (category !== 'all' && event.category !== category) return false;
        
        // Location filter
        if (location !== 'all' && event.location && !event.location.includes(location)) return false;
        
        // Date range filter
        if (dateFrom && event.start_date && new Date(event.start_date) < new Date(dateFrom)) return false;
        if (dateTo && event.start_date && new Date(event.start_date) > new Date(dateTo)) return false;
        
        // Advanced filters
        if (registrationRequired && !event.registration_required) return false;
        if (recurringOnly && !event.is_recurring) return false;
        if (weatherDependent && !event.weather_dependent) return false;
        if (freeOnly && !isEventFree(event.fees)) return false;
        
        return true;
      });
    }

    // Directory filters
    if (activeScope === 'all' || activeScope === 'directory') {
      filtered.directory = filtered.directory.filter(business => {
        // Category filter
        if (category !== 'all' && business.category !== category) return false;
        
        // Location filter
        if (location !== 'all' && business.address && !business.address.includes(location)) return false;
        
        // Islander Owned (core filter)
        if (islanderOwned && !business.islander_owned) return false;
        
        // Advanced filters
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
    if (activeScope === 'all' || activeScope === 'ferry') {
      filtered.ferry = filtered.ferry.filter(schedule => {
        // Day filter
        if (ferryDay !== 'all' && !operatesOnDay(schedule, ferryDay)) return false;
        
        // Route filter
        if (ferryRoute !== 'all' && !schedule.departure_terminal?.includes(ferryRoute)) return false;
        
        // Advanced filters
        if (ferryActiveOnly && !schedule.is_active) return false;
        
        return true;
      });
    }

    // Alert filters
    if (activeScope === 'all' || activeScope === 'alerts') {
      filtered.alerts = filtered.alerts.filter(alert => {
        // Severity filter
        if (alertSeverity !== 'all' && alert.severity !== alertSeverity) return false;
        
        // Active only
        if (activeAlertsOnly && !isAlertActive(alert.active, alert.expires_at)) return false;
        
        // Date range
        if (dateFrom && alert.created_at && new Date(alert.created_at) < new Date(dateFrom)) return false;
        if (dateTo && alert.created_at && new Date(alert.created_at) > new Date(dateTo)) return false;
        
        // Advanced filters
        if (actionRequiredOnly && !alert.action_required) return false;
        
        return true;
      });
    }

    // Update total count
    filtered.totalCount =
      filtered.events.length +
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
    
    // Advanced filters
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
    setFerryUpcomingOnly(false);
    setOfficialOrgOnly(false);
    setActionRequiredOnly(false);
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
    
    // Advanced
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
    
    return count;
  };

  const filterCount = activeFilterCount();

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Search Gabriola Connects</h1>
        <p className="text-gray-600">Find events, businesses, ferry schedules, and alerts</p>
      </div>

      {/* Search Input - Large on Mobile */}
      <div className="mb-6">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search everything..."
            className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
          />
        </div>
      </div>

      {/* Scope Tabs - Swipeable on Mobile */}
      <div className="mb-6 overflow-x-auto -mx-4 px-4">
        <div className="flex gap-2 min-w-max">
          {(['all', 'events', 'directory', 'ferry', 'alerts'] as SearchScope[]).map((scope) => (
            <button
              key={scope}
              onClick={() => setActiveScope(scope)}
              className={`px-4 py-3 rounded-lg font-medium whitespace-nowrap transition ${
                activeScope === scope
                  ? 'bg-gabriola-green text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {scope === 'all' ? 'ALL' : scope.toUpperCase()}
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

      {/* Filter Panel - Mobile Optimized */}
      {showFilters && (
        <div className="mb-6 p-4 md:p-6 bg-white border-2 border-gray-200 rounded-lg">
          {/* Events Filters */}
          {(activeScope === 'all' || activeScope === 'events') && (
            <div className="space-y-4 mb-6">
              <h3 className="font-bold text-lg text-gray-900">Event Filters</h3>
              
              {/* Category */}
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

              {/* Location */}
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

              {/* Advanced Event Filters */}
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

          {/* Directory Filters */}
          {(activeScope === 'all' || activeScope === 'directory') && (
            <div className="space-y-4 mb-6">
              <h3 className="font-bold text-lg text-gray-900">Directory Filters</h3>
              
              {/* Category */}
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

              {/* Location */}
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

              {/* Islander Owned - Prominent */}
              <label className="flex items-center gap-3 cursor-pointer p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                <input
                  type="checkbox"
                  checked={islanderOwned}
                  onChange={(e) => setIslanderOwned(e.target.checked)}
                  className="w-6 h-6 text-gabriola-green border-gray-300 rounded focus:ring-gabriola-green"
                />
                <span className="text-base font-medium">Islander Owned</span>
              </label>

              {/* Advanced Directory Filters */}
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

          {/* Ferry Filters */}
          {(activeScope === 'all' || activeScope === 'ferry') && (
            <div className="space-y-4 mb-6">
              <h3 className="font-bold text-lg text-gray-900">Ferry Filters</h3>
              
              {/* Day */}
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

              {/* Route */}
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

              {/* Advanced Ferry Filters */}
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

          {/* Alert Filters */}
          {(activeScope === 'all' || activeScope === 'alerts') && (
            <div className="space-y-4 mb-6">
              <h3 className="font-bold text-lg text-gray-900">Alert Filters</h3>
              
              {/* Severity */}
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

              {/* Active Only */}
              <label className="flex items-center gap-3 cursor-pointer p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                <input
                  type="checkbox"
                  checked={activeAlertsOnly}
                  onChange={(e) => setActiveAlertsOnly(e.target.checked)}
                  className="w-6 h-6 text-gabriola-green border-gray-300 rounded focus:ring-gabriola-green"
                />
                <span className="text-base font-medium">Active Alerts Only</span>
              </label>

              {/* Advanced Alert Filters */}
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

        {/* Results Display */}
        {!loading && filteredResults.totalCount === 0 && query.trim().length >= 2 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No results found for "{query}"</p>
            <p className="text-gray-400 mt-2">Try different keywords or adjust your filters</p>
          </div>
        )}

        {/* Event Results */}
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
                  href={`/events/${event.id}`}
                  className="block p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-gabriola-green transition"
                >
                  <h3 className="font-bold text-lg text-gray-900 mb-1">{event.title}</h3>
                  <p className="text-gray-600 text-sm mb-2 line-clamp-2">{event.description}</p>
                  <div className="flex flex-wrap gap-2 text-sm text-gray-500">
                    {event.start_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(event.start_date), 'MMM d, yyyy')}
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

        {/* Directory Results */}
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

        {/* Ferry Results */}
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
                        {schedule.from_location} → {schedule.to_location}
                      </p>
                      <p className="text-sm text-gray-600">{schedule.departure_time}</p>
                    </div>
                    {schedule.day_of_week && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded">
                        {schedule.day_of_week}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alert Results */}
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

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <SearchPageContent />
    </Suspense>
  );
}
