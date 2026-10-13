// app/volunteer/new/page.tsx
// Post a volunteer opportunity (any signed-in member; goes live straight away)
// Version: 1.0.0
// Date: 2026-10-13
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import Footer from '@/components/Footer';
import VolunteerForm, { emptyVolunteerForm, volunteerFormToRow, VolunteerFormValues } from '@/components/VolunteerForm';

export default function NewVolunteerPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (values: VolunteerFormValues) => {
    if (!user) return;
    setSaving(true);
    setError('');
    const { data, error } = await supabase
      .from('volunteer_opportunities')
      .insert({
        ...volunteerFormToRow(values),
        posted_by: user.id,
        status: 'active',
        is_approved: true,
      })
      .select('id')
      .single();

    if (error || !data) {
      console.error('Error posting volunteer opportunity:', error);
      setError('Sorry, it couldn\'t be posted. Please try again.' + (error?.message ? ` (${error.message})` : ''));
      setSaving(false);
      return;
    }
    router.push(`/volunteer/opportunities/${data.id}`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F6F2EA] text-[#1F2A24]">
      <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-4">
        <Link href="/volunteer" className="inline-flex items-center gap-1 text-sm font-semibold text-gabriola-green mb-3">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Volunteer
        </Link>
        <div className="bg-white border border-[#E3DCCF] rounded-2xl p-4 md:p-6">
          <h1 className="font-display text-2xl font-bold text-gabriola-green-dark mb-1">Post a volunteer opportunity</h1>
          <p className="text-sm text-[#5B6660] mb-5">It goes live right away. You'll get a message on Gabriola Connects when someone is interested.</p>

          {loading ? (
            <p className="text-[#5B6660]" role="status">Loading...</p>
          ) : !user ? (
            <div className="space-y-3">
              <p>Please sign in to post an opportunity.</p>
              <Link href="/signin" className="inline-flex items-center min-h-[44px] px-4 rounded-lg bg-gabriola-green text-white font-semibold">Sign in</Link>
            </div>
          ) : (
            <>
              {error && <p className="mb-4 text-sm font-semibold text-[#B42318]" role="alert">{error}</p>}
              <VolunteerForm
                initial={emptyVolunteerForm()}
                submitLabel="Post it"
                saving={saving}
                onSubmit={handleSubmit}
                onCancel={() => router.push('/volunteer')}
              />
            </>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
