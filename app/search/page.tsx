// app/search/page.tsx
// Complete schemas: Alert (15 fields), DirectoryBusiness (73 fields), Event (62 fields), FerrySchedule (12 fields)
// Version: 3.1.4 - Added FerrySchedule interface to fix TypeScript errors
// Date: 2025-12-20

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSearch, SearchScope } from '@/lib/useSearch';
import { Calendar, MapPin, Ship, AlertTriangle, Search as SearchIcon, Filter, X, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import Footer from '@/components/Footer';

// Extended Alert interface - matches actual database schema
interface Alert {
  id: string;
  severity: string;  // varchar - emergency, warning, advisory, info
  title: string;
  message: string;
  issued_by: string;  // uuid - who created the alert
  on_behalf_of_name: string | null;
  on_behalf_of_organization: string | null;
  created_at: string;  // timestamp
  updated_at: string;  // timestamp
  expires_at: string | null;  // timestamp
  active: boolean;
  affected_areas: string[] | null;  // array
  category: string | null;
  contact_info: string | null;
  action_required: string | null;
}

// DirectoryBusiness interface - matches actual database schema (73 fields)
interface DirectoryBusiness {
  // Core fields
  id: string;
  name: string;
  category: string;
  
  // Contact information
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  
  // Business details
  description: string | null;
  image: string | null;
  services: string | null;
  specialties: string | null;
  tagline: string | null;
  subcategory: string | null;
  
  // Location data
  lat: number | null;
  lng: number | null;
  geom: any | null;  // PostGIS geometry type
  address_line2: string | null;
  postal_code: string | null;
  map_url: string | null;
  location_notes: string | null;
  
  // Owner/contact details
  owner_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  
  // Social media
  facebook_url: string | null;
  instagram_url: string | null;
  
  // Hours of operation
  hours_monday: string | null;
  hours_tuesday: string | null;
  hours_wednesday: string | null;
  hours_thursday: string | null;
  hours_friday: string | null;
  hours_saturday: string | null;
  hours_sunday: string | null;
  hours_notes: string | null;
  
  // Seasonal/timing
  is_year_round: boolean | null;
  seasonal_closure_notes: string | null;
  established_year: number | null;
  
  // Payment options
  price_range: string | null;
  accepts_cash: boolean | null;
  accepts_credit: boolean | null;
  accepts_debit: boolean | null;
  accepts_etransfer: boolean | null;
  
  // Amenities & features
  wheelchair_accessible: boolean | null;
  parking_available: boolean | null;
  wifi_available: boolean | null;
  pet_friendly: boolean | null;
  family_friendly: boolean | null;
  outdoor_seating: boolean | null;
  
  // Services offered
  offers_delivery: boolean | null;
  offers_pickup: boolean | null;
  offers_shipping: boolean | null;
  offers_online_booking: boolean | null;
  
  // Business credentials
  licensed: boolean | null;
  insured: boolean | null;
  organic_certified: boolean | null;
  local_business: boolean | null;
  islander_owned: boolean | null;
  chamber_member: boolean | null;
  
  // Media
  logo_url: string | null;
  cover_image_url: string | null;
  gallery_images: string[] | null;
  video_url: string | null;
  
  // Status & admin
  is_approved: boolean | null;
  is_featured: boolean | null;
  is_active: boolean | null;
  claimed_by_owner: string | null;
  verified_date: string | null;
  
  // Timestamps & tracking
  created_at: string | null;
  updated_at: string | null;
  last_updated: string | null;
  created_by: string | null;
  view_count: number | null;
  click_count: number | null;
}

// FerrySchedule interface - matches ferry_schedules table
interface FerrySchedule {
  id: string;
  route_name: string;
  from_location: string;
  to_location: string;
  departure_time: string;
  arrival_time: string | null;
  day_of_week: string;
  is_active: boolean;
  vessel_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Event interface - matches actual database schema (62 fields)
interface Event {
  // Core fields
  id: string;
  title: string;
  description: string;
  
  // Date & time
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  is_all_day: boolean | null;
  
  // Location
  location: string | null;
  venue_name: string | null;
  venue_address: string | null;
  venue_city: string | null;
  venue_postal_code: string | null;
  venue_map_url: string | null;
  parking_info: string | null;
  
  // Category & status
  category: string | null;
  status: string | null;
  is_featured: boolean | null;
  is_approved: boolean | null;
  
  // Recurrence
  is_recurring: boolean | null;
  recurrence_pattern: string | null;
  
  // Registration & attendance
  registration_required: boolean | null;
  registration_url: string | null;
  registration_deadline: string | null;
  max_attendees: number | null;
  min_attendees: number | null;
  rsvp_count: number | null;
  waitlist_enabled: boolean | null;
  waitlist_count: number | null;
  fees: string | null;
  
  // Organizer information
  organizer_name: string | null;
  organizer_organization: string | null;
  organizer_website: string | null;
  
  // Contact
  contact_email: string | null;
  contact_phone: string | null;
  
  // Additional details
  image_url: string | null;
  additional_info: string | null;
  age_restrictions: string | null;
  accessibility_info: string | null;
  what_to_bring: string | null;
  dress_code: string | null;
  
  // Cancellation/postponement
  cancelled_at: string | null;
  cancellation_reason: string | null;
  postponed_from_date: string | null;
  weather_dependent: boolean | null;
  
  // Source & sync
  source_name: string | null;
  source_url: string | null;
  source_type: string | null;
  external_event_id: string | null;
  external_calendar_url: string | null;
  last_synced_at: string | null;
  
  // Search & metadata
  tags: string[] | null;
  keywords: string | null;
  search_vector: any | null;  // tsvector type
  
  // Timestamps & users
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  deleted_by: string | null;
  deleted_at: string | null;
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') || '';
  const scopeParam = searchParams.get('scope') as SearchScope | null;
  
  // Search state
  const [query, setQuery] = useState(initialQuery);
  const [activeScope, setActiveScope] = useState<SearchScope>(scopeParam || 'all');
  const { search, results, loading } = useSearch();
  
  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'name'>('relevance');

  // Alert-specific filters
  const [alertSeverity, setAlertSeverity] = useState('all');
  const [alertStatus, setAlertStatus] = useState('all');

  // Ferry-specific filters
  const [ferryDay, setFerryDay] = useState('all');
  const [ferryRoute, setFerryRoute] = useState('all');
  const [ferryTimeOfDay, setFerryTimeOfDay] = useState('all');

  // Categories for filtering
  const categories = {
    events: ['Arts & Culture', 'Community', 'Education', 'Entertainment', 'Food & Drink', 'Health & Wellness', 'Music', 'Outdoors', 'Sports & Recreation'],
    directory: ['Food & Dining', 'Services', 'Retail', 'Health & Wellness', 'Arts & Crafts', 'Accommodations', 'Recreation', 'Professional Services'],
  };

  const locations = ['North End', 'South End', 'Central', 'Village', 'Silva Bay', 'Descanso Bay'];

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

  // Search on mount if query exists
  useEffect(() => {
    if (initialQuery.trim().length >= 2) {
      search(initialQuery, activeScope);
    }
  }, []);

  const handleScopeChange = (newScope: SearchScope) => {
    setActiveScope(newScope);
    if (query.trim().length >= 2) {
      search(query, newScope);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      performSearch();
    }
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const toggleLocation = (location: string) => {
    setSelectedLocations(prev =>
      prev.includes(location)
        ? prev.filter(l => l !== location)
        : [...prev, location]
    );
  };

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSelectedCategories([]);
    setSelectedLocations([]);
    setSortBy('relevance');
    // Alert filters
    setAlertSeverity('all');
    setAlertStatus('all');
    // Ferry filters
    setFerryDay('all');
    setFerryRoute('all');
    setFerryTimeOfDay('all');
  };

  const getCountForScope = (scope: SearchScope): number => {
    if (scope === 'all') return results.totalCount;
    if (scope === 'events') return results.events.length;
    if (scope === 'directory') return results.directory.length;
    if (scope === 'ferry') return results.ferry.length;
    if (scope === 'alerts') return results.alerts.length;
    return 0;
  };

  // Filter results based on advanced filters
  const filterResults = () => {
    let filtered = { ...results };

    // Date filtering for events
    if (dateFrom || dateTo) {
      filtered.events = filtered.events.filter(event => {
        if (!event.start_date) return false; // Skip events without dates
        const eventDate = new Date(event.start_date);
        if (dateFrom && eventDate < new Date(dateFrom)) return false;
        if (dateTo && eventDate > new Date(dateTo)) return false;
        return true;
      });
    }

    // Category filtering
    if (selectedCategories.length > 0) {
      filtered.events = filtered.events.filter(event =>
        event.category && selectedCategories.includes(event.category)
      );
      filtered.directory = filtered.directory.filter(business =>
        business.category && selectedCategories.includes(business.category)
      );
    }

    // Location filtering (for events with location field)
    if (selectedLocations.length > 0) {
      filtered.events = filtered.events.filter(event =>
        event.location && selectedLocations.some(loc => event.location?.includes(loc))
      );
      filtered.directory = filtered.directory.filter(business =>
        business.address && selectedLocations.some(loc => business.address?.includes(loc))
      );
    }

    // Sorting
    if (sortBy === 'date') {
      filtered.events.sort((a, b) => {
        // Handle null dates - events without dates go to the end
        if (!a.start_date && !b.start_date) return 0;
        if (!a.start_date) return 1;
        if (!b.start_date) return -1;
        return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
      });
    } else if (sortBy === 'name') {
      filtered.events.sort((a, b) => a.title.localeCompare(b.title));
      filtered.directory.sort((a, b) => a.name.localeCompare(b.name));
    }

    // Alert filtering
    if (alertSeverity !== 'all') {
      filtered.alerts = filtered.alerts.filter(alert =>
        alert.severity === alertSeverity
      );
    }
    if (alertStatus === 'active') {
      filtered.alerts = filtered.alerts.filter(alert => (alert as Alert).active === true);
    } else if (alertStatus === 'resolved') {
      filtered.alerts = filtered.alerts.filter(alert => (alert as Alert).active === false);
    }
    // Date filtering for alerts
    if (dateFrom || dateTo) {
      filtered.alerts = filtered.alerts.filter(alert => {
        const alertDate = new Date((alert as Alert).created_at);
        if (dateFrom && alertDate < new Date(dateFrom)) return false;
        if (dateTo && alertDate > new Date(dateTo)) return false;
        return true;
      });
    }

    // Ferry filtering
    if (ferryDay !== 'all') {
      filtered.ferry = filtered.ferry.filter(schedule =>
        schedule.day_of_week === ferryDay
      );
    }
    if (ferryRoute !== 'all') {
      filtered.ferry = filtered.ferry.filter(schedule =>
        schedule.from_location?.includes(ferryRoute)
      );
    }
    if (ferryTimeOfDay !== 'all') {
      filtered.ferry = filtered.ferry.filter(schedule => {
        if (!schedule.departure_time) return false;
        const time = schedule.departure_time;
        const hour = parseInt(time.split(':')[0]);
        
        if (ferryTimeOfDay === 'morning') return hour >= 5 && hour < 12;
        if (ferryTimeOfDay === 'afternoon') return hour >= 12 && hour < 18;
        if (ferryTimeOfDay === 'evening') return hour >= 18 || hour < 5;
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
  const hasActiveFilters = dateFrom || dateTo || selectedCategories.length > 0 || selectedLocations.length > 0 || 
    alertSeverity !== 'all' || alertStatus !== 'all' || 
    ferryDay !== 'all' || ferryRoute !== 'all' || ferryTimeOfDay !== 'all';

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      
      {/* Search Input Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Search Gabriola Connects</h1>
		{/* Scope Selector - Added */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <span className="text-sm text-gray-600 self-center font-medium mr-2">Search in:</span>
          {(['all', 'events', 'directory', 'ferry', 'alerts'] as SearchScope[]).map((scope) => (
            <button
              key={scope}
              onClick={() => setActiveScope(scope)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${ activeScope === scope
                  ? 'bg-gabriola-green text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {scope.charAt(0).toUpperCase() + scope.slice(1)}
            </button>
          ))}
        </div>
        
        {/* Main Search Bar */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Search events, businesses, ferry schedules, alerts..."
              className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
            />
          </div>
          <button
            onClick={performSearch}
            disabled={query.trim().length < 2}
            className="px-8 py-4 bg-gabriola-green text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Search
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-6 py-4 border-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
              showFilters ? 'border-gabriola-green text-gabriola-green bg-green-50' : 'border-gray-300 text-gray-700 hover:border-gray-400'
            }`}
          >
            <Filter className="w-5 h-5" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 px-2 py-0.5 bg-gabriola-green text-white text-xs rounded-full">
                {(dateFrom ? 1 : 0) + (dateTo ? 1 : 0) + selectedCategories.length + selectedLocations.length + 
                 (alertSeverity !== 'all' ? 1 : 0) + (alertStatus !== 'all' ? 1 : 0) + 
                 (ferryDay !== 'all' ? 1 : 0) + (ferryRoute !== 'all' ? 1 : 0) + (ferryTimeOfDay !== 'all' ? 1 : 0)}
              </span>
            )}
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 space-y-6">
            
            {/* Date Range - Show for ALL, Events */}
            {(activeScope === 'all' || activeScope === 'events') && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Date Range {activeScope === 'all' && '(Events)'}
                </h3>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm text-gray-600 mb-1">From</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm text-gray-600 mb-1">To</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Event Categories - Show ONLY for Events scope */}
            {activeScope === 'events' && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Event Categories</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {categories.events.map(category => (
                    <label key={category} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category)}
                        onChange={() => toggleCategory(category)}
                        className="w-4 h-4 text-gabriola-green rounded focus:ring-gabriola-green"
                      />
                      <span className="text-sm text-gray-700">{category}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Directory Categories - Show ONLY for Directory scope */}
            {activeScope === 'directory' && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Business Categories</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {categories.directory.map(category => (
                    <label key={category} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category)}
                        onChange={() => toggleCategory(category)}
                        className="w-4 h-4 text-gabriola-green rounded focus:ring-gabriola-green"
                      />
                      <span className="text-sm text-gray-700">{category}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Locations - Show for ALL, Events, Directory */}
            {(activeScope === 'all' || activeScope === 'events' || activeScope === 'directory') && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Location
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {locations.map(location => (
                    <label key={location} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedLocations.includes(location)}
                        onChange={() => toggleLocation(location)}
                        className="w-4 h-4 text-gabriola-green rounded focus:ring-gabriola-green"
                      />
                      <span className="text-sm text-gray-700">{location}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Sort - Show for ALL, Events, Directory (not Ferry or Alerts) */}
            {(activeScope === 'all' || activeScope === 'events' || activeScope === 'directory') && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Sort By</h3>
                <div className="flex gap-4">
                  {(['relevance', 'date', 'name'] as const).map(option => (
                    <label key={option} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="sortBy"
                        checked={sortBy === option}
                        onChange={() => setSortBy(option)}
                        className="w-4 h-4 text-gabriola-green focus:ring-gabriola-green"
                      />
                      <span className="text-sm text-gray-700 capitalize">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Alert Filters */}
            {activeScope === 'alerts' && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Alert Filters</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Severity</label>
                    <select
                      value={alertSeverity}
                      onChange={(e) => setAlertSeverity(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
                    >
                      <option value="all">All Severities</option>
                      <option value="emergency">Emergency</option>
                      <option value="warning">Warning</option>
                      <option value="advisory">Advisory</option>
                      <option value="info">Info</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Status</label>
                    <select
                      value={alertStatus}
                      onChange={(e) => setAlertStatus(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
                    >
                      <option value="all">All Alerts</option>
                      <option value="active">Active Only</option>
                      <option value="resolved">Resolved Only</option>
                    </select>
                  </div>
                </div>
                {/* Date Range for Alerts */}
                <div className="mt-4">
                  <h4 className="font-medium text-gray-700 mb-2">Date Range</h4>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm text-gray-600 mb-1">From</label>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm text-gray-600 mb-1">To</label>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Ferry Filters */}
            {activeScope === 'ferry' && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Ferry Schedule Filters</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Day of Week</label>
                    <select
                      value={ferryDay}
                      onChange={(e) => setFerryDay(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
                    >
                      <option value="all">All Days</option>
                      <option value="Monday">Monday</option>
                      <option value="Tuesday">Tuesday</option>
                      <option value="Wednesday">Wednesday</option>
                      <option value="Thursday">Thursday</option>
                      <option value="Friday">Friday</option>
                      <option value="Saturday">Saturday</option>
                      <option value="Sunday">Sunday</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Route</label>
                    <select
                      value={ferryRoute}
                      onChange={(e) => setFerryRoute(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
                    >
                      <option value="all">All Routes</option>
                      <option value="Gabriola">From Gabriola</option>
                      <option value="Nanaimo">From Nanaimo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Time of Day</label>
                    <select
                      value={ferryTimeOfDay}
                      onChange={(e) => setFerryTimeOfDay(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
                    >
                      <option value="all">All Times</option>
                      <option value="morning">Morning (5am-12pm)</option>
                      <option value="afternoon">Afternoon (12pm-6pm)</option>
                      <option value="evening">Evening (6pm-12am)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Clear Filters */}
            {hasActiveFilters && (
              <div className="pt-4 border-t border-gray-300">
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-2 text-gabriola-green hover:text-green-700 font-medium"
                >
                  <X className="w-4 h-4" />
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* Results Summary */}
        {query && !loading && (
          <p className="text-gray-600 mt-4">
            {filteredResults.totalCount} {filteredResults.totalCount === 1 ? 'result' : 'results'} found for "{query}"
            {hasActiveFilters && ' (filtered)'}
          </p>
        )}
      </div>

      {/* No Query State - Show Tips */}
      {!query && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-2">Search Tips:</h3>
          <ul className="space-y-1 text-sm text-gray-700">
            <li>• Try searching for "coffee", "market", "yoga", or "ferry"</li>
            <li>• Use filters to narrow down by date, category, or location</li>
            <li>• Search works across events, businesses, ferry schedules, and alerts</li>
            <li>• Results are sorted by relevance by default</li>
          </ul>
        </div>
      )}

      {/* Tabs */}
      {query && (
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
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gabriola-green"></div>
          <p className="mt-4 text-gray-600">Searching...</p>
        </div>
      )}

      {/* No Results */}
      {!loading && query && filteredResults.totalCount === 0 && (
        <div className="text-center py-12">
          <p className="text-xl text-gray-600">No results found for "{query}"</p>
          <p className="text-gray-500 mt-2">Try different keywords or adjust your filters</p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 text-gabriola-green hover:text-green-700 font-medium"
            >
              Clear filters and try again
            </button>
          )}
        </div>
      )}

      {/* Results - Same as before but using filteredResults */}
      {!loading && query && filteredResults.totalCount > 0 && (
        <div className="space-y-8">
          
          {/* Events Results */}
          {(activeScope === 'all' || activeScope === 'events') && filteredResults.events.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-6 h-6 text-gabriola-green" />
                <h2 className="text-2xl font-bold text-gray-900">Events ({filteredResults.events.length})</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {filteredResults.events.map(event => (
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
                    {event.start_date && (
                      <div className="text-sm text-gray-600 mb-2">
                        {format(new Date(event.start_date), 'EEEE, MMMM d, yyyy')}
                        {event.start_time && ` at ${event.start_time}`}
                      </div>
                    )}
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
          {(activeScope === 'all' || activeScope === 'directory') && filteredResults.directory.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-6 h-6 text-gabriola-green" />
                <h2 className="text-2xl font-bold text-gray-900">Directory ({filteredResults.directory.length})</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {filteredResults.directory.map(business => (
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
          {(activeScope === 'all' || activeScope === 'ferry') && filteredResults.ferry.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Ship className="w-6 h-6 text-gabriola-green" />
                <h2 className="text-2xl font-bold text-gray-900">Ferry Schedule ({filteredResults.ferry.length})</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {filteredResults.ferry.map((schedule, idx) => (
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
          {(activeScope === 'all' || activeScope === 'alerts') && filteredResults.alerts.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-6 h-6 text-gabriola-green" />
                <h2 className="text-2xl font-bold text-gray-900">Alerts ({filteredResults.alerts.length})</h2>
              </div>
              <div className="space-y-4">
                {filteredResults.alerts.map(alert => (
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
                    {alert.category && (
                      <div className="text-sm text-gray-600 mb-2">{alert.category}</div>
                    )}
                    <p className="text-gray-700">{alert.message}</p>
                    <div className="text-sm text-gray-500 mt-2">
                      {format(new Date(alert.created_at), 'MMM d, yyyy')}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
      
      <Footer />
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
