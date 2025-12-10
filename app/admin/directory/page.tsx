// Path: app/admin/directory/page.tsx
// Version: 1.0.0 - Directory Admin Dashboard
// Date: 2024-12-10

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { Building2, CheckCircle, XCircle, Edit, Trash2, Loader2, Shield } from 'lucide-react';
import Link from 'next/link';

interface Business {
  id: string;
  name: string;
  category: string;
  address: string;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
  image?: string;
  created_at: string;
}

export default function DirectoryAdminPage() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    if (!authLoading) {
      // Directory Admin OR Super Admin only
      const isDirectoryAdmin = (user as any)?.admin_directory;
      const isSuperAdmin = user?.is_super_admin;
      
      if (!isDirectoryAdmin && !isSuperAdmin) {
        router.push('/');
        alert('Access denied: Directory Admin only');
      } else {
        fetchBusinesses();
      }
    }
  }, [user, authLoading, router]);

  const fetchBusinesses = async () => {
    const { data, error } = await supabase
      .from('directory_businesses')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setBusinesses(data as Business[]);
    }
    setLoading(false);
  };

  const deleteBusiness = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;

    const { error } = await supabase
      .from('directory_businesses')
      .delete()
      .eq('id', id);

    if (!error) {
      alert('Business deleted!');
      await fetchBusinesses();
    } else {
      alert('Error deleting business: ' + error.message);
    }
  };

  const categories = ['All', 'Community', 'Arts', 'Restaurant', 'Accommodation', 'Recreation', 'Health', 
    'Pet Services', 'Shopping', 'Grocery', 'Agriculture', 'Marine', 'Construction', 
    'Home Services', 'Professional Services', 'Utilities', 'Services', 'Other'];

  const filteredBusinesses = businesses.filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(search.toLowerCase()) ||
                         b.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || b.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-gabriola-green animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gabriola-green flex items-center gap-3">
            <Building2 className="w-10 h-10" />
            Directory Management
          </h1>
          <p className="text-gray-600 mt-2">
            Manage business listings and Chamber of Commerce directory
          </p>
        </div>
        <Link
          href="/directory/business"
          className="text-blue-600 hover:underline"
        >
          ← Back to Directory
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <Building2 className="w-8 h-8 text-gabriola-green" />
            <span className="text-3xl font-bold text-gray-900">{businesses.length}</span>
          </div>
          <p className="text-gray-600 font-medium">Total Businesses</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <span className="text-3xl font-bold text-gray-900">
              {new Set(businesses.map(b => b.category)).size}
            </span>
          </div>
          <p className="text-gray-600 font-medium">Categories</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <Building2 className="w-8 h-8 text-blue-600" />
            <span className="text-3xl font-bold text-gray-900">
              {businesses.filter(b => {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return new Date(b.created_at) > weekAgo;
              }).length}
            </span>
          </div>
          <p className="text-gray-600 font-medium">Added This Week</p>
        </div>
      </div>

      {/* Chamber of Commerce Info */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-gabriola-green rounded-lg p-6 mb-8">
        <div className="flex items-start gap-4">
          <Shield className="w-8 h-8 text-gabriola-green flex-shrink-0 mt-1" />
          <div>
            <h2 className="text-xl font-bold text-gabriola-green mb-2">
              Chamber of Commerce Integration
            </h2>
            <p className="text-gray-700 mb-4">
              This directory is maintained in partnership with the Gabriola Chamber of Commerce. 
              You can import data from their directory or manage listings manually.
            </p>
            <div className="flex gap-3">
              <a
                href="https://business.gabriolachamber.ca/directory"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-gabriola-green text-white rounded-lg hover:bg-gabriola-green-dark font-medium"
              >
                View Chamber Directory →
              </a>
              <button
                onClick={() => alert('API import feature coming soon!')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Import From Chamber
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Search businesses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:outline-none"
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:outline-none"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Business List */}
      <div className="space-y-4">
        {filteredBusinesses.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl text-gray-600">No businesses found</p>
          </div>
        ) : (
          filteredBusinesses.map(business => (
            <div key={business.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-start gap-4">
                    {business.image && (
                      <img 
                        src={business.image} 
                        alt={business.name}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">{business.name}</h3>
                      <div className="space-y-1 text-gray-700">
                        <p><strong>Category:</strong> {business.category}</p>
                        <p><strong>Address:</strong> {business.address}</p>
                        {business.phone && <p><strong>Phone:</strong> {business.phone}</p>}
                        {business.email && <p><strong>Email:</strong> {business.email}</p>}
                        {business.website && (
                          <p>
                            <strong>Website:</strong>{' '}
                            <a 
                              href={business.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {business.website}
                            </a>
                          </p>
                        )}
                        {business.description && (
                          <p className="mt-2 text-gray-600">{business.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="ml-4 flex flex-col gap-2">
                  <button
                    onClick={() => alert('Edit feature coming soon!')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 whitespace-nowrap"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => deleteBusiness(business.id, business.name)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 whitespace-nowrap"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Help Section */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-blue-900 mb-4">💡 Directory Management Tips</h2>
        <ul className="space-y-2 text-blue-800">
          <li>• <strong>Chamber Partnership:</strong> Work with Chamber to keep listings up-to-date</li>
          <li>• <strong>Verify Info:</strong> Contact businesses to confirm details before posting</li>
          <li>• <strong>Categories:</strong> Use standard categories for consistency</li>
          <li>• <strong>Images:</strong> Encourage businesses to upload professional photos</li>
          <li>• <strong>Coming Soon:</strong> API import from Chamber directory</li>
        </ul>
      </div>
    </div>
  );
}
