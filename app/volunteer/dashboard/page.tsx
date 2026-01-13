// app/volunteer/dashboard/page.tsx
// Version: 1.0.5 - Clean rebuild with verified syntax
// Date: 2025-01-13
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import Footer from '@/components/Footer';

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
    const { data: orgData } = await supabase
      .from('organization_members')
      .select('*, organization:volunteer_organizations(*)')
      .eq('user_id', user?.id);

    setOrganizations(orgData || []);

    if (orgData && orgData.length > 0) {
      const orgIds = orgData.map((om: any) => om.organization_id);
      
      const { data: appData } = await supabase
        .from('volunteer_applications')
        .select('*, opportunity:volunteer_opportunities(title), user:users(full_name, email)')
        .in('opportunity.organization_id', orgIds)
        .order('created_at', { ascending: false });

      setApplications(appData || []);
    }

    setLoading(false);
  };

  const handleApplication = async (appId: string, newStatus: string) => {
    const { error } = await supabase
      .from('volunteer_applications')
      .update({
        status: newStatus,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id
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
    return (
      <div className="flex flex-col min-h-screen">
        <div className="flex-1 bg-gabriola-sand p-8">Loading...</div>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="flex-1 bg-gabriola-sand p-8">Please log in</div>
        <Footer />
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="flex-1 bg-gabriola-sand p-8">
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
        <Footer />
      </div>
    );
  }

  const pendingApps = applications.filter(a => a.status === 'pending');

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 bg-gabriola-sand p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Volunteer Dashboard</h1>

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

          <div className="bg-white rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">
              Pending Applications ({pendingApps.length})
            </h2>
            
            {pendingApps.length === 0 ? (
              <p className="text-gray-600">No pending applications</p>
            ) : (
              <div className="space-y-4">
                {pendingApps.map((app: any) => (
                  <div key={app.id} className="border p-4 rounded">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold">{app.user?.full_name}</h3>
                        <p className="text-sm text-gray-600">{app.user?.email}</p>
                      </div>
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        Pending
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">
                      Opportunity: {app.opportunity?.title}
                    </p>
                    <p className="text-sm text-gray-700 mb-2">
                      Message: {app.message}
                    </p>
                    {app.relevant_experience && (
                      <p className="text-sm text-gray-700 mb-3">
                        Experience: {app.relevant_experience}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApplication(app.id, 'approved')}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => handleApplication(app.id, 'rejected')}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
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
      <Footer />
    </div>
  );
}
