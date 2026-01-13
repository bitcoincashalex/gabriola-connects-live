// app/volunteer/page.tsx
// Version: 1.0.1 - Fixed TypeScript type error for opportunities state
// Date: 2025-01-13
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import Link from 'next/link';

export default function VolunteerBrowsePage() {
  const { user } = useUser();
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadOpportunities();
  }, [filter]);

  const loadOpportunities = async () => {
    let query = supabase
      .from('volunteer_opportunities')
      .select('*, organization:volunteer_organizations(name, logo_url, is_verified)')
      .eq('status', 'active')
      .eq('is_approved', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('category', filter);
    }

    const { data, error } = await query;
    
    if (!error) {
      setOpportunities(data || []);
    }
    setLoading(false);
  };

  const categories = [
    { id: 'all', label: 'All', emoji: '🌟' },
    { id: 'environmental', label: 'Environmental', emoji: '🌱' },
    { id: 'seniors', label: 'Seniors', emoji: '👵' },
    { id: 'youth', label: 'Youth', emoji: '👶' },
    { id: 'animals', label: 'Animals', emoji: '🐾' },
    { id: 'arts', label: 'Arts & Culture', emoji: '🎨' },
    { id: 'community', label: 'Community', emoji: '🤝' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gabriola-sand p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="text-2xl">Loading opportunities...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gabriola-sand">
      {/* Page Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold text-gabriola-green-dark mb-2">
            Volunteer Opportunities
          </h1>
          <p className="text-lg text-gray-600">
            Make a difference in your community
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Category Filter */}
        <div className="mb-8 flex gap-2 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              className={'px-4 py-2 rounded-full font-medium transition-colors ' + (
                filter === cat.id
                  ? 'bg-gabriola-green text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              )}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>

        {/* Opportunities Grid */}
        {opportunities.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <div className="text-gray-500 text-lg">
              No opportunities found. Check back soon!
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {opportunities.map((opp: any) => (
              <Link
                key={opp.id}
                href={'/volunteer/opportunities/' + opp.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
              >
                <div className="p-6">
                  {/* Organization */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-sm text-gray-600">
                      {opp.organization?.name}
                      {opp.organization?.is_verified && (
                        <span className="ml-1 text-blue-500">✓</span>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {opp.title}
                  </h3>

                  {/* Summary */}
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {opp.summary || opp.description?.slice(0, 100)}
                  </p>

                  {/* Details */}
                  <div className="space-y-2 text-sm text-gray-500 mb-4">
                    {opp.location && (
                      <div className="flex items-center gap-2">
                        <span>📍</span>
                        <span>{opp.location}</span>
                      </div>
                    )}
                    {opp.time_commitment && (
                      <div className="flex items-center gap-2">
                        <span>🕐</span>
                        <span>{opp.time_commitment}</span>
                      </div>
                    )}
                  </div>

                  {/* Category Badge */}
                  <div className="mb-4">
                    <span className="inline-block px-3 py-1 bg-gabriola-green/10 text-gabriola-green rounded-full text-xs font-medium">
                      {opp.category}
                    </span>
                  </div>

                  {/* Volunteers Needed */}
                  {opp.volunteers_needed && (
                    <div className="text-sm text-gray-600">
                      {opp.volunteers_filled || 0} of {opp.volunteers_needed} volunteers
                    </div>
                  )}

                  {/* CTA */}
                  <div className="mt-4 pt-4 border-t">
                    <span className="text-gabriola-green font-medium">
                      Learn more →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
