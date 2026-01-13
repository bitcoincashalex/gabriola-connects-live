// app/volunteer/opportunities/[id]/page.tsx
// Version: 1.0.0 - Initial volunteer opportunity detail and application page
// Date: 2025-01-13
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { useParams, useRouter } from 'next/navigation';

export default function OpportunityDetailPage() {
  const { user } = useUser();
  const params = useParams();
  const router = useRouter();
  const [opportunity, setOpportunity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [applicationData, setApplicationData] = useState({
    message: '',
    availability: '',
    relevant_experience: '',
  });

  useEffect(() => {
    loadOpportunity();
    if (user) {
      checkApplication();
    }
  }, [params.id, user]);

  const loadOpportunity = async () => {
    const { data, error } = await supabase
      .from('volunteer_opportunities')
      .select('*, organization:volunteer_organizations(*)')
      .eq('id', params.id)
      .single();

    if (!error && data) {
      setOpportunity(data);
    }
    setLoading(false);
  };

  const checkApplication = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('volunteer_applications')
      .select('id, status')
      .eq('opportunity_id', params.id)
      .eq('volunteer_id', user.id)
      .is('withdrawn_at', null)
      .single();

    if (data) {
      setHasApplied(true);
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push('/login');
      return;
    }

    setApplying(true);

    const { error } = await supabase
      .from('volunteer_applications')
      .insert({
        opportunity_id: params.id,
        volunteer_id: user.id,
        message: applicationData.message,
        availability: applicationData.availability,
        relevant_experience: applicationData.relevant_experience,
        status: 'pending',
      });

    if (!error) {
      alert('Application submitted successfully!');
      setHasApplied(true);
      setShowApplicationForm(false);
    } else {
      alert('Error submitting application: ' + error.message);
    }

    setApplying(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gabriola-sand p-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-2xl">Loading...</div>
        </div>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="min-h-screen bg-gabriola-sand p-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-2xl mb-4">Opportunity not found</div>
          <button
            onClick={() => router.push('/volunteer')}
            className="text-gabriola-green hover:underline"
          >
            ← Back to opportunities
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gabriola-sand">
      {/* Page Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-4">
            <button
              onClick={() => router.push('/volunteer')}
              className="text-sm text-gray-600 hover:text-gabriola-green"
            >
              ← Back to opportunities
            </button>
          </div>
          <div className="mb-4">
            <span className="text-sm text-gray-600">
              {opportunity.organization?.name}
              {opportunity.organization?.is_verified && (
                <span className="ml-1 text-blue-500">✓</span>
              )}
            </span>
          </div>
          <h1 className="text-4xl font-bold text-gabriola-green-dark mb-4">
            {opportunity.title}
          </h1>
          <div className="flex gap-4 text-sm text-gray-600 flex-wrap">
            {opportunity.location && (
              <div className="flex items-center gap-2">
                <span>📍</span>
                <span>{opportunity.location}</span>
              </div>
            )}
            {opportunity.time_commitment && (
              <div className="flex items-center gap-2">
                <span>🕐</span>
                <span>{opportunity.time_commitment}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span>🏷️</span>
              <span className="capitalize">{opportunity.category}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-white rounded-lg p-6 shadow">
              <h2 className="text-2xl font-bold mb-4">About This Opportunity</h2>
              <p className="text-gray-700 whitespace-pre-wrap">
                {opportunity.description}
              </p>
            </div>

            {/* Requirements */}
            {(opportunity.skills_required?.length > 0 || opportunity.physical_requirements) && (
              <div className="bg-white rounded-lg p-6 shadow">
                <h2 className="text-2xl font-bold mb-4">Requirements</h2>
                {opportunity.skills_required?.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-semibold mb-2">Skills Needed:</h3>
                    <div className="flex flex-wrap gap-2">
                      {opportunity.skills_required.map((skill: string, i: number) => (
                        <span key={i} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {opportunity.physical_requirements && (
                  <div>
                    <h3 className="font-semibold mb-2">Physical Requirements:</h3>
                    <p className="text-gray-700">{opportunity.physical_requirements}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Apply Button */}
            <div className="bg-white rounded-lg p-6 shadow">
              {!user ? (
                <button
                  onClick={() => router.push('/login')}
                  className="w-full bg-gabriola-green text-white py-3 px-6 rounded-lg font-semibold hover:bg-gabriola-green-dark"
                >
                  Sign in to Apply
                </button>
              ) : hasApplied ? (
                <div className="text-center">
                  <div className="text-green-600 font-semibold mb-2">✓ Applied</div>
                  <div className="text-sm text-gray-600">Your application is being reviewed</div>
                </div>
              ) : showApplicationForm ? (
                <form onSubmit={handleApply} className="space-y-4">
                  <h3 className="font-bold text-lg">Apply Now</h3>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Why are you interested? *
                    </label>
                    <textarea
                      required
                      value={applicationData.message}
                      onChange={(e) => setApplicationData({...applicationData, message: e.target.value})}
                      className="w-full border rounded-lg p-2"
                      rows={3}
                      placeholder="Tell us why you'd like to volunteer..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Your availability
                    </label>
                    <textarea
                      value={applicationData.availability}
                      onChange={(e) => setApplicationData({...applicationData, availability: e.target.value})}
                      className="w-full border rounded-lg p-2"
                      rows={2}
                      placeholder="When are you available?"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Relevant experience
                    </label>
                    <textarea
                      value={applicationData.relevant_experience}
                      onChange={(e) => setApplicationData({...applicationData, relevant_experience: e.target.value})}
                      className="w-full border rounded-lg p-2"
                      rows={2}
                      placeholder="Any related skills or experience?"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={applying}
                      className="flex-1 bg-gabriola-green text-white py-2 px-4 rounded-lg font-semibold hover:bg-gabriola-green-dark disabled:opacity-50"
                    >
                      {applying ? 'Submitting...' : 'Submit Application'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowApplicationForm(false)}
                      className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowApplicationForm(true)}
                  className="w-full bg-gabriola-green text-white py-3 px-6 rounded-lg font-semibold hover:bg-gabriola-green-dark"
                >
                  Apply Now
                </button>
              )}
            </div>

            {/* Organization Card */}
            {opportunity.organization && (
              <div className="bg-white rounded-lg p-6 shadow">
                <h3 className="font-bold mb-3">About the Organization</h3>
                <div className="mb-3">
                  <div className="font-semibold">{opportunity.organization.name}</div>
                  {opportunity.organization.is_verified && (
                    <div className="text-sm text-blue-600">✓ Verified Organization</div>
                  )}
                </div>
                {opportunity.organization.description && (
                  <p className="text-sm text-gray-600 mb-3">
                    {opportunity.organization.description}
                  </p>
                )}
                {opportunity.organization.website && (
                  <a
                    href={opportunity.organization.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gabriola-green hover:underline"
                  >
                    Visit website →
                  </a>
                )}
              </div>
            )}

            {/* Contact Info */}
            {(opportunity.coordinator_email || opportunity.coordinator_phone) && (
              <div className="bg-white rounded-lg p-6 shadow">
                <h3 className="font-bold mb-3">Contact</h3>
                {opportunity.coordinator_email && (
                  <div className="text-sm mb-2">
                    <a href={'mailto:' + opportunity.coordinator_email} className="text-gabriola-green hover:underline">
                      {opportunity.coordinator_email}
                    </a>
                  </div>
                )}
                {opportunity.coordinator_phone && (
                  <div className="text-sm">
                    <a href={'tel:' + opportunity.coordinator_phone} className="text-gabriola-green hover:underline">
                      {opportunity.coordinator_phone}
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
