// components/Directory.tsx
// Version: 5.1.0 - New businesses get a pin on the Island Map from their street address (exact
//                  matches only), with a "Show on the Island Map" choice in the Add form
// Previous: 5.0.2 - On computers the category rows wrap onto more lines instead of being cut off
// Earlier: 5.0.1 - Add Your Business note: "Your business will appear in the directory right away."
//                  (dropped "For demo purposes")
// Earlier: 5.0.0 - Directory redesign for phones: slim Chamber thank-you strip (was the whole first
//                  screen); categories as a sideways row of main groups with sub-categories opening
//                  underneath (choosing a main group also shows its sub-categories' businesses);
//                  compact rows grouped by category with name, category, address and a call button
//                  (the empty grey picture boxes are gone; a photo shows only if there is one).
// Earlier: 4.6.0 - Categories now sorted alphabetically in dropdown (overrides display_order)
// Date: 2026-10-10

'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import FileUploader from './FileUploader';
import ImageUploadManager from './ImageUploadManager';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { MapPin, Phone, Mail, Globe, Plus, X, Search, ChevronRight, ChevronDown } from 'lucide-react';
import { geocodeGabriola } from '@/lib/geocode';

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

interface BusinessCategory {
  id: string;
  name: string;
  parent_id: string | null;
  display_order: number;
}

