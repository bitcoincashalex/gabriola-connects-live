// app/volunteer/page.tsx
// Version: 1.0.5 - Clean rebuild with verified syntax
// Date: 2025-01-13
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import Link from 'next/link';
import Footer from '@/components/Footer';

export default function VolunteerPage() {
  const { user } = useUser();
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    loadOpportunities();
  }, [selectedCategory]);

  const loadOpportunities = async () => {
    let query = supabase
      .from('volunteer_opportunities')
      .select('*, organization:volunteer_organizations(name)')
      .eq('status', 'active')
      .eq('is_approved', true)
      .order('created_at', { ascending: false });

    if (selectedCategory !== 'all') {
      query = query.eq('category', selectedCategory);
    }

    const { data } = await query;
    setOpportunities(data || []);
    setLoading(false);
  };

  const categories = [
    { id: 'all', label: 'All Categories', emoji: '🌟' },
    { id: 'environment', label: 'Environment', emoji: '🌲' },
    { id: 'education', label: 'Education', emoji: '📚' },
    { id: 'health', label: 'Health & Wellness', emoji: '❤️' },
    { id: 'animals', label: 'Animals', emoji: '🐾' },
    { id: 'seniors', label: 'Seniors', emoji: '👴' },
    { id: 'youth', label: 'Youth', emoji: '👶' },
    { id: 'arts', label: 'Arts & Culture', emoji: '🎨' },
    { id: 'community', label: 'Community', emoji: '🤝' },
  ];

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="flex-1 bg-gabriola-sand p-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center py-12">
              <div className="text-2xl">Loading opportunities...</div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 bg-gabriola-sand">
        <div className="bg-white border-b">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold text-gabriola-green-dark mb-2">
              Volunteer Opportunities
            </h1>
            <p className="text-gray-600">
              Make a difference in the Gabriola community
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="mb-6 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  selectedCategory === cat.id
                    ? 'bg-gabriola-green text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>

          {opportunities.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">
                No opportunities found in this category.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {opportunities.map((opp) => (
                <Link
                  key={opp.id}
                  href={`/volunteer/opportunities/${opp.id}`}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition overflow-hidden"
                >
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-2 text-gabriola-green-dark">
                      {opp.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      {opp.organization?.name}
                    </p>
                    <p className="text-gray-700 mb-4 line-clamp-3">
                      {opp.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        {opp.time_commitment}
                      </span>
                      <span className="text-sm font-medium text-gabriola-green">
                        Learn More →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
