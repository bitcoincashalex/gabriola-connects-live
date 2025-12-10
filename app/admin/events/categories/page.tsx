// Path: app/admin/events/categories/page.tsx
// Version: 1.0.0 - Event Category Manager
// Date: 2024-12-10

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
  Trash2,
  Save,
  X,
  FolderTree
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  created_at: string;
}

export default function EventCategoryManager() {
  const { user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    icon: '📅',
  });

  useEffect(() => {
    if (!user) {
      router.push('/signin');
      return;
    }

    const isEventAdmin = user.is_super_admin || (user as any).admin_events;
    if (!isEventAdmin) {
      router.push('/');
      alert('Access denied: Event admins only');
      return;
    }

    fetchCategories();
  }, [user, router]);

  const fetchCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('event_categories')
      .select('*')
      .order('name', { ascending: true });

    if (!error && data) {
      setCategories(data);
    }
    setLoading(false);
  };

  const handleCreateCategory = async () => {
    if (!formData.name.trim()) {
      alert('Category name is required');
      return;
    }

    const { error } = await supabase.from('event_categories').insert({
      name: formData.name.trim(),
      description: formData.description.trim(),
      color: formData.color,
      icon: formData.icon,
    });

    if (error) {
      console.error('Error creating category:', error);
      alert('Failed to create category: ' + error.message);
    } else {
      setShowCreateModal(false);
      setFormData({ name: '', description: '', color: '#3B82F6', icon: '📅' });
      fetchCategories();
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory) return;

    const { error } = await supabase
      .from('event_categories')
      .update({
        name: formData.name.trim(),
        description: formData.description.trim(),
        color: formData.color,
        icon: formData.icon,
      })
      .eq('id', editingCategory.id);

    if (error) {
      console.error('Error updating category:', error);
      alert('Failed to update category: ' + error.message);
    } else {
      setEditingCategory(null);
      setFormData({ name: '', description: '', color: '#3B82F6', icon: '📅' });
      fetchCategories();
    }
  };

  const handleDelete = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Delete "${categoryName}"?\n\nEvents using this category will need to be recategorized.`)) return;

    const { error } = await supabase
      .from('event_categories')
      .delete()
      .eq('id', categoryId);

    if (error) {
      alert('Failed to delete category. Make sure no events are using it.');
    } else {
      fetchCategories();
    }
  };

  const startEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color || '#3B82F6',
      icon: category.icon || '📅',
    });
  };

  const cancelEdit = () => {
    setEditingCategory(null);
    setFormData({ name: '', description: '', color: '#3B82F6', icon: '📅' });
  };

  const commonIcons = ['📅', '🎨', '🎵', '🤝', '⚽', '📚', '🍴', '💰', '🎉', '📋', '🛍️', '👨‍👩‍👧‍👦', '👴', '🧘', '🌱', '📌'];

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
            href="/admin/events"
            className="inline-flex items-center gap-2 text-blue-600 hover:underline mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Event Categories</h1>
              <p className="text-gray-600">Manage event categories and their appearance</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition"
            >
              <Plus className="w-5 h-5" />
              New Category
            </button>
          </div>
        </div>

        {/* Categories List */}
        <div className="space-y-4">
          {categories.map(category => {
            const isEditing = editingCategory?.id === category.id;

            return (
              <div key={category.id} className="bg-white rounded-lg shadow">
                <div className="p-6">
                  {isEditing ? (
                    // Edit Form
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={e => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg"
                          placeholder="Category name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <textarea
                          value={formData.description}
                          onChange={e => setFormData({ ...formData, description: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg"
                          placeholder="Brief description"
                          rows={2}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                          <input
                            type="color"
                            value={formData.color}
                            onChange={e => setFormData({ ...formData, color: e.target.value })}
                            className="w-full h-12 rounded-lg border cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
                          <div className="flex flex-wrap gap-2">
                            {commonIcons.map(icon => (
                              <button
                                key={icon}
                                onClick={() => setFormData({ ...formData, icon })}
                                className={`text-2xl p-2 rounded border-2 ${
                                  formData.icon === icon ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-400'
                                }`}
                              >
                                {icon}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
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
                        <div 
                          className="w-16 h-16 rounded-lg flex items-center justify-center text-3xl"
                          style={{ backgroundColor: category.color + '20' }}
                        >
                          {category.icon}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">
                            {category.name}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {category.description || 'No description'}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <span 
                              className="inline-block w-4 h-4 rounded"
                              style={{ backgroundColor: category.color }}
                            ></span>
                            <span className="text-xs text-gray-500">{category.color}</span>
                          </div>
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
                          onClick={() => handleDelete(category.id, category.name)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {categories.length === 0 && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <FolderTree className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-xl text-gray-600">No categories yet</p>
              <p className="text-gray-500 mt-2">Create your first event category to get started</p>
            </div>
          )}
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
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="e.g., Arts & Culture"
                  />
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                    <input
                      type="color"
                      value={formData.color}
                      onChange={e => setFormData({ ...formData, color: e.target.value })}
                      className="w-full h-12 rounded-lg border cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">Used for category badges</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Icon/Emoji</label>
                    <div className="flex flex-wrap gap-2">
                      {commonIcons.map(icon => (
                        <button
                          key={icon}
                          onClick={() => setFormData({ ...formData, icon })}
                          className={`text-2xl p-2 rounded border-2 ${
                            formData.icon === icon ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-400'
                          }`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCreateCategory}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700"
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

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-blue-900 mb-2">ℹ️ About Event Categories</h3>
          <ul className="space-y-1 text-blue-800 text-sm">
            <li>• <strong>Categories</strong> help users find events they're interested in</li>
            <li>• <strong>Colors</strong> are shown on event badges throughout the site</li>
            <li>• <strong>Icons</strong> make categories visually distinctive</li>
            <li>• <strong>Keep it simple</strong> - 10-15 categories is ideal</li>
            <li>• Cannot delete categories that are in use by existing events</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