export default function Directory() {
  const { user } = useUser();
  const [listings, setListings] = useState<DirectoryListing[]>([]);
  const [loading, setLoading] = useState(true);
  
  // NEW - Dynamic category loading from database
  const [mainCategories, setMainCategories] = useState<BusinessCategory[]>([]);
  const [subcategories, setSubcategories] = useState<BusinessCategory[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [openMain, setOpenMain] = useState<string | null>(null); // main group whose sub-categories show
  const [customCategory, setCustomCategory] = useState('');
  const [files, setFiles] = useState<string[]>([]);
  const [businessImages, setBusinessImages] = useState<Array<{id: string; url: string; file?: File}>>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<DirectoryListing | null>(null);

  const [formData, setFormData] = useState({
    // Existing basic fields
    name: '',
    category: 'Restaurant',
    address: '',
    show_on_map: true,
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
    
    const fetchCategories = async () => {
      // Fetch main categories (parent_id IS NULL)
      const { data: mains } = await supabase
        .from('business_categories')
        .select('*')
        .is('parent_id', null)
        .eq('is_active', true)
        .order('display_order');
      
      // Fetch all subcategories
      const { data: subs } = await supabase
        .from('business_categories')
        .select('*')
        .not('parent_id', 'is', null)
        .eq('is_active', true)
        .order('display_order');
      
      setMainCategories(mains || []);
      setSubcategories(subs || []);
    };
    
    fetchListings();
    fetchCategories();
  }, []);

  // Build category list dynamically for display
  const allCategoryNames = useMemo(() => {
    const names = ['All'];
    // Sort main categories alphabetically
    const sortedMainCategories = [...mainCategories].sort((a, b) => a.name.localeCompare(b.name));
    
    sortedMainCategories.forEach(main => {
      names.push(main.name);
      // Add subcategories under this main category (also sorted alphabetically)
      subcategories
        .filter(sub => sub.parent_id === main.id)
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach(sub => names.push(sub.name));
    });
    names.push('Other');
    return names;
  }, [mainCategories, subcategories]);

  const filteredListings = useMemo(() => {
    return listings
      .filter(l =>
        searchQuery === '' ||
        l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .filter(l => {
        if (selectedCategory === 'All') return true;
        if (l.category === selectedCategory) return true;
        // A main group also includes its sub-categories
        const main = mainCategories.find(m => m.name === selectedCategory);
        return !!main && subcategories.some(sub => sub.parent_id === main.id && sub.name === l.category);
      })
      .sort((a, b) => {
        // Sort by category alphabetically, then by name
        if (a.category !== b.category) {
          return a.category.localeCompare(b.category);
        }
        return a.name.localeCompare(b.name);
      });
  }, [listings, searchQuery, selectedCategory, mainCategories, subcategories]);

  // Only offer categories that have businesses (a main group counts its sub-categories)
  const usedCategories = useMemo(() => new Set(listings.map(l => l.category)), [listings]);
  const mainsWithBusinesses = useMemo(() => {
    return [...mainCategories]
      .filter(m => usedCategories.has(m.name) || subcategories.some(sub => sub.parent_id === m.id && usedCategories.has(sub.name)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [mainCategories, subcategories, usedCategories]);
  const subsOf = (mainId: string) =>
    subcategories.filter(sub => sub.parent_id === mainId && usedCategories.has(sub.name)).sort((a, b) => a.name.localeCompare(b.name));
  const openMainCat = mainCategories.find(m => m.name === openMain);
  const openSubs = openMainCat ? subsOf(openMainCat.id) : [];
  const knownNames = useMemo(() => new Set([...mainCategories, ...subcategories].map(c => c.name)), [mainCategories, subcategories]);
  const hasOther = listings.some(l => l.category === 'Other' || (knownNames.size > 0 && !knownNames.has(l.category)));

  const chooseMain = (name: string) => {
    setSelectedCategory(name);
    const main = mainCategories.find(m => m.name === name);
    setOpenMain(main && subsOf(main.id).length > 0 ? name : null);
  };

  // Group the shown businesses under category headings
  const groupedListings = useMemo(() => {
    const groups: { category: string; items: DirectoryListing[] }[] = [];
    for (const l of filteredListings) {
      const last = groups[groups.length - 1];
      if (last && last.category === l.category) last.items.push(l);
      else groups.push({ category: l.category, items: [l] });
    }
    return groups;
  }, [filteredListings]);

  const chip = (selected: boolean) =>
    `flex-shrink-0 flex items-center gap-1 px-4 min-h-[40px] rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
      selected ? 'bg-gabriola-green text-white' : 'bg-white border border-[#CFC6B4] text-[#1F2A24] hover:border-gabriola-green'
    }`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = formData.category === 'Other' ? customCategory.trim() : formData.category;
    if (!formData.name.trim() || !finalCategory || !formData.address.trim()) {
      alert('Please fill in Business Name, Category, and Address');
      return;
    }

    // Upload business images to Supabase Storage
    const uploadedImageUrls: string[] = [];
    for (const imageData of businessImages) {
      if (imageData.file) {
        const fileExt = imageData.file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `business-images/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('bbs-images')
          .upload(filePath, imageData.file);

        if (!uploadError) {
          const { data } = supabase.storage
            .from('bbs-images')
            .getPublicUrl(filePath);
          uploadedImageUrls.push(data.publicUrl);
        }
      }
    }

    // Island Map: pin it only when the address matches an exact civic number on Gabriola
    const spot = formData.show_on_map ? await geocodeGabriola(formData.address) : null;

    const { error } = await supabase.from('directory_businesses').insert({
      // Island Map
      show_on_map: formData.show_on_map,
      lat: spot?.exact ? spot.lat : null,
      lng: spot?.exact ? spot.lng : null,

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
      gallery_images: uploadedImageUrls.length > 0 ? uploadedImageUrls : null,
    });

    if (!error) {
      alert('Business added! Thank you! 🌟');
      setShowAddForm(false);
      // Reset form to defaults
      setFormData({
        name: '', category: 'Restaurant', address: '', show_on_map: true, phone: '', email: '', website: '', description: '',
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
      setBusinessImages([]);
      setCustomCategory('');
      const { data } = await supabase.from('directory_businesses').select('*');
      if (data) setListings(data);
    } else {
      alert('Error adding business: ' + error.message);
    }
  };

  if (loading) return <div className="text-center py-32 text-2xl">Loading 53+ businesses...</div>;

  return (
    <div className="min-h-screen bg-[#F6F2EA] text-[#1F2A24]">
      {/* Chamber of Commerce thank-you strip */}
      <div className="bg-[#E6EFE8] border-b border-[#D3E2D7]">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <p className="text-sm text-gabriola-green-dark">
            <strong>Thank You Gabriola Chamber of Commerce!</strong>{' '}
            <span className="text-[#3A4640]">Supporting local businesses and our island community</span>
          </p>
          <a
            href="https://business.gabriolachamber.ca/directory"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-gabriola-green underline hover:text-gabriola-green-dark whitespace-nowrap min-h-[32px] flex items-center"
          >
            Visit Chamber Directory →
          </a>
        </div>
      </div>

      {/* Title, search, categories */}
      <div className="bg-white border-b border-[#E3DCCF]">
        <div className="max-w-5xl mx-auto px-4 pt-4 pb-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h1 className="font-display text-[26px] md:text-3xl font-bold text-gabriola-green-dark leading-tight">Island Directory</h1>
            {user && (
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex-shrink-0 bg-gabriola-green text-white px-4 min-h-[44px] rounded-lg font-semibold hover:bg-gabriola-green-dark flex items-center gap-2"
              >
                {showAddForm ? <X className="w-5 h-5" aria-hidden="true" /> : <Plus className="w-5 h-5" aria-hidden="true" />}
                {showAddForm ? 'Cancel' : 'Add Your Business'}
              </button>
            )}
          </div>

          <label className="relative block">
            <span className="sr-only">Search businesses</span>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#5B6660]" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search businesses..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full min-h-[44px] pl-10 pr-4 text-[15px] border border-[#CFC6B4] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gabriola-green/30 focus:border-gabriola-green"
            />
          </label>

          {/* Main groups: one row that scrolls sideways */}
          <div className="-mx-4 px-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:px-0 md:flex-wrap md:overflow-visible" aria-label="Categories">
            <button onClick={() => { setSelectedCategory('All'); setOpenMain(null); }} className={chip(selectedCategory === 'All')}>
              All
            </button>
            {mainsWithBusinesses.map(main => {
              const subs = subsOf(main.id);
              const selected = selectedCategory === main.name || subs.some(sub => sub.name === selectedCategory);
              return (
                <button
                  key={main.id}
                  onClick={() => chooseMain(main.name)}
                  aria-expanded={subs.length > 0 ? openMain === main.name : undefined}
                  className={chip(selected)}
                >
                  {main.name}
                  {subs.length > 0 && (openMain === main.name ? <ChevronDown className="w-4 h-4" aria-hidden="true" /> : <ChevronRight className="w-4 h-4" aria-hidden="true" />)}
                </button>
              );
            })}
            {hasOther && (
              <button onClick={() => { setSelectedCategory('Other'); setOpenMain(null); }} className={chip(selectedCategory === 'Other')}>
                Other
              </button>
            )}
          </div>

          {/* Sub-categories of the open group */}
          {openSubs.length > 0 && (
            <div className="-mx-4 px-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:px-0 md:flex-wrap md:overflow-visible">
              <button onClick={() => setSelectedCategory(openMain!)} className={chip(selectedCategory === openMain)}>
                All {openMain}
              </button>
              {openSubs.map(sub => (
                <button key={sub.id} onClick={() => setSelectedCategory(sub.name)} className={chip(selectedCategory === sub.name)}>
                  {sub.name}
                </button>
              ))}
            </div>
          )}
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
                  <select 
                    value={formData.category} 
                    onChange={e => setFormData({...formData, category: e.target.value})} 
                    className="w-full p-4 border rounded-lg"
                    required
                  >
                    <option value="">Select Main Category *</option>
                    {mainCategories.map(main => (
                      <optgroup key={main.id} label={main.name}>
                        <option value={main.name}>{main.name}</option>
                        {subcategories
                          .filter(sub => sub.parent_id === main.id)
                          .map(sub => (
                            <option key={sub.id} value={sub.name}>
                              &nbsp;&nbsp;{sub.name}
                            </option>
                          ))
                        }
                      </optgroup>
                    ))}
                    <option value="Other">Other</option>
                  </select>
                  <input 
                    type="text" 
                    placeholder="Subcategory (optional)" 
                    value={formData.subcategory} 
                    onChange={e => setFormData({...formData, subcategory: e.target.value})} 
                    className="w-full p-4 border rounded-lg" 
                  />
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
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" className="mt-1" checked={formData.show_on_map} onChange={e => setFormData({...formData, show_on_map: e.target.checked})} />
                  <span>Show on the Island Map (a pin at this address). Untick this if it's your home and you'd rather not have a pin.</span>
                </label>
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

            {/* SECTION 7: Photos & Documents */}
            <div className="bg-white border-2 border-pink-200 rounded-xl p-6">
              <h4 className="text-xl font-bold text-gray-800 mb-4">📸 Photos & Documents</h4>
              <div className="space-y-6">
                {/* Business Images (Multiple) */}
                <div>
                  <label className="block font-medium text-gray-800 mb-2">Business Photos (Optional)</label>
                  <ImageUploadManager
                    images={businessImages}
                    onImagesChange={setBusinessImages}
                    maxImages={10}
                    showCaptions={false}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Add photos of your business, products, interior, exterior, etc. Max 10 images, 10MB each.
                  </p>
                </div>

                {/* Documents (PDFs, Menus, etc.) */}
                <div>
                  <label className="block font-medium text-gray-800 mb-2">Documents (Optional)</label>
                  <FileUploader onUpload={setFiles} />
                  <p className="text-xs text-gray-500 mt-2">
                    Upload menus, brochures, price lists, certificates (PDF, DOCX, images). Max 10MB per file.
                  </p>
                </div>

                {/* Social Media */}
                <div className="pt-4 border-t">
                  <label className="block font-medium text-gray-800 mb-4">Social Media Links (Optional)</label>
                  <div className="space-y-3">
                    <input 
                      type="url" 
                      placeholder="Facebook URL" 
                      value={formData.facebook_url} 
                      onChange={e => setFormData({...formData, facebook_url: e.target.value})} 
                      className="w-full p-4 border rounded-lg" 
                    />
                    <input 
                      type="url" 
                      placeholder="Instagram URL" 
                      value={formData.instagram_url} 
                      onChange={e => setFormData({...formData, instagram_url: e.target.value})} 
                      className="w-full p-4 border rounded-lg" 
                    />
                    <input 
                      type="url" 
                      placeholder="YouTube/Video URL" 
                      value={formData.video_url} 
                      onChange={e => setFormData({...formData, video_url: e.target.value})} 
                      className="w-full p-4 border rounded-lg" 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Note */}
            <div className="bg-[#E6EFE8] rounded-lg p-4">
              <p className="text-sm text-gabriola-green-dark">
                Your business will appear in the directory right away.
              </p>
            </div>

            {/* Submit Button */}
            <button type="submit" className="w-full bg-gabriola-green text-white py-5 rounded-xl font-bold text-lg hover:bg-gabriola-green-dark shadow-lg hover:shadow-xl transition-all">
              Submit Business Listing
            </button>
          </form>
        </div>
      )}

      {/* Listings: compact rows under category headings */}
      <div className="max-w-5xl mx-auto px-4 pb-8">
        {loading ? (
          <div className="py-16 text-center text-[#5B6660]" role="status">Loading businesses...</div>
        ) : filteredListings.length === 0 ? (
          <p className="py-16 text-center text-[#5B6660]">No businesses match.</p>
        ) : (
          <>
            <p className="text-[13px] text-[#5B6660] mt-4">
              {filteredListings.length} {filteredListings.length === 1 ? 'business' : 'businesses'}
            </p>
            {groupedListings.map(group => (
              <section key={group.category} className="mt-4">
                <h2 className="text-sm font-bold uppercase tracking-wide text-gabriola-green-dark mb-2">{group.category}</h2>
                <div className="bg-white border border-[#E3DCCF] rounded-2xl divide-y divide-[#EEE8DD] overflow-hidden">
                  {group.items.map(listing => (
                    <div key={listing.id} className="flex items-stretch">
                      <button
                        onClick={() => setSelectedBusiness(listing)}
                        className="flex-1 min-w-0 text-left flex items-center gap-3 px-4 py-3 min-h-[60px] hover:bg-[#F6F2EA] transition-colors"
                      >
                        {listing.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={listing.image} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                        )}
                        <span className="min-w-0">
                          <span className="block text-[15px] font-semibold text-[#1F2A24] leading-snug">{listing.name}</span>
                          {listing.address && (
                            <span className="flex items-center gap-1 text-[13px] text-[#5B6660]">
                              <MapPin className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                              <span className="truncate">{listing.address}</span>
                            </span>
                          )}
                        </span>
                      </button>
                      {listing.phone && (
                        <a
                          href={`tel:${listing.phone}`}
                          aria-label={`Call ${listing.name} at ${listing.phone}`}
                          title={listing.phone}
                          className="flex-shrink-0 w-14 flex items-center justify-center text-gabriola-green hover:bg-[#E6EFE8] border-l border-[#EEE8DD]"
                        >
                          <Phone className="w-5 h-5" aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </div>

      {/* Business Detail Modal */}
      <BusinessDetailModal 
        business={selectedBusiness}
        onClose={() => setSelectedBusiness(null)}
      />
    </div>
  );
}
