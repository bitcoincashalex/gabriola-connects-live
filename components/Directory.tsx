// components/Directory.tsx
// Version: 2.0.0 - With Chamber of Commerce Thank You Banner
// Date: 2024-12-10

'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import FileUploader from './FileUploader';
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

  const [formData, setFormData] = useState({
    name: '',
    category: 'Restaurant',
    address: '',
    phone: '',
    email: '',
    website: '',
    description: '',
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
      name: formData.name.trim(),
      category: finalCategory,
      address: formData.address.trim(),
      phone: formData.phone.trim() || null,
      email: formData.email.trim() || null,
      website: formData.website.trim() || null,
      description: formData.description.trim() || null,
      image: files[0] || null,
    });

    if (!error) {
      alert('Business added! Thank you! 🌟');
      setShowAddForm(false);
      setFormData({ name: '', category: 'Restaurant', address: '', phone: '', email: '', website: '', description: '' });
      setFiles([]);
      setCustomCategory('');
      const { data } = await supabase.from('directory_businesses').select('*');
      if (data) setListings(data);
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
          <form onSubmit={handleSubmit} className="space-y-5">
            <input type="text" placeholder="Business Name *" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className="w-full p-4 border rounded-lg" />
            <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-4 border rounded-lg">
              {CATEGORY_ORDER.map(c => <option key={c}>{c}</option>)}
              <option value="Other">Other</option>
            </select>
            {formData.category === 'Other' && (
              <input type="text" placeholder="Custom category *" value={customCategory} onChange={e => setCustomCategory(e.target.value)} required className="w-full p-4 border rounded-lg" />
            )}
            <input type="text" placeholder="Address *" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required className="w-full p-4 border rounded-lg" />
            <input type="tel" placeholder="Phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-4 border rounded-lg" />
            <input type="email" placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-4 border rounded-lg" />
            <input type="url" placeholder="Website" value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} className="w-full p-4 border rounded-lg" />
            <textarea placeholder="Description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} className="w-full p-4 border rounded-lg resize-none" />
            <FileUploader onUpload={setFiles} />
            <button type="submit" className="w-full bg-gabriola-green text-white py-4 rounded-lg font-bold hover:bg-gabriola-green-dark">
              Submit Business
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
              onClick={() => alert('Details coming soon!')} // replace with modal later
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
    </div>
  );
}
