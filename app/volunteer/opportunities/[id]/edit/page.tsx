// app/volunteer/opportunities/[id]/edit/page.tsx
// Edit a volunteer listing (the poster, or a volunteer/super admin)
// Version: 1.0.0
// Date: 2026-10-13
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import Footer from '@/components/Footer';
import VolunteerForm, { volunteerFormFromListing, volunteerFormToRow, VolunteerFormValues } from '@/components/VolunteerForm';
import { LISTING_COLUMNS, VolunteerListing } from '@/lib/volunteer';

export default function EditVolunteerPage() {
  const { user, loading: userLoading } = useUser();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [listing, setListing] = useState<VolunteerListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = !!(user?.is_super_admin || (user as any)?.admin_volunteer);
  const canEdit = !!user && !!listing && (listing.posted_by === user.id || isAdmin);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('volunteer_opportunities').select(LISTING_COLUMNS).eq('id', id).maybeSingle();
      setListing((data as VolunteerListing) || null);
      setLoading(false);
    })();
  }, [id]);

  const handleSubmit = async (values: VolunteerFormValues) => {
    setSaving(true);
    setError('');
    const { data, error } = await supabase
      .from('volunteer_opportunities')
      .update(volunteerFormToRow(values))
      .eq('id', id)
      .select('id');
    if (error || !data?.length) {
      console.error('Error saving volunteer listing:', error);
      setError('Sorry, the changes couldn\'t be saved.' + (error?.message ? ` (${error.message})` : ''));
      setSaving(false);
      return;
    }
    router.push(`/volunteer/opportunities/${id}`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F6F2EA] text-[#1F2A24]">
      <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-4">
        <Link href={`/volunteer/opportunities/${id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-gabriola-green mb-3">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to the listing
        </Link>
        <div className="bg-white border border-[#E3DCCF] rounded-2xl p-4 md:p-6">
          <h1 className="font-display text-2xl font-bold text-gabriola-green-dark mb-5">Edit volunteer listing</h1>
          {loading || userLoading ? (
            <p className="text-[#5B6660]" role="status">Loading...</p>
          ) : !listing ? (
            <p>Listing not found.</p>
          ) : !canEdit ? (
            <p>Only the person who posted this listing can edit it.</p>
          ) : (
            <>
              {error && <p className="mb-4 text-sm font-semibold text-[#B42318]" role="alert">{error}</p>}
              <VolunteerForm
                initial={volunteerFormFromListing(listing)}
                submitLabel="Save changes"
                saving={saving}
                onSubmit={handleSubmit}
                onCancel={() => router.push(`/volunteer/opportunities/${id}`)}
              />
            </>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
