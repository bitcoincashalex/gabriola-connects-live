// Path: app/admin/directory/page.tsx
// Version: 4.0.0-UPLOAD - IMAGE UPLOAD from computer with Supabase Storage
// Date: 2025-01-13

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
  subcategory?: string;
  tagline?: string;
  address: string;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
  
  // IMAGES - Critical for demo!
  image?: string;
  logo_url?: string;
  cover_image_url?: string;
  
  // Contact
  facebook_url?: string;
  instagram_url?: string;
  
  // Hours
  hours_monday?: string;
  hours_tuesday?: string;
  hours_wednesday?: string;
  hours_thursday?: string;
  hours_friday?: string;
  hours_saturday?: string;
  hours_sunday?: string;
  
  // Key Amenities
  wheelchair_accessible?: boolean;
  parking_available?: boolean;
  wifi_available?: boolean;
  pet_friendly?: boolean;
  family_friendly?: boolean;
  
  // Services
  offers_delivery?: boolean;
  offers_pickup?: boolean;
  
  // Payment
  accepts_cash?: boolean;
  accepts_credit?: boolean;
  accepts_debit?: boolean;
  
  // Community
  islander_owned?: boolean;
  chamber_member?: boolean;
  
  created_at: string;
  [key: string]: any;
}

interface BusinessCategory {
  id: string;
  name: string;
  parent_id: string | null;
  display_order: number;
  is_active: boolean;
}

