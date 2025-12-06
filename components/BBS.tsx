// components/BBS.tsx — FINAL, CLEAN, PROFESSIONAL
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import CreateThread from './CreateThread';
import ThreadList from './ThreadList';
import { Plus } from 'lucide-react';

const categories = [
  { id: 'all', name: 'All Posts' },
  { id: 'general', name: 'General' },
  { id: 'events', name: 'Events' },
  { id: 'buy-sell', name: 'Buy & Sell' },
  { id: 'ferry', name: 'Ferry' },
  { id: 'politics-canada', name: 'Politics – Canada' },
  { id: 'politics-us', name: 'Politics – US' },
  { id: 'politics-world', name: 'Politics – World' },
  { id: 'politics-local', name: 'Politics – Local' },
  { id: 'environment', name: 'Environment' },
  { id: 'housing', name: 'Housing' },
  { id: 'health', name: 'Health' },
];

export default function BBS() {
  const { user } = useUser();
  const [activeCategory, setActiveCategory] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-5xl font-bold text-gabriola-green">Community Forum</h1>
              <p className="text-xl text-gray-600 mt-2">Real conversations. Real neighbours. Real Gabriola.</p>
              {user && (
                <p className="text-lg text-gray-700 mt-4">
                  Logged in as <span className="font-bold">{user.full_name}</span>
                  {user.role === 'admin' && ' Admin'}
                </p>
              )}
            </div>

            {/* Floating "New Post" button — only for logged-in users */}
            {user && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="fixed bottom-8 right-8 bg-gabriola-green text-white w-16 h-16 rounded-full shadow-2xl flex items-center justify-center hover:bg-gabriola-green-dark transition z-50"
              >
                <Plus className="w-8 h-8" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-3">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-6 py-3 rounded-full font-medium transition ${
                  activeCategory === cat.id
                    ? 'bg-gabriola-green text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Thread List — fills the page */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <ThreadList category={activeCategory} currentUser={user} />
      </div>

      {/* Create Thread Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
            <CreateThread
              currentUser={user!}
              onSuccess={() => {
                setShowCreateModal(false);
                window.location.reload();
              }}
            />
            <button
              onClick={() => setShowCreateModal(false)}
              className="mt-6 w-full py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}