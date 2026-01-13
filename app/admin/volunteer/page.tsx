// app/admin/volunteer/page.tsx
// Version: 1.0.5 - Clean rebuild with verified syntax
// Date: 2025-01-13
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import Footer from '@/components/Footer';

export default function AdminVolunteerPage() {
  const { user } = useUser();
  const [pendingOpps, setPendingOpps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPending();
  }, []);

  const loadPending = async () => {
    const { data } = await supabase
      .from('volunteer_opportunities')
      .select('*, organization:volunteer_organizations(*)')
      .eq('is_approved', false)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    setPendingOpps(data || []);
    setLoading(false);
  };

  const handleApprove = async (id: string) => {
    const { error } = await supabase
      .from('volunteer_opportunities')
      .update({ 
        is_approved: true,
        approved_at: new Date().toISOString() 
      })
      .eq('id', id);
    
    if (!error) {
      alert('Opportunity approved!');
      loadPending();
    } else {
      alert('Error: ' + error.message);
    }
  };

  const handleReject = async (id: string) => {
    const { error } = await supabase
      .from('volunteer_opportunities')
      .update({ status: 'cancelled' })
      .eq('id', id);
    
    if (!error) {
      alert('Opportunity rejected');
      loadPending();
    } else {
      alert('Error: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="flex-1 p-8">Loading...</div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-6">Volunteer Admin</h1>
        
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">
            Pending Approval ({pendingOpps.length})
          </h2>
          
          {pendingOpps.length === 0 ? (
            <p className="text-gray-600">No pending opportunities</p>
          ) : (
            <div className="space-y-4">
              {pendingOpps.map((opp: any) => (
                <div key={opp.id} className="border p-4 rounded">
                  <h3 className="font-bold text-lg mb-2">{opp.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Organization: {opp.organization?.name}
                  </p>
                  <p className="text-sm text-gray-700 mb-3">
                    {opp.description?.slice(0, 200)}...
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(opp.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => handleReject(opp.id)}
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
      <Footer />
    </div>
  );
}
