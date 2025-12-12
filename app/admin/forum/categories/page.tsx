// app/admin/forum/categories/page.tsx
// Version: 1.0.0 - Categories Management Admin Page
// Date: 2025-12-11

'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { 
  FolderPlus, Edit, Trash2, Archive, Eye, EyeOff,
  ArrowUp, ArrowDown, Plus, X, Save
} from 'lucide-react';
import Link from 'next/link';

interface Category {
  id: string;
  parent_id: string | null;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  emoji: string | null;
  display_order: number;
  is_featured: boolean;
  is_active: boolean;
  is_archived: boolean;
  thread_count: number;
  reply_count: number;
}

export default function CategoriesManagementPage() {
  const { user } = useUser();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    parent_id: '',
    emoji: '',
    color: '#2d5f3f',
    display_order: 0
  });

  // Check admin access
  const isForumAdmin = user && ((user as any).is_super_admin || (user as any).admin_forum);

  useEffect(() => {
    if (!isForumAdmin) {
      window.location.href = '/';
      return;
    }
    fetchCategories();
  }, [isForumAdmin]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('bbs_categories')
        .select('*')
        .order('parent_id', { ascending: true, nullsFirst: true })
        .order('display_order', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!formData.name.trim() || !formData.slug.trim()) {
      alert('Name and slug are required');
      return;
    }

    try {
      const { error } = await supabase
        .from('bbs_categories')
        .insert({
          name: formData.name,
          slug: formData.slug,
          description: formData.description || null,
          parent_id: formData.parent_id || null,
          emoji: formData.emoji || null,
          color: formData.color,
          display_order: formData.display_order,
          is_active: true,
          is_archived: false,
          created_by: user?.id
        });

      if (error) throw error;

      // Log action
      await supabase.rpc('log_moderation_action', {
        p_moderator_id: user?.id,
        p_action_type: 'create_category',
        p_target_type: 'category',
        p_target_id: formData.slug
      });

      setShowCreateModal(false);
      resetForm();
      fetchCategories();
    } catch (error) {
      console.error('Error creating category:', error);
      alert('Failed to create category');
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory) return;

    try {
      const { error } = await supabase
        .from('bbs_categories')
        .update({
          name: formData.name,
          slug: formData.slug,
          description: formData.description || null,
          parent_id: formData.parent_id || null,
          emoji: formData.emoji || null,
          color: formData.color,
          display_order: formData.display_order
        })
        .eq('id', editingCategory.id);

      if (error) throw error;

      // Log action
      await supabase.rpc('log_moderation_action', {
        p_moderator_id: user?.id,
        p_action_type: 'edit_category',
        p_target_type: 'category',
        p_target_id: editingCategory.id
      });

      setEditingCategory(null);
      resetForm();
      fetchCategories();
    } catch (error) {
      console.error('Error updating category:', error);
      alert('Failed to update category');
    }
  };

  const handleToggleActive = async (categoryId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('bbs_categories')
        .update({ is_active: !currentStatus })
        .eq('id', categoryId);

      if (error) throw error;
      fetchCategories();
    } catch (error) {
      console.error('Error toggling active status:', error);
      alert('Failed to update category');
    }
  };

  const handleArchive = async (categoryId: string) => {
    if (!confirm('Archive this category? It will be hidden from users.')) return;

    try {
      const { error } = await supabase
        .from('bbs_categories')
        .update({ is_archived: true, is_active: false })
        .eq('id', categoryId);

      if (error) throw error;

      // Log action
      await supabase.rpc('log_moderation_action', {
        p_moderator_id: user?.id,
        p_action_type: 'archive_category',
        p_target_type: 'category',
        p_target_id: categoryId
      });

      fetchCategories();
    } catch (error) {
      console.error('Error archiving category:', error);
      alert('Failed to archive category');
    }
  };

  const handleMoveUp = async (category: Category) => {
    const sameLevelCats = categories.filter(c => c.parent_id === category.parent_id);
    const currentIndex = sameLevelCats.findIndex(c => c.id === category.id);
    if (currentIndex <= 0) return;

    const prevCat = sameLevelCats[currentIndex - 1];
    
    try {
      await supabase
        .from('bbs_categories')
        .update({ display_order: prevCat.display_order })
        .eq('id', category.id);

      await supabase
        .from('bbs_categories')
        .update({ display_order: category.display_order })
        .eq('id', prevCat.id);

      fetchCategories();
    } catch (error) {
      console.error('Error reordering:', error);
    }
  };

  const handleMoveDown = async (category: Category) => {
    const sameLevelCats = categories.filter(c => c.parent_id === category.parent_id);
    const currentIndex = sameLevelCats.findIndex(c => c.id === category.id);
    if (currentIndex >= sameLevelCats.length - 1) return;

    const nextCat = sameLevelCats[currentIndex + 1];
    
    try {
      await supabase
        .from('bbs_categories')
        .update({ display_order: nextCat.display_order })
        .eq('id', category.id);

      await supabase
        .from('bbs_categories')
        .update({ display_order: category.display_order })
        .eq('id', nextCat.id);

      fetchCategories();
    } catch (error) {
      console.error('Error reordering:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      parent_id: '',
      emoji: '',
      color: '#2d5f3f',
      display_order: 0
    });
  };

  const startEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      parent_id: category.parent_id || '',
      emoji: category.emoji || '',
      color: category.color || '#2d5f3f',
      display_order: category.display_order
    });
  };

  if (!isForumAdmin) {
    return <div className="text-center py-20">Access Denied</div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gabriola-green"></div>
          <p className="mt-4 text-gray-600">Loading categories...</p>
        </div>
      </div>
    );
  }

  const topLevelCategories = categories.filter(c => !c.parent_id);
  const getChildren = (parentId: string) => categories.filter(c => c.parent_id === parentId);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Link href="/admin/forum" className="text-gray-500 hover:text-gray-700">
              Admin
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900">Categories</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Category Management</h1>
              <p className="text-gray-600">Create, edit, and organize forum categories</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gabriola-green text-white rounded-lg hover:bg-gabriola-green-dark transition"
            >
              <Plus className="w-5 h-5" />
              New Category
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600">Total Categories</p>
            <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600">Active</p>
            <p className="text-2xl font-bold text-green-600">
              {categories.filter(c => c.is_active).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600">Archived</p>
            <p className="text-2xl font-bold text-gray-600">
              {categories.filter(c => c.is_archived).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600">Total Threads</p>
            <p className="text-2xl font-bold text-blue-600">
              {categories.reduce((sum, c) => sum + (c.thread_count || 0), 0)}
            </p>
          </div>
        </div>

        {/* Categories Tree */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Categories</h2>
          <div className="space-y-2">
            {topLevelCategories.map((category) => {
              const children = getChildren(category.id);
              
              return (
                <div key={category.id}>
                  {/* Parent Category */}
                  <div className={`flex items-center justify-between p-4 rounded-lg border ${
                    category.is_active ? 'border-gray-200' : 'border-gray-300 bg-gray-50'
                  }`}>
                    <div className="flex items-center gap-3 flex-1">
                      {category.emoji && <span className="text-2xl">{category.emoji}</span>}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{category.name}</h3>
                          <span className="text-xs text-gray-500 font-mono">{category.slug}</span>
                          {!category.is_active && (
                            <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-full">
                              Inactive
                            </span>
                          )}
                          {category.is_archived && (
                            <span className="px-2 py-1 bg-yellow-200 text-yellow-700 text-xs rounded-full">
                              Archived
                            </span>
                          )}
                        </div>
                        {category.description && (
                          <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {category.thread_count || 0} threads • {category.reply_count || 0} replies
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleMoveUp(category)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded transition"
                        title="Move up"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleMoveDown(category)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded transition"
                        title="Move down"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => startEdit(category)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(category.id, category.is_active)}
                        className="p-2 text-yellow-600 hover:bg-yellow-50 rounded transition"
                        title={category.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {category.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleArchive(category.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                        title="Archive"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Child Categories */}
                  {children.length > 0 && (
                    <div className="ml-8 mt-2 space-y-2">
                      {children.map((child) => (
                        <div
                          key={child.id}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            child.is_active ? 'border-gray-200' : 'border-gray-300 bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            {child.emoji && <span className="text-xl">{child.emoji}</span>}
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-gray-900">{child.name}</h4>
                                <span className="text-xs text-gray-500 font-mono">{child.slug}</span>
                                {!child.is_active && (
                                  <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-full">
                                    Inactive
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {child.thread_count || 0} threads • {child.reply_count || 0} replies
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleMoveUp(child)}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded transition"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleMoveDown(child)}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded transition"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => startEdit(child)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleActive(child.id, child.is_active)}
                              className="p-2 text-yellow-600 hover:bg-yellow-50 rounded transition"
                            >
                              {child.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleArchive(child.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingCategory) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => {
          setShowCreateModal(false);
          setEditingCategory(null);
          resetForm();
        }}>
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingCategory ? 'Edit Category' : 'Create Category'}
            </h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Slug *
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({...formData, slug: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Parent Category
                  </label>
                  <select
                    value={formData.parent_id}
                    onChange={(e) => setFormData({...formData, parent_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
                  >
                    <option value="">None (Top Level)</option>
                    {topLevelCategories.filter(c => c.id !== editingCategory?.id).map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Emoji
                  </label>
                  <input
                    type="text"
                    value={formData.emoji}
                    onChange={(e) => setFormData({...formData, emoji: e.target.value})}
                    placeholder="📁"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color
                  </label>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({...formData, color: e.target.value})}
                    className="w-full h-10 px-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({...formData, display_order: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}
                className="flex-1 px-4 py-2 bg-gabriola-green text-white rounded-lg font-medium hover:bg-gabriola-green-dark transition flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                {editingCategory ? 'Update' : 'Create'} Category
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingCategory(null);
                  resetForm();
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
