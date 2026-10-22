// app/marketplace/new/page.tsx
// Post a Buy, Sell & Free listing (signed-in members; goes live straight away for 30 days)
// Version: 1.0.1 - Says rentals stay up for 60 days
// Previous: 1.0.0 (2026-10-20)
// Date: 2026-10-22
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import Footer from '@/components/Footer';
import MarketplaceForm, { emptyMarketplaceForm, marketplaceFormToRow, MarketplaceFormValues } from '@/components/MarketplaceForm';

export default function NewListingPage() {
  const { user, loading } = useUser();
  const router = useRouter();

  const handleSubmit = async (values: MarketplaceFormValues, photos: string[]) => {
    if (!user) return 'Please sign in first.';
    const { data, error } = await supabase
      .from('marketplace_listings')
      .insert({ ...marketplaceFormToRow(values), photos, user_id: user.id })
      .select('id')
      .single();
    if (error || !data) {
      console.error('Error posting listing:', error);
      return 'Sorry, it couldn\'t be posted. Please try again.' + (error?.message ? ` (${error.message})` : '');
    }
    router.push(`/marketplace/${data.id}`);
    return null;
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F6F2EA] text-[#1F2A24]">
      <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-4">
        <Link href="/marketplace" className="inline-flex items-center gap-1 text-sm font-semibold text-gabriola-green mb-3">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Buy, Sell & Free
        </Link>
        <div className="bg-white border border-[#E3DCCF] rounded-2xl p-4 md:p-6">
          <h1 className="font-display text-2xl font-bold text-gabriola-green-dark mb-1">Post a listing</h1>
          <p className="text-sm text-[#5B6660] mb-5">
            It goes live right away and stays up for 30 days (rentals 60). You can renew it, mark it sold or take it down any time.
          </p>

          {loading ? (
            <p className="text-[#5B6660]" role="status">Loading...</p>
          ) : !user ? (
            <div className="space-y-3">
              <p>Please sign in to post a listing.</p>
              <div className="flex gap-2">
                <Link href="/signin" className="inline-flex items-center min-h-[44px] px-4 rounded-lg bg-gabriola-green text-white font-semibold">Sign in</Link>
                <Link href="/signup" className="inline-flex items-center min-h-[44px] px-4 rounded-lg border border-[#CFC6B4] bg-white font-semibold">Sign up free</Link>
              </div>
            </div>
          ) : (
            <MarketplaceForm
              initial={emptyMarketplaceForm()}
              userId={user.id}
              submitLabel="Post it"
              onSubmit={handleSubmit}
              onCancel={() => router.push('/marketplace')}
            />
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
