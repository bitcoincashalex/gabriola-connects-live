// Path: app/mod/categories/page.tsx
// Version: 1.0.0 - Category Management
// Date: 2024-12-09

'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Plus, 
  Edit, 
  Archive, 
  Eye, 
  EyeOff,
  FolderTree,
  Save,
  X
} from 'lucide-react';

interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  parent_id: string | null;
  display_order: number;
  is_active: boolean;
  is_archived: boolean;
  thread_count: number;
}

export default function CategoryManagement() {
  const { user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    parent_id: null as string | null,
    display_order: 100,
  });

  useEffect(() => {
    // Check permissions
    if (!user) {
      router.push('/signin');
      return;
    }

    const isModerator = (user as any).forum_moderator || (user as any).admin_forum || user.is_super_admin;
    if (!isModerator) {
      router.push('/');
      alert('Access denied: Moderators only');
      return;
    }

    fetchCategories();
  }, [user, router]);

  const fetchCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bbs_categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (!error && data) {
      setCategories(data);
    }
    setLoading(false);
  };

  const handleCreateCategory = async () => {
    if (!formData.name.trim() || !formData.slug.trim()) {
      alert('Name and slug are required');
      return;
    }

    const { error } = await supabase.from('bbs_categories').insert({
      ...formData,
      created_by: user?.id,
    });

    if (error) {
      console.error('Error creating category:', error);
      alert('Failed to create category: ' + error.message);
    } else {
      setShowCreateModal(false);
      setFormData({ name: '', slug: '', description: '', parent_id: null, display_order: 100 });
      fetchCategories();
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory) return;

    const { error } = await supabase
      .from('bbs_categories')
      .update({
        name: formData.name,
        description: formData.description,
        parent_id: formData.parent_id,
        display_order: formData.display_order,
      })
      .eq('id', editingCategory.id);

    if (error) {
      console.error('Error updating category:', error);
      alert('Failed to update category: ' + error.message);
    } else {
      setEditingCategory(null);
      setFormData({ name: '', slug: '', description: '', parent_id: null, display_order: 100 });
      fetchCategories();
    }
  };

  const handleToggleActive = async (category: Category) => {
    const { error } = await supabase
      .from('bbs_categories')
      .update({ is_active: !category.is_active })
      .eq('id', category.id);

    if (error) {
      alert('Failed to toggle category status');
    } else {
      fetchCategories();
    }
  };

  const handleArchive = async (category: Category) => {
    if (!confirm(`Archive "${category.name}"? This will hide it from the forum.`)) return;

    const { error } = await supabase
      .from('bbs_categories')
      .update({ is_archived: true, is_active: false })
      .eq('id', category.id);

    if (error) {
      alert('Failed to archive category');
    } else {
      fetchCategories();
    }
  };

  const startEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      parent_id: category.parent_id,
      display_order: category.display_order,
    });
  };

  const cancelEdit = () => {
    setEditingCategory(null);
    setFormData({ name: '', slug: '', description: '', parent_id: null, display_order: 100 });
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  const topLevelCategories = categories.filter(c => !c.parent_id);
  const getChildren = (parentId: string) => categories.filter(c => c.parent_id === parentId);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-xl text-gray-600">Loading categories...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/mod"
            className="inline-flex items-center gap-2 text-purple-600 hover:underline mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Category Management</h1>
              <p className="text-gray-600">Create, edit, and organize forum categories</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-purple-700 transition"
            >
              <Plus className="w-5 h-5" />
              New Category
            </button>
          </div>
        </div>

        {/* Categories List */}
        <div className="space-y-4">
          {topLevelCategories.map(category => {
            const children = getChildren(category.id);
            const isEditing = editingCategory?.id === category.id;

            return (
              <div key={category.id} className="bg-white rounded-lg shadow">
                {/* Parent Category */}
                <div className={`p-6 ${!category.is_active ? 'bg-gray-100' : ''}`}>
                  {isEditing ? (
                    // Edit Form
                    <div className="space-y-4">
                      <input
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg"
                        placeholder="Category name"
                      />
                      <textarea
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg"
                        placeholder="Description (optional)"
                        rows={2}
                      />
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleUpdateCategory}
                          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                        >
                          <Save className="w-4 h-4" />
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="flex items-center gap-2 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Display Mode
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <FolderTree className={`w-6 h-6 ${category.is_active ? 'text-purple-600' : 'text-gray-400'}`} />
                        <div>
                          <h3 className={`text-xl font-bold ${category.is_active ? 'text-gray-900' : 'text-gray-500'}`}>
                            {category.name}
                            {category.is_archived && <span className="ml-2 text-sm text-red-600">(Archived)</span>}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Slug: <code className="bg-gray-100 px-2 py-1 rounded">{category.slug}</code>
                            {category.description && ` • ${category.description}`}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            {category.thread_count} thread{category.thread_count !== 1 ? 's' : ''} • 
                            Order: {category.display_order}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(category)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Edit"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(category)}
                          className={`p-2 rounded-lg ${category.is_active ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`}
                          title={category.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {category.is_active ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                        <button
                          onClick={() => handleArchive(category)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Archive"
                        >
                          <Archive className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Child Categories */}
                {children.length > 0 && (
                  <div className="border-t border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm font-medium text-gray-600 mb-3">Subcategories:</p>
                    <div className="space-y-2">
                      {children.map(child => {
                        const isEditingChild = editingCategory?.id === child.id;

                        return (
                          <div key={child.id} className={`flex items-center justify-between p-3 bg-white rounded-lg ${!child.is_active ? 'opacity-60' : ''}`}>
                            {isEditingChild ? (
                              <div className="flex-1 space-y-2">
                                <input
                                  type="text"
                                  value={formData.name}
                                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                                  className="w-full px-3 py-1 border rounded"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={handleUpdateCategory}
                                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    className="bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-400"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">
                                    {child.name}
                                    {child.is_archived && <span className="ml-2 text-xs text-red-600">(Archived)</span>}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {child.thread_count} thread{child.thread_count !== 1 ? 's' : ''}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => startEdit(child)}
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleToggleActive(child)}
                                    className="p-1 text-orange-600 hover:bg-orange-50 rounded"
                                  >
                                    {child.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  </button>
                                  <button
                                    onClick={() => handleArchive(child)}
                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                  >
                                    <Archive className="w-4 h-4" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowCreateModal(false)}>
            <div className="bg-white rounded-2xl max-w-2xl w-full p-8" onClick={e => e.stopPropagation()}>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Category</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => {
                      const name = e.target.value;
                      setFormData({ 
                        ...formData, 
                        name,
                        slug: generateSlug(name)
                      });
                    }}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="e.g., Local News"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Slug (URL-friendly) *</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={e => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="e.g., local-news"
                  />
                  <p className="text-xs text-gray-500 mt-1">Auto-generated from name, but you can customize it</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="Brief description of this category"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Parent Category</label>
                  <select
                    value={formData.parent_id || ''}
                    onChange={e => setFormData({ ...formData, parent_id: e.target.value || null })}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="">None (Top-level category)</option>
                    {topLevelCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Display Order</label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={e => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCreateCategory}
                  className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700"
                >
                  Create Category
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
