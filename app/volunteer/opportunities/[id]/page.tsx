// app/volunteer/opportunities/[id]/page.tsx
// Version: 1.0.5 - Clean rebuild with verified syntax
// Date: 2025-01-13
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { useParams, useRouter } from 'next/navigation';
import Footer from '@/components/Footer';

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
      .select('id')
      .eq('opportunity_id', params.id)
      .eq('user_id', user.id)
      .single();

    if (data) {
      setHasApplied(true);
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push('/signin');
      return;
    }

    setApplying(true);

    const { error } = await supabase
      .from('volunteer_applications')
      .insert({
        opportunity_id: params.id,
        user_id: user.id,
        status: 'pending',
        message: applicationData.message,
        availability: applicationData.availability,
        relevant_experience: applicationData.relevant_experience,
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
      <div className="flex flex-col min-h-screen">
        <div className="flex-1 bg-gabriola-sand p-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="text-2xl">Loading...</div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="flex-1 bg-gabriola-sand p-8">
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
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 bg-gabriola-sand">
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
            <h1 className="text-4xl font-bold text-gabriola-green-dark mb-2">
              {opportunity.title}
            </h1>
            <p className="text-lg text-gray-600">
              {opportunity.organization?.name}
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-2xl font-bold mb-4">About This Opportunity</h2>
                <p className="text-gray-700 whitespace-pre-wrap mb-6">
                  {opportunity.description}
                </p>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Time Commitment</h3>
                    <p className="text-gray-600">{opportunity.time_commitment}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Location</h3>
                    <p className="text-gray-600">{opportunity.location || 'Flexible'}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Category</h3>
                    <p className="text-gray-600 capitalize">{opportunity.category}</p>
                  </div>
                  {opportunity.skills_required && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Skills Required</h3>
                      <p className="text-gray-600">{opportunity.skills_required}</p>
                    </div>
                  )}
                </div>
              </div>

              {!user ? (
                <button
                  onClick={() => router.push('/signin')}
                  className="w-full bg-gabriola-green text-white py-3 px-6 rounded-lg font-semibold hover:bg-gabriola-green-dark"
                >
                  Sign in to Apply
                </button>
              ) : hasApplied ? (
                <div className="text-center">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800 font-semibold">
                      ✓ You have already applied to this opportunity
                    </p>
                  </div>
                </div>
              ) : !showApplicationForm ? (
                <button
                  onClick={() => setShowApplicationForm(true)}
                  className="w-full bg-gabriola-green text-white py-3 px-6 rounded-lg font-semibold hover:bg-gabriola-green-dark"
                >
                  Apply Now
                </button>
              ) : (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-xl font-bold mb-4">Submit Application</h3>
                  <form onSubmit={handleApply}>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Why are you interested? *
                      </label>
                      <textarea
                        required
                        value={applicationData.message}
                        onChange={(e) => setApplicationData({...applicationData, message: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
                        rows={4}
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Availability
                      </label>
                      <input
                        type="text"
                        value={applicationData.availability}
                        onChange={(e) => setApplicationData({...applicationData, availability: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="e.g., Weekends, Evenings"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Relevant Experience
                      </label>
                      <textarea
                        value={applicationData.relevant_experience}
                        onChange={(e) => setApplicationData({...applicationData, relevant_experience: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={applying}
                        className="flex-1 bg-gabriola-green text-white py-2 px-4 rounded-lg hover:bg-gabriola-green-dark disabled:opacity-50"
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
                </div>
              )}
            </div>

            <div>
              <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
                <h3 className="text-xl font-bold mb-4">Organization</h3>
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900">
                    {opportunity.organization?.name}
                  </h4>
                  {opportunity.organization?.description && (
                    <p className="text-sm text-gray-600 mt-2">
                      {opportunity.organization.description}
                    </p>
                  )}
                </div>

                {opportunity.organization?.contact_email && (
                  <div className="mb-3">
                    <h4 className="font-semibold text-gray-900 text-sm mb-1">Contact</h4>
                    <a
                      href={`mailto:${opportunity.organization.contact_email}`}
                      className="text-sm text-gabriola-green hover:underline"
                    >
                      {opportunity.organization.contact_email}
                    </a>
                  </div>
                )}

                {opportunity.organization?.phone && (
                  <div className="mb-3">
                    <h4 className="font-semibold text-gray-900 text-sm mb-1">Phone</h4>
                    <a
                      href={`tel:${opportunity.organization.phone}`}
                      className="text-sm text-gabriola-green hover:underline"
                    >
                      {opportunity.organization.phone}
                    </a>
                  </div>
                )}

                {opportunity.organization?.website && (
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm mb-1">Website</h4>
                    <a
                      href={opportunity.organization.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gabriola-green hover:underline"
                    >
                      Visit Website →
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
