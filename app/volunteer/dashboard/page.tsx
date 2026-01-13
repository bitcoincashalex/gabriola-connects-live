// app/volunteer/dashboard/page.tsx
// Version: 1.0.1 - Fixed TypeScript type errors for state arrays
// Date: 2025-01-13
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';

export default function VolunteerDashboard() {
  const { user } = useUser();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    // Load user's organizations
    const { data: orgs } = await supabase
      .from('organization_members')
      .select('*, organization:volunteer_organizations(*)')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (orgs) {
      setOrganizations(orgs);
      
      // Load applications to user's organizations
      if (orgs.length > 0) {
        const orgIds = orgs.map(o => o.organization_id);
        
        // First get opportunity IDs for these organizations
        const { data: opps } = await supabase
          .from('volunteer_opportunities')
          .select('id')
          .in('organization_id', orgIds);
        
        if (opps && opps.length > 0) {
          const oppIds = opps.map(o => o.id);
          
          // Then get applications for those opportunities
          const { data: apps } = await supabase
            .from('volunteer_applications')
            .select('*, opportunity:volunteer_opportunities(*), volunteer:users(full_name, email, avatar_url)')
            .in('opportunity_id', oppIds)
            .order('applied_at', { ascending: false });

          if (apps) {
            setApplications(apps);
          }
        }
      }
    }

    setLoading(false);
  };

  const handleApproveReject = async (appId: string, newStatus: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('volunteer_applications')
      .update({
        status: newStatus,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq('id', appId);

    if (!error) {
      alert('Application ' + newStatus + '!');
      loadData();
    } else {
      alert('Error: ' + error.message);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gabriola-sand p-8">Loading...</div>;
  }

  if (!user) {
    return <div className="min-h-screen bg-gabriola-sand p-8">Please log in</div>;
  }

  if (organizations.length === 0) {
    return (
      <div className="min-h-screen bg-gabriola-sand p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">Volunteer Dashboard</h1>
          <div className="bg-white rounded-lg p-6">
            <p className="text-gray-600 mb-4">
              You are not a member of any organizations yet.
            </p>
            <p className="text-sm text-gray-500">
              Contact an admin to get added to an organization or create your own.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const pendingApps = applications.filter(a => a.status === 'pending');

  return (
    <div className="min-h-screen bg-gabriola-sand p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Volunteer Dashboard</h1>

        {/* Organizations */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Your Organizations</h2>
          <div className="space-y-2">
            {organizations.map((om: any) => (
              <div key={om.organization_id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <div className="font-semibold">{om.organization.name}</div>
                  <div className="text-sm text-gray-600">Role: {om.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Applications */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">
            Pending Applications ({pendingApps.length})
          </h2>

          {pendingApps.length === 0 ? (
            <p className="text-gray-600">No pending applications</p>
          ) : (
            <div className="space-y-4">
              {pendingApps.map((app: any) => (
                <div key={app.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{app.opportunity?.title}</h3>
                      <div className="text-sm text-gray-600">
                        Applicant: {app.volunteer?.full_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        Applied: {new Date(app.applied_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {app.message && (
                    <div className="mb-3">
                      <div className="text-sm font-medium mb-1">Message:</div>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                        {app.message}
                      </p>
                    </div>
                  )}

                  {app.availability && (
                    <div className="mb-3">
                      <div className="text-sm font-medium mb-1">Availability:</div>
                      <p className="text-sm text-gray-700">{app.availability}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveReject(app.id, 'approved')}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => handleApproveReject(app.id, 'rejected')}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
