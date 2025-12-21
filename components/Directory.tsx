// components/Directory.tsx
// Version: 3.0.0 - MASSIVELY ENHANCED: 60+ fields (hours, amenities, payment, credentials, social)
// Date: 2025-12-20

'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import FileUploader from './FileUploader';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { MapPin, Phone, Mail, Globe, Plus, X, Search } from 'lucide-react';

interface DirectoryListing {
  id: string;
  name: string;
  category: string;
  address: string;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
  image?: string;
}

const CATEGORY_ORDER = [
  'Community','Arts','Restaurant','Accommodation','Recreation','Health',
  'Pet Services','Shopping','Grocery','Agriculture','Marine','Construction',
  'Home Services','Professional Services','Utilities','Services'
];

export default function Directory() {
  const { user } = useUser();
  const [listings, setListings] = useState<DirectoryListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [customCategory, setCustomCategory] = useState('');
  const [files, setFiles] = useState<string[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<DirectoryListing | null>(null);

  const [formData, setFormData] = useState({
    // Existing basic fields
    name: '',
    category: 'Restaurant',
    address: '',
    phone: '',
    email: '',
    website: '',
    description: '',
    
    // NEW - Basic Info
    tagline: '',
    subcategory: '',
    services: '',
    specialties: '',
    owner_name: '',
    contact_phone: '',
    contact_email: '',
    established_year: '',
    
    // NEW - Location
    address_line2: '',
    postal_code: '',
    map_url: '',
    location_notes: '',
    
    // NEW - Hours
    hours_monday: '',
    hours_tuesday: '',
    hours_wednesday: '',
    hours_thursday: '',
    hours_friday: '',
    hours_saturday: '',
    hours_sunday: '',
    hours_notes: '',
    is_year_round: true,
    seasonal_closure_notes: '',
    
    // NEW - Payment
    price_range: '',
    accepts_cash: true,
    accepts_credit: true,
    accepts_debit: true,
    accepts_etransfer: false,
    
    // NEW - Amenities
    wheelchair_accessible: false,
    parking_available: true,
    wifi_available: false,
    pet_friendly: false,
    family_friendly: true,
    outdoor_seating: false,
    
    // NEW - Services
    offers_delivery: false,
    offers_pickup: false,
    offers_shipping: false,
    offers_online_booking: false,
    
    // NEW - Credentials
    local_business: true,
    islander_owned: true,
    chamber_member: false,
    licensed: false,
    insured: false,
    organic_certified: false,
    
    // NEW - Social Media
    facebook_url: '',
    instagram_url: '',
    video_url: '',
    
    // NEW - Media (will be handled by FileUploader)
    logo_url: '',
    cover_image_url: '',
  });

  useEffect(() => {
    const fetchListings = async () => {
      const { data } = await supabase
        .from('directory_businesses')
        .select('*')
        .order('name');
      setListings(data || []);
      setLoading(false);
    };
    fetchListings();
  }, []);

  const categories = ['All', ...CATEGORY_ORDER, 'Other'];

  const filteredListings = useMemo(() => {
    return listings
      .filter(l =>
        searchQuery === '' ||
        l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .filter(l => selectedCategory === 'All' || l.category === selectedCategory)
      .sort((a, b) => {
        const catA = CATEGORY_ORDER.indexOf(a.category);
        const catB = CATEGORY_ORDER.indexOf(b.category);
        if (catA !== catB) return (catA === -1 ? 999 : catA) - (catB === -1 ? 999 : catB);
        return a.name.localeCompare(b.name);
      });
  }, [listings, searchQuery, selectedCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = formData.category === 'Other' ? customCategory.trim() : formData.category;
    if (!formData.name.trim() || !finalCategory || !formData.address.trim()) {
      alert('Please fill in Business Name, Category, and Address');
      return;
    }

    const { error } = await supabase.from('directory_businesses').insert({
      // Basic Info
      name: formData.name.trim(),
      category: finalCategory,
      tagline: formData.tagline.trim() || null,
      subcategory: formData.subcategory.trim() || null,
      description: formData.description.trim() || null,
      services: formData.services.trim() || null,
      specialties: formData.specialties.trim() || null,
      established_year: formData.established_year ? parseInt(formData.established_year) : null,
      
      // Contact
      phone: formData.phone.trim() || null,
      email: formData.email.trim() || null,
      website: formData.website.trim() || null,
      owner_name: formData.owner_name.trim() || null,
      contact_phone: formData.contact_phone.trim() || null,
      contact_email: formData.contact_email.trim() || null,
      
      // Location
      address: formData.address.trim(),
      address_line2: formData.address_line2.trim() || null,
      postal_code: formData.postal_code.trim() || null,
      map_url: formData.map_url.trim() || null,
      location_notes: formData.location_notes.trim() || null,
      
      // Hours
      hours_monday: formData.hours_monday.trim() || null,
      hours_tuesday: formData.hours_tuesday.trim() || null,
      hours_wednesday: formData.hours_wednesday.trim() || null,
      hours_thursday: formData.hours_thursday.trim() || null,
      hours_friday: formData.hours_friday.trim() || null,
      hours_saturday: formData.hours_saturday.trim() || null,
      hours_sunday: formData.hours_sunday.trim() || null,
      hours_notes: formData.hours_notes.trim() || null,
      is_year_round: formData.is_year_round,
      seasonal_closure_notes: formData.seasonal_closure_notes.trim() || null,
      
      // Payment
      price_range: formData.price_range || null,
      accepts_cash: formData.accepts_cash,
      accepts_credit: formData.accepts_credit,
      accepts_debit: formData.accepts_debit,
      accepts_etransfer: formData.accepts_etransfer,
      
      // Amenities
      wheelchair_accessible: formData.wheelchair_accessible,
      parking_available: formData.parking_available,
      wifi_available: formData.wifi_available,
      pet_friendly: formData.pet_friendly,
      family_friendly: formData.family_friendly,
      outdoor_seating: formData.outdoor_seating,
      
      // Services
      offers_delivery: formData.offers_delivery,
      offers_pickup: formData.offers_pickup,
      offers_shipping: formData.offers_shipping,
      offers_online_booking: formData.offers_online_booking,
      
      // Credentials
      local_business: formData.local_business,
      islander_owned: formData.islander_owned,
      chamber_member: formData.chamber_member,
      licensed: formData.licensed,
      insured: formData.insured,
      organic_certified: formData.organic_certified,
      
      // Social Media
      facebook_url: formData.facebook_url.trim() || null,
      instagram_url: formData.instagram_url.trim() || null,
      video_url: formData.video_url.trim() || null,
      
      // Media
      image: files[0] || null,
      logo_url: formData.logo_url || null,
      cover_image_url: formData.cover_image_url || null,
    });

    if (!error) {
      alert('Business added! Thank you! 🌟');
      setShowAddForm(false);
      // Reset form to defaults
      setFormData({
        name: '', category: 'Restaurant', address: '', phone: '', email: '', website: '', description: '',
        tagline: '', subcategory: '', services: '', specialties: '', owner_name: '', contact_phone: '', contact_email: '', established_year: '',
        address_line2: '', postal_code: '', map_url: '', location_notes: '',
        hours_monday: '', hours_tuesday: '', hours_wednesday: '', hours_thursday: '', hours_friday: '', hours_saturday: '', hours_sunday: '',
        hours_notes: '', is_year_round: true, seasonal_closure_notes: '',
        price_range: '', accepts_cash: true, accepts_credit: true, accepts_debit: true, accepts_etransfer: false,
        wheelchair_accessible: false, parking_available: true, wifi_available: false, pet_friendly: false, family_friendly: true, outdoor_seating: false,
        offers_delivery: false, offers_pickup: false, offers_shipping: false, offers_online_booking: false,
        local_business: true, islander_owned: true, chamber_member: false, licensed: false, insured: false, organic_certified: false,
        facebook_url: '', instagram_url: '', video_url: '',
        logo_url: '', cover_image_url: '',
      });
      setFiles([]);
      setCustomCategory('');
      const { data } = await supabase.from('directory_businesses').select('*');
      if (data) setListings(data);
    } else {
      alert('Error adding business: ' + error.message);
    }
  };

  if (loading) return <div className="text-center py-32 text-2xl">Loading 53+ businesses...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gabriola-sand/20 via-white to-gabriola-sand/10">
      {/* ===== CHAMBER OF COMMERCE THANK YOU BANNER ===== */}
      <div className="bg-gradient-to-r from-gabriola-green to-green-700 text-white py-6 border-b-4 border-gabriola-green-dark shadow-lg">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <p className="text-2xl md:text-3xl font-bold mb-2">
                🙏 Thank You Gabriola Chamber of Commerce!
              </p>
              <p className="text-lg text-green-50">
                Supporting local businesses and our island community
              </p>
            </div>
            <a
              href="https://business.gabriolachamber.ca/directory"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-gabriola-green px-8 py-4 rounded-full font-bold hover:bg-green-50 shadow-lg transition flex items-center gap-2 whitespace-nowrap"
            >
              Visit Chamber Directory →
            </a>
          </div>
        </div>
      </div>

      {/* ===== SEARCH & HEADER SECTION ===== */}
      <div className="bg-white border-b border-gabriola-green/20 py-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-gabriola-green">Island Directory</h1>
            {user && (
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-gabriola-green text-white px-8 py-4 rounded-full font-bold hover:bg-gabriola-green-dark flex items-center gap-3 shadow-lg"
              >
                <Plus className="w-6 h-6" />
                {showAddForm ? 'Cancel' : 'Add Your Business'}
              </button>
            )}
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search businesses..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 border rounded-xl focus:ring-2 focus:ring-gabriola-green outline-none text-lg"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="px-6 py-4 border rounded-xl focus:ring-2 focus:ring-gabriola-green outline-none text-lg"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="max-w-2xl mx-auto p-8 bg-white border-b">
          <h3 className="text-2xl font-bold text-gabriola-green mb-6">Add Your Business</h3>
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* SECTION 1: Basic Information */}
            <div className="bg-white border-2 border-gabriola-green/20 rounded-xl p-6">
              <h4 className="text-xl font-bold text-gabriola-green-dark mb-4">📝 Basic Information</h4>
              <div className="space-y-4">
                <input type="text" placeholder="Business Name *" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className="w-full p-4 border rounded-lg" />
                <input type="text" placeholder="Tagline (e.g., 'Fresh local produce since 1985')" value={formData.tagline} onChange={e => setFormData({...formData, tagline: e.target.value})} className="w-full p-4 border rounded-lg" maxLength={100} />
                
                <div className="grid grid-cols-2 gap-4">
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-4 border rounded-lg">
                    {CATEGORY_ORDER.map(c => <option key={c}>{c}</option>)}
                    <option value="Other">Other</option>
                  </select>
                  <input type="text" placeholder="Subcategory (optional)" value={formData.subcategory} onChange={e => setFormData({...formData, subcategory: e.target.value})} className="w-full p-4 border rounded-lg" />
                </div>
                
                {formData.category === 'Other' && (
                  <input type="text" placeholder="Custom category *" value={customCategory} onChange={e => setCustomCategory(e.target.value)} required className="w-full p-4 border rounded-lg" />
                )}
                
                <textarea placeholder="Description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={4} className="w-full p-4 border rounded-lg resize-none" />
                <input type="text" placeholder="Services (e.g., 'Catering, Private Dining')" value={formData.services} onChange={e => setFormData({...formData, services: e.target.value})} className="w-full p-4 border rounded-lg" />
                <input type="text" placeholder="Specialties (e.g., 'Gluten-free, Vegan menu')" value={formData.specialties} onChange={e => setFormData({...formData, specialties: e.target.value})} className="w-full p-4 border rounded-lg" />
                <input type="number" placeholder="Established Year (e.g., 1995)" value={formData.established_year} onChange={e => setFormData({...formData, established_year: e.target.value})} min="1800" max={new Date().getFullYear()} className="w-full p-4 border rounded-lg" />
              </div>
            </div>

            {/* SECTION 2: Contact & Location */}
            <div className="bg-white border-2 border-gabriola-green/20 rounded-xl p-6">
              <h4 className="text-xl font-bold text-gabriola-green-dark mb-4">📍 Contact & Location</h4>
              <div className="space-y-4">
                <input type="text" placeholder="Address Line 1 *" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required className="w-full p-4 border rounded-lg" />
                <input type="text" placeholder="Address Line 2 (Suite, Unit)" value={formData.address_line2} onChange={e => setFormData({...formData, address_line2: e.target.value})} className="w-full p-4 border rounded-lg" />
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="Postal Code (V0R 1X0)" value={formData.postal_code} onChange={e => setFormData({...formData, postal_code: e.target.value})} maxLength={7} className="w-full p-4 border rounded-lg" />
                  <input type="url" placeholder="Google Maps URL (optional)" value={formData.map_url} onChange={e => setFormData({...formData, map_url: e.target.value})} className="w-full p-4 border rounded-lg" />
                </div>
                <textarea placeholder="Location Notes (e.g., 'Behind the community hall')" value={formData.location_notes} onChange={e => setFormData({...formData, location_notes: e.target.value})} rows={2} className="w-full p-4 border rounded-lg resize-none" />
                
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium text-gray-700 mb-3">Public Contact</p>
                  <div className="space-y-3">
                    <input type="tel" placeholder="Phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-4 border rounded-lg" />
                    <input type="email" placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-4 border rounded-lg" />
                    <input type="url" placeholder="Website" value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} className="w-full p-4 border rounded-lg" />
                  </div>
                </div>
                
                <div className="pt-4 border-t bg-gray-50 -mx-6 -mb-6 px-6 pb-6 rounded-b-xl">
                  <p className="text-sm font-medium text-gray-700 mb-3">Owner Contact (Private - not shown publicly)</p>
                  <div className="space-y-3">
                    <input type="text" placeholder="Owner Name" value={formData.owner_name} onChange={e => setFormData({...formData, owner_name: e.target.value})} className="w-full p-3 border rounded-lg" />
                    <input type="tel" placeholder="Owner Phone" value={formData.contact_phone} onChange={e => setFormData({...formData, contact_phone: e.target.value})} className="w-full p-3 border rounded-lg" />
                    <input type="email" placeholder="Owner Email" value={formData.contact_email} onChange={e => setFormData({...formData, contact_email: e.target.value})} className="w-full p-3 border rounded-lg" />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: Hours of Operation */}
            <div className="bg-white border-2 border-blue-200 rounded-xl p-6">
              <h4 className="text-xl font-bold text-gray-800 mb-4">🕐 Hours of Operation</h4>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={formData.is_year_round} onChange={e => setFormData({...formData, is_year_round: e.target.checked})} className="w-5 h-5" />
                  <span className="font-medium">Open year-round</span>
                </label>
                
                {!formData.is_year_round && (
                  <textarea placeholder="Seasonal Closure Notes (e.g., 'Closed January-March')" value={formData.seasonal_closure_notes} onChange={e => setFormData({...formData, seasonal_closure_notes: e.target.value})} rows={2} className="w-full p-4 border rounded-lg resize-none" />
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                    <div key={day}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{day}</label>
                      <input type="text" placeholder="9:00 AM - 5:00 PM or 'Closed'" value={formData[`hours_${day.toLowerCase()}` as keyof typeof formData] as string} onChange={e => setFormData({...formData, [`hours_${day.toLowerCase()}`]: e.target.value})} className="w-full p-3 border rounded-lg" />
                    </div>
                  ))}
                </div>
                
                <textarea placeholder="Hours Notes (e.g., 'Extended hours in summer')" value={formData.hours_notes} onChange={e => setFormData({...formData, hours_notes: e.target.value})} rows={2} className="w-full p-4 border rounded-lg resize-none" />
              </div>
            </div>

            {/* SECTION 4: Amenities & Features */}
            <div className="bg-white border-2 border-purple-200 rounded-xl p-6">
              <h4 className="text-xl font-bold text-gray-800 mb-4">✨ Amenities & Features</h4>
              <div className="space-y-5">
                <div>
                  <p className="font-semibold text-gray-800 mb-3">Accessibility & Facilities</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                      <input type="checkbox" checked={formData.wheelchair_accessible} onChange={e => setFormData({...formData, wheelchair_accessible: e.target.checked})} className="w-4 h-4" />
                      <span className="text-sm">♿ Wheelchair Accessible</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                      <input type="checkbox" checked={formData.parking_available} onChange={e => setFormData({...formData, parking_available: e.target.checked})} className="w-4 h-4" />
                      <span className="text-sm">🅿️ Parking</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                      <input type="checkbox" checked={formData.wifi_available} onChange={e => setFormData({...formData, wifi_available: e.target.checked})} className="w-4 h-4" />
                      <span className="text-sm">📶 WiFi</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                      <input type="checkbox" checked={formData.outdoor_seating} onChange={e => setFormData({...formData, outdoor_seating: e.target.checked})} className="w-4 h-4" />
                      <span className="text-sm">🌳 Outdoor Seating</span>
                    </label>
                  </div>
                </div>
                
                <div>
                  <p className="font-semibold text-gray-800 mb-3">Guest Policies</p>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                      <input type="checkbox" checked={formData.pet_friendly} onChange={e => setFormData({...formData, pet_friendly: e.target.checked})} className="w-4 h-4" />
                      <span className="text-sm">🐕 Pet Friendly</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                      <input type="checkbox" checked={formData.family_friendly} onChange={e => setFormData({...formData, family_friendly: e.target.checked})} className="w-4 h-4" />
                      <span className="text-sm">👨‍👩‍👧 Family Friendly</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 5: Payment & Services */}
            <div className="bg-white border-2 border-green-200 rounded-xl p-6">
              <h4 className="text-xl font-bold text-gray-800 mb-4">💳 Payment & Services</h4>
              <div className="space-y-5">
                <div>
                  <p className="font-semibold text-gray-800 mb-3">Payment Methods</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                      <input type="checkbox" checked={formData.accepts_cash} onChange={e => setFormData({...formData, accepts_cash: e.target.checked})} className="w-4 h-4" />
                      <span className="text-sm">💵 Cash</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                      <input type="checkbox" checked={formData.accepts_credit} onChange={e => setFormData({...formData, accepts_credit: e.target.checked})} className="w-4 h-4" />
                      <span className="text-sm">💳 Credit</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                      <input type="checkbox" checked={formData.accepts_debit} onChange={e => setFormData({...formData, accepts_debit: e.target.checked})} className="w-4 h-4" />
                      <span className="text-sm">💳 Debit</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                      <input type="checkbox" checked={formData.accepts_etransfer} onChange={e => setFormData({...formData, accepts_etransfer: e.target.checked})} className="w-4 h-4" />
                      <span className="text-sm">📧 E-Transfer</span>
                    </label>
                  </div>
                </div>
                
                <div>
                  <label className="block font-medium text-gray-800 mb-2">Price Range</label>
                  <select value={formData.price_range} onChange={e => setFormData({...formData, price_range: e.target.value})} className="w-full p-4 border rounded-lg">
                    <option value="">Select range (optional)</option>
                    <option value="$">$ - Budget-friendly</option>
                    <option value="$$">$$ - Moderate</option>
                    <option value="$$$">$$$ - Upscale</option>
                    <option value="$$$$">$$$$ - Luxury</option>
                  </select>
                </div>
                
                <div>
                  <p className="font-semibold text-gray-800 mb-3">Service Options</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                      <input type="checkbox" checked={formData.offers_delivery} onChange={e => setFormData({...formData, offers_delivery: e.target.checked})} className="w-4 h-4" />
                      <span className="text-sm">🚚 Delivery</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                      <input type="checkbox" checked={formData.offers_pickup} onChange={e => setFormData({...formData, offers_pickup: e.target.checked})} className="w-4 h-4" />
                      <span className="text-sm">🛍️ Pickup</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                      <input type="checkbox" checked={formData.offers_shipping} onChange={e => setFormData({...formData, offers_shipping: e.target.checked})} className="w-4 h-4" />
                      <span className="text-sm">📦 Shipping</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                      <input type="checkbox" checked={formData.offers_online_booking} onChange={e => setFormData({...formData, offers_online_booking: e.target.checked})} className="w-4 h-4" />
                      <span className="text-sm">📅 Online Booking</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 6: Business Credentials */}
            <div className="bg-white border-2 border-amber-200 rounded-xl p-6">
              <h4 className="text-xl font-bold text-gray-800 mb-4">🏅 Business Credentials</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                  <input type="checkbox" checked={formData.local_business} onChange={e => setFormData({...formData, local_business: e.target.checked})} className="w-4 h-4" />
                  <span className="text-sm">🏠 Local Business</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                  <input type="checkbox" checked={formData.islander_owned} onChange={e => setFormData({...formData, islander_owned: e.target.checked})} className="w-4 h-4" />
                  <span className="text-sm">🏝️ Islander Owned</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                  <input type="checkbox" checked={formData.chamber_member} onChange={e => setFormData({...formData, chamber_member: e.target.checked})} className="w-4 h-4" />
                  <span className="text-sm">🤝 Chamber Member</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                  <input type="checkbox" checked={formData.licensed} onChange={e => setFormData({...formData, licensed: e.target.checked})} className="w-4 h-4" />
                  <span className="text-sm">📜 Licensed</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                  <input type="checkbox" checked={formData.insured} onChange={e => setFormData({...formData, insured: e.target.checked})} className="w-4 h-4" />
                  <span className="text-sm">🛡️ Insured</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                  <input type="checkbox" checked={formData.organic_certified} onChange={e => setFormData({...formData, organic_certified: e.target.checked})} className="w-4 h-4" />
                  <span className="text-sm">🌱 Organic Certified</span>
                </label>
              </div>
            </div>

            {/* SECTION 7: Social Media & Photos */}
            <div className="bg-white border-2 border-pink-200 rounded-xl p-6">
              <h4 className="text-xl font-bold text-gray-800 mb-4">🌐 Social Media & Photos</h4>
              <div className="space-y-4">
                <input type="url" placeholder="Facebook URL" value={formData.facebook_url} onChange={e => setFormData({...formData, facebook_url: e.target.value})} className="w-full p-4 border rounded-lg" />
                <input type="url" placeholder="Instagram URL" value={formData.instagram_url} onChange={e => setFormData({...formData, instagram_url: e.target.value})} className="w-full p-4 border rounded-lg" />
                <input type="url" placeholder="YouTube/Video URL" value={formData.video_url} onChange={e => setFormData({...formData, video_url: e.target.value})} className="w-full p-4 border rounded-lg" />
                
                <div className="pt-4">
                  <label className="block font-medium text-gray-800 mb-2">Business Photo / Logo</label>
                  <FileUploader onUpload={setFiles} />
                  <p className="text-xs text-gray-500 mt-2">Upload your business logo or main photo</p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button type="submit" className="w-full bg-gabriola-green text-white py-5 rounded-xl font-bold text-lg hover:bg-gabriola-green-dark shadow-lg hover:shadow-xl transition-all">
              Submit Business Listing
            </button>
          </form>
        </div>
      )}

      {/* Listings — TIGHT & CLEAN */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredListings.map(listing => (
            <div
              key={listing.id}
              className="bg-white rounded-2xl shadow hover:shadow-xl transition-all p-6 border border-gray-100 hover:border-gabriola-green/30 cursor-pointer"
              onClick={() => setSelectedBusiness(listing)}
            >
              {listing.image ? (
                <img src={listing.image} alt={listing.name} className="w-full h-40 object-cover rounded-xl mb-4" />
              ) : (
                <div className="bg-gray-100 border-2 border-dashed rounded-xl w-full h-40 mb-4 flex items-center justify-center">
                  <Globe className="w-12 h-12 text-gray-300" />
                </div>
              )}
              <h3 className="font-bold text-lg text-gabriola-green-dark mb-1">{listing.name}</h3>
              <p className="text-sm text-gray-600 mb-3">{listing.category}</p>
              <div className="text-sm text-gray-700 space-y-1">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gabriola-green" />
                  <span className="truncate">{listing.address}</span>
                </div>
                {listing.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gabriola-green" />
                    <a href={`tel:${listing.phone}`} className="hover:underline">{listing.phone}</a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Business Detail Modal */}
      <BusinessDetailModal 
        business={selectedBusiness}
        onClose={() => setSelectedBusiness(null)}
      />
    </div>
  );
}