export default function DirectoryAdminPage() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Edit Modal State
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Image Upload State
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  
  // Category Management State
  const [categories, setCategories] = useState<BusinessCategory[]>([]);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BusinessCategory | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryParent, setNewCategoryParent] = useState<string | null>(null);

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
        fetchCategories();
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

  const updateBusiness = async () => {
    if (!editingBusiness) return;

    const { error } = await supabase
      .from('directory_businesses')
      .update({
        // Basic Info
        name: editingBusiness.name,
        category: editingBusiness.category,
        subcategory: editingBusiness.subcategory,
        tagline: editingBusiness.tagline,
        address: editingBusiness.address,
        phone: editingBusiness.phone,
        email: editingBusiness.email,
        website: editingBusiness.website,
        description: editingBusiness.description,
        
        // IMAGES - Critical!
        image: editingBusiness.image,
        logo_url: editingBusiness.logo_url,
        cover_image_url: editingBusiness.cover_image_url,
        
        // Social
        facebook_url: editingBusiness.facebook_url,
        instagram_url: editingBusiness.instagram_url,
        
        // Hours
        hours_monday: editingBusiness.hours_monday,
        hours_tuesday: editingBusiness.hours_tuesday,
        hours_wednesday: editingBusiness.hours_wednesday,
        hours_thursday: editingBusiness.hours_thursday,
        hours_friday: editingBusiness.hours_friday,
        hours_saturday: editingBusiness.hours_saturday,
        hours_sunday: editingBusiness.hours_sunday,
        
        // Amenities
        wheelchair_accessible: editingBusiness.wheelchair_accessible,
        parking_available: editingBusiness.parking_available,
        wifi_available: editingBusiness.wifi_available,
        pet_friendly: editingBusiness.pet_friendly,
        family_friendly: editingBusiness.family_friendly,
        
        // Services
        offers_delivery: editingBusiness.offers_delivery,
        offers_pickup: editingBusiness.offers_pickup,
        
        // Payment
        accepts_cash: editingBusiness.accepts_cash,
        accepts_credit: editingBusiness.accepts_credit,
        accepts_debit: editingBusiness.accepts_debit,
        
        // Community
        islander_owned: editingBusiness.islander_owned,
        chamber_member: editingBusiness.chamber_member,
      })
      .eq('id', editingBusiness.id);

    if (!error) {
      alert('Business updated successfully!');
      setShowEditModal(false);
      setEditingBusiness(null);
      await fetchBusinesses();
    } else {
      alert('Error updating business: ' + error.message);
    }
  };

  const uploadImage = async (file: File, type: 'image' | 'logo' | 'cover') => {
    if (!editingBusiness) return;

    // Set loading state
    if (type === 'image') setUploadingImage(true);
    if (type === 'logo') setUploadingLogo(true);
    if (type === 'cover') setUploadingCover(true);

    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${editingBusiness.id}-${type}-${Date.now()}.${fileExt}`;
      const filePath = `business-images/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('directory')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        alert('Error uploading image: ' + uploadError.message);
        return;
      }

      // Get public URL
      const { data } = supabase.storage
        .from('directory')
        .getPublicUrl(filePath);

      const publicUrl = data.publicUrl;

      // Update business with new image URL
      const fieldName = type === 'image' ? 'image' : type === 'logo' ? 'logo_url' : 'cover_image_url';
      
      setEditingBusiness({
        ...editingBusiness,
        [fieldName]: publicUrl
      });

      alert('Image uploaded successfully!');
    } catch (err) {
      console.error('Upload error:', err);
      alert('Error uploading image');
    } finally {
      setUploadingImage(false);
      setUploadingLogo(false);
      setUploadingCover(false);
    }
  };

  const openEditModal = (business: Business) => {
    setEditingBusiness({...business});
    setShowEditModal(true);
  };

  const fetchCategories = async () => {
    console.log('📡 Fetching categories...');
    
    // Force fresh data by adding timestamp (bypasses Supabase cache)
    const { data, error } = await supabase
      .from('business_categories')
      .select('*')
      .order('display_order')
      .limit(1000); // Add limit to force query execution
    
    if (error) {
      console.error('❌ Error fetching categories:', error);
      return;
    }
    
    if (data) {
      console.log('✅ Fetched', data.length, 'categories');
      // Use functional update to ensure React detects change
      setCategories([...data] as BusinessCategory[]);
    }
  };

  const addCategory = async () => {
    if (!newCategoryName.trim()) {
      alert('Please enter a category name');
      return;
    }

    // Get max display_order for parent level
    const siblings = newCategoryParent
      ? categories.filter(c => c.parent_id === newCategoryParent)
      : categories.filter(c => c.parent_id === null);
    
    const maxOrder = siblings.length > 0 
      ? Math.max(...siblings.map(c => c.display_order))
      : 0;

    const { error } = await supabase
      .from('business_categories')
      .insert({
        name: newCategoryName.trim(),
        parent_id: newCategoryParent,
        display_order: maxOrder + 1,
        is_active: true,
      });

    if (!error) {
      alert('Category added!');
      setNewCategoryName('');
      setNewCategoryParent(null);
      await fetchCategories();
    } else {
      alert('Error adding category: ' + error.message);
    }
  };

  const updateCategory = async (id: string, updates: Partial<BusinessCategory>) => {
    const { error } = await supabase
      .from('business_categories')
      .update(updates)
      .eq('id', id);

    if (!error) {
      alert('Category updated!');
      setEditingCategory(null);
      await fetchCategories();
    } else {
      alert('Error updating category: ' + error.message);
    }
  };

  const deleteCategory = async (id: string, name: string) => {
    // Check if any businesses use this category
    const businessesUsingCategory = businesses.filter(b => b.category === name);
    
    if (businessesUsingCategory.length > 0) {
      const confirmed = confirm(
        `Warning: ${businessesUsingCategory.length} businesses use "${name}".\n\n` +
        `Deleting this category will NOT delete the businesses, but they may appear uncategorized.\n\n` +
        `Continue?`
      );
      if (!confirmed) return;
    }

    if (!confirm(`Delete category "${name}"? This cannot be undone.`)) return;

    const { error } = await supabase
      .from('business_categories')
      .delete()
      .eq('id', id);

    if (!error) {
      alert('Category deleted!');
      await fetchCategories();
    } else {
      alert('Error deleting category: ' + error.message);
    }
  };

  const moveCategory = async (id: string, direction: 'up' | 'down') => {
    console.log('🔄 moveCategory called:', { id, direction });
    
    const category = categories.find(c => c.id === id);
    if (!category) {
      console.error('❌ Category not found:', id);
      return;
    }
    console.log('✅ Found category:', category.name, 'display_order:', category.display_order);

    // Get siblings (same parent level)
    const siblings = categories
      .filter(c => c.parent_id === category.parent_id)
      .sort((a, b) => a.display_order - b.display_order);
    
    console.log('👥 Siblings at this level:', siblings.map(s => ({ name: s.name, order: s.display_order })));

    const currentIndex = siblings.findIndex(c => c.id === id);
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    console.log('📍 Current index:', currentIndex, 'Swap index:', swapIndex);

    if (swapIndex < 0 || swapIndex >= siblings.length) {
      console.warn('⚠️ Cannot move - already at boundary');
      return;
    }

    const swapCategory = siblings[swapIndex];
    console.log('🔀 Swapping with:', swapCategory.name, 'display_order:', swapCategory.display_order);

    // Store display_order values BEFORE updating
    const categoryOrder = category.display_order;
    const swapCategoryOrder = swapCategory.display_order;
    
    console.log('📊 Values to swap:', { 
      category: category.name, 
      currentOrder: categoryOrder, 
      willBecome: swapCategoryOrder,
      swapWith: swapCategory.name,
      swapCurrentOrder: swapCategoryOrder,
      swapWillBecome: categoryOrder
    });

    try {
      // Update first category
      console.log('🔄 Updating', category.name, 'from', categoryOrder, 'to', swapCategoryOrder);
      const { data: data1, error: error1 } = await supabase
        .from('business_categories')
        .update({ display_order: swapCategoryOrder })
        .eq('id', category.id)
        .select();

      if (error1) {
        console.error('❌ Error updating first category:', error1);
        throw error1;
      }
      console.log('✅ First update successful:', data1);

      // Update second category
      console.log('🔄 Updating', swapCategory.name, 'from', swapCategoryOrder, 'to', categoryOrder);
      const { data: data2, error: error2 } = await supabase
        .from('business_categories')
        .update({ display_order: categoryOrder })
        .eq('id', swapCategory.id)
        .select();

      if (error2) {
        console.error('❌ Error updating second category:', error2);
        throw error2;
      }
      console.log('✅ Second update successful:', data2);

      // Wait for database to commit changes
      console.log('⏳ Waiting for database commit...');
      await new Promise(resolve => setTimeout(resolve, 100));

      // Refresh categories to show new order
      console.log('🔄 Refreshing categories...');
      await fetchCategories();
      console.log('✅ Categories refreshed');
      
    } catch (error) {
      console.error('❌ MOVE CATEGORY FAILED:', error);
      alert('Failed to move category. Check console for details.');
    }
  };

  // Build dynamic category list for filter dropdown
  const categoryFilterOptions = ['All', ...Array.from(new Set(categories.map(c => c.name))), 'Other'];

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

      {/* Category Manager */}
      <div className="bg-white rounded-lg shadow mb-6">
        <button
          onClick={() => setShowCategoryManager(!showCategoryManager)}
          className="w-full p-6 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Edit className="w-6 h-6 text-gabriola-green" />
            <div>
              <h2 className="text-2xl font-bold text-gabriola-green">Manage Categories</h2>
              <p className="text-gray-600 text-sm">
                {categories.filter(c => c.parent_id === null).length} main categories, {' '}
                {categories.filter(c => c.parent_id !== null).length} subcategories
              </p>
            </div>
          </div>
          <div className="text-gray-400">
            {showCategoryManager ? '▼' : '▶'}
          </div>
        </button>

        {showCategoryManager && (
          <div className="p-6 pt-0 border-t">
            {/* Add New Category */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <h3 className="font-bold text-green-900 mb-3">➕ Add New Category</h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Category name..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
                />
                <select
                  value={newCategoryParent || ''}
                  onChange={(e) => setNewCategoryParent(e.target.value || null)}
                  className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
                >
                  <option value="">Main Category</option>
                  {categories.filter(c => c.parent_id === null).map(cat => (
                    <option key={cat.id} value={cat.id}>Subcategory of {cat.name}</option>
                  ))}
                </select>
                <button
                  onClick={addCategory}
                  className="px-6 py-2 bg-gabriola-green text-white rounded-lg hover:bg-gabriola-green-dark font-medium"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Category List */}
            <div className="space-y-4">
              {categories
                .filter(c => c.parent_id === null)
                .sort((a, b) => a.display_order - b.display_order)
                .map(mainCat => (
                  <div key={mainCat.id} className="border rounded-lg p-4 bg-gray-50">
                    {/* Main Category */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3 flex-1">
                        {editingCategory?.id === mainCat.id ? (
                          <input
                            type="text"
                            value={editingCategory.name}
                            onChange={(e) => setEditingCategory({...editingCategory, name: e.target.value})}
                            className="flex-1 px-3 py-1 border rounded"
                            autoFocus
                          />
                        ) : (
                          <span className="font-bold text-lg text-gray-900">{mainCat.name}</span>
                        )}
                        {!mainCat.is_active && (
                          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Disabled</span>
                        )}
                        <span className="text-xs text-gray-500">
                          ({businesses.filter(b => b.category === mainCat.name).length} businesses)
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Move Up/Down */}
                        <button
                          onClick={() => moveCategory(mainCat.id, 'up')}
                          className="p-1 text-gray-600 hover:bg-gray-200 rounded"
                          title="Move Up"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => moveCategory(mainCat.id, 'down')}
                          className="p-1 text-gray-600 hover:bg-gray-200 rounded"
                          title="Move Down"
                        >
                          ▼
                        </button>

                        {/* Edit/Save */}
                        {editingCategory?.id === mainCat.id ? (
                          <button
                            onClick={() => updateCategory(mainCat.id, { name: editingCategory.name })}
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                          >
                            Save
                          </button>
                        ) : (
                          <button
                            onClick={() => setEditingCategory(mainCat)}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                          >
                            Edit
                          </button>
                        )}

                        {/* Enable/Disable */}
                        <button
                          onClick={() => updateCategory(mainCat.id, { is_active: !mainCat.is_active })}
                          className={`px-3 py-1 rounded text-sm ${
                            mainCat.is_active 
                              ? 'bg-yellow-600 text-white' 
                              : 'bg-green-600 text-white'
                          }`}
                        >
                          {mainCat.is_active ? 'Disable' : 'Enable'}
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => deleteCategory(mainCat.id, mainCat.name)}
                          className="px-3 py-1 bg-red-600 text-white rounded text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Subcategories */}
                    {categories
                      .filter(c => c.parent_id === mainCat.id)
                      .sort((a, b) => a.display_order - b.display_order)
                      .map(subCat => (
                        <div key={subCat.id} className="flex items-center justify-between ml-8 mt-2 p-2 bg-white rounded border">
                          <div className="flex items-center gap-3 flex-1">
                            {editingCategory?.id === subCat.id ? (
                              <input
                                type="text"
                                value={editingCategory.name}
                                onChange={(e) => setEditingCategory({...editingCategory, name: e.target.value})}
                                className="flex-1 px-2 py-1 border rounded text-sm"
                                autoFocus
                              />
                            ) : (
                              <span className="text-gray-700">↳ {subCat.name}</span>
                            )}
                            {!subCat.is_active && (
                              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Disabled</span>
                            )}
                            <span className="text-xs text-gray-500">
                              ({businesses.filter(b => b.category === subCat.name).length})
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Move Up/Down */}
                            <button
                              onClick={() => moveCategory(subCat.id, 'up')}
                              className="p-1 text-gray-600 hover:bg-gray-200 rounded text-xs"
                            >
                              ▲
                            </button>
                            <button
                              onClick={() => moveCategory(subCat.id, 'down')}
                              className="p-1 text-gray-600 hover:bg-gray-200 rounded text-xs"
                            >
                              ▼
                            </button>

                            {/* Edit/Save */}
                            {editingCategory?.id === subCat.id ? (
                              <button
                                onClick={() => updateCategory(subCat.id, { name: editingCategory.name })}
                                className="px-2 py-1 bg-green-600 text-white rounded text-xs"
                              >
                                Save
                              </button>
                            ) : (
                              <button
                                onClick={() => setEditingCategory(subCat)}
                                className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
                              >
                                Edit
                              </button>
                            )}

                            {/* Enable/Disable */}
                            <button
                              onClick={() => updateCategory(subCat.id, { is_active: !subCat.is_active })}
                              className={`px-2 py-1 rounded text-xs ${
                                subCat.is_active 
                                  ? 'bg-yellow-600 text-white' 
                                  : 'bg-green-600 text-white'
                              }`}
                            >
                              {subCat.is_active ? 'Off' : 'On'}
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => deleteCategory(subCat.id, subCat.name)}
                              className="px-2 py-1 bg-red-600 text-white rounded text-xs"
                            >
                              Del
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                ))}
            </div>
          </div>
        )}
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
            {categoryFilterOptions.map(cat => (
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
                    onClick={() => openEditModal(business)}
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

      {/* EDIT MODAL - Demo Optimized */}
      {showEditModal && editingBusiness && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Edit Business</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingBusiness(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* SECTION 1: BASIC INFO */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-bold text-lg text-blue-900 mb-4">📋 Basic Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Business Name *
                    </label>
                    <input
                      type="text"
                      value={editingBusiness.name}
                      onChange={(e) => setEditingBusiness({...editingBusiness, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category *
                    </label>
                    <input
                      type="text"
                      value={editingBusiness.category}
                      onChange={(e) => setEditingBusiness({...editingBusiness, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subcategory
                    </label>
                    <input
                      type="text"
                      value={editingBusiness.subcategory || ''}
                      onChange={(e) => setEditingBusiness({...editingBusiness, subcategory: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tagline
                    </label>
                    <input
                      type="text"
                      value={editingBusiness.tagline || ''}
                      onChange={(e) => setEditingBusiness({...editingBusiness, tagline: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Short catchy phrase"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editingBusiness.description || ''}
                    onChange={(e) => setEditingBusiness({...editingBusiness, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* SECTION 2: IMAGES - FILE UPLOAD! */}
              <div className="bg-green-50 p-4 rounded-lg border-2 border-green-300">
                <h3 className="font-bold text-lg text-green-900 mb-4">📸 Upload Images</h3>
                <div className="space-y-6">
                  
                  {/* Main Image Upload */}
                  <div className="bg-white p-4 rounded-lg border border-green-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Main Business Image
                    </label>
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) uploadImage(file, 'image');
                          }}
                          className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700 file:cursor-pointer"
                          disabled={uploadingImage}
                        />
                        {uploadingImage && (
                          <p className="text-sm text-green-600 mt-2">⏳ Uploading...</p>
                        )}
                      </div>
                      {editingBusiness.image && (
                        <div className="flex-shrink-0">
                          <img 
                            src={editingBusiness.image} 
                            alt="Main" 
                            className="w-32 h-32 object-cover rounded-lg shadow-md" 
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Logo Upload */}
                  <div className="bg-white p-4 rounded-lg border border-green-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Logo
                    </label>
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) uploadImage(file, 'logo');
                          }}
                          className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700 file:cursor-pointer"
                          disabled={uploadingLogo}
                        />
                        {uploadingLogo && (
                          <p className="text-sm text-green-600 mt-2">⏳ Uploading...</p>
                        )}
                      </div>
                      {editingBusiness.logo_url && (
                        <div className="flex-shrink-0 bg-white p-2">
                          <img 
                            src={editingBusiness.logo_url} 
                            alt="Logo" 
                            className="w-24 h-24 object-contain rounded shadow-md" 
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cover Image Upload */}
                  <div className="bg-white p-4 rounded-lg border border-green-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cover/Banner Image
                    </label>
                    <div className="space-y-3">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadImage(file, 'cover');
                        }}
                        className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700 file:cursor-pointer"
                        disabled={uploadingCover}
                      />
                      {uploadingCover && (
                        <p className="text-sm text-green-600">⏳ Uploading...</p>
                      )}
                      {editingBusiness.cover_image_url && (
                        <img 
                          src={editingBusiness.cover_image_url} 
                          alt="Cover" 
                          className="w-full h-48 object-cover rounded-lg shadow-md" 
                        />
                      )}
                    </div>
                  </div>

                </div>
              </div>

              {/* SECTION 3: CONTACT */}
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-bold text-lg text-purple-900 mb-4">📞 Contact Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address *
                    </label>
                    <input
                      type="text"
                      value={editingBusiness.address}
                      onChange={(e) => setEditingBusiness({...editingBusiness, address: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={editingBusiness.phone || ''}
                      onChange={(e) => setEditingBusiness({...editingBusiness, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={editingBusiness.email || ''}
                      onChange={(e) => setEditingBusiness({...editingBusiness, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Website
                    </label>
                    <input
                      type="url"
                      value={editingBusiness.website || ''}
                      onChange={(e) => setEditingBusiness({...editingBusiness, website: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="https://"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Facebook URL
                    </label>
                    <input
                      type="url"
                      value={editingBusiness.facebook_url || ''}
                      onChange={(e) => setEditingBusiness({...editingBusiness, facebook_url: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Instagram URL
                    </label>
                    <input
                      type="url"
                      value={editingBusiness.instagram_url || ''}
                      onChange={(e) => setEditingBusiness({...editingBusiness, instagram_url: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: HOURS */}
              <div className="bg-amber-50 p-4 rounded-lg">
                <h3 className="font-bold text-lg text-amber-900 mb-4">🕐 Business Hours</h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                    <div key={day}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {day}
                      </label>
                      <input
                        type="text"
                        value={editingBusiness[`hours_${day.toLowerCase()}` as keyof Business] as string || ''}
                        onChange={(e) => setEditingBusiness({...editingBusiness, [`hours_${day.toLowerCase()}`]: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
                        placeholder="9:00 AM - 5:00 PM or Closed"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 5: AMENITIES & FEATURES */}
              <div className="bg-indigo-50 p-4 rounded-lg">
                <h3 className="font-bold text-lg text-indigo-900 mb-4">✨ Amenities & Features</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingBusiness.wheelchair_accessible || false}
                      onChange={(e) => setEditingBusiness({...editingBusiness, wheelchair_accessible: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">♿ Wheelchair Accessible</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingBusiness.parking_available || false}
                      onChange={(e) => setEditingBusiness({...editingBusiness, parking_available: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">🅿️ Parking Available</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingBusiness.wifi_available || false}
                      onChange={(e) => setEditingBusiness({...editingBusiness, wifi_available: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">📶 WiFi Available</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingBusiness.pet_friendly || false}
                      onChange={(e) => setEditingBusiness({...editingBusiness, pet_friendly: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">🐕 Pet Friendly</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingBusiness.family_friendly || false}
                      onChange={(e) => setEditingBusiness({...editingBusiness, family_friendly: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">👨‍👩‍👧 Family Friendly</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingBusiness.offers_delivery || false}
                      onChange={(e) => setEditingBusiness({...editingBusiness, offers_delivery: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">🚚 Offers Delivery</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingBusiness.offers_pickup || false}
                      onChange={(e) => setEditingBusiness({...editingBusiness, offers_pickup: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">🏪 Offers Pickup</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingBusiness.accepts_cash || false}
                      onChange={(e) => setEditingBusiness({...editingBusiness, accepts_cash: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">💵 Accepts Cash</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingBusiness.accepts_credit || false}
                      onChange={(e) => setEditingBusiness({...editingBusiness, accepts_credit: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">💳 Accepts Credit</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingBusiness.accepts_debit || false}
                      onChange={(e) => setEditingBusiness({...editingBusiness, accepts_debit: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">💳 Accepts Debit</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingBusiness.islander_owned || false}
                      onChange={(e) => setEditingBusiness({...editingBusiness, islander_owned: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">🏝️ Islander Owned</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingBusiness.chamber_member || false}
                      onChange={(e) => setEditingBusiness({...editingBusiness, chamber_member: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">🏢 Chamber Member</span>
                  </label>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={updateBusiness}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-lg"
                >
                  💾 Save Changes
                </button>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingBusiness(null);
                  }}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium text-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}