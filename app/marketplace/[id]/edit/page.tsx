// app/marketplace/[id]/edit/page.tsx
// Edit a Buy, Sell & Free listing (the seller, or an admin)
// Version: 1.1.0 - The poster of a listing posted without a name can edit it
// Previous: 1.0.0 (2026-10-20)
// Date: 2026-10-22
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import Footer from '@/components/Footer';
import MarketplaceForm, { marketplaceFormFromListing, marketplaceFormToRow, MarketplaceFormValues } from '@/components/MarketplaceForm';
import { LISTING_COLUMNS, Listing, removeListingPhotos } from '@/lib/marketplace';

export default function EditListingPage() {
  const { user, loading: userLoading } = useUser();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [mineAnonymous, setMineAnonymous] = useState(false);

  const isAdmin = !!(user?.is_super_admin || (user as any)?.role === 'admin');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('marketplace_listings').select(LISTING_COLUMNS).eq('id', id).maybeSingle();
      setListing((data as Listing) || null);
      if (user && data && (data as Listing).is_anonymous) {
        const { data: mine } = await supabase.rpc('marketplace_is_my_listing', { p_listing: id });
        setMineAnonymous(mine === true);
      }
      setLoading(false);
    })();
  }, [id, user?.id]);

  const handleSubmit = async (values: MarketplaceFormValues, photos: string[], removed: string[]) => {
    const { error } = await supabase
      .from('marketplace_listings')
      .update({ ...marketplaceFormToRow(values), photos })
      .eq('id', id);
    if (error) {
      console.error('Error saving listing:', error);
      return 'Sorry, the changes couldn\'t be saved. Please try again.';
    }
    if (removed.length) await removeListingPhotos(removed);
    router.push(`/marketplace/${id}`);
    return null;
  };

  const canEdit = !!user && !!listing && (listing.user_id === user.id || mineAnonymous || isAdmin);

  return (
    <div className="flex flex-col min-h-screen bg-[#F6F2EA] text-[#1F2A24]">
      <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-4">
        <Link href={`/marketplace/${id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-gabriola-green mb-3">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to the listing
        </Link>
        <div className="bg-white border border-[#E3DCCF] rounded-2xl p-4 md:p-6">
          <h1 className="font-display text-2xl font-bold text-gabriola-green-dark mb-5">Edit listing</h1>
          {loading || userLoading ? (
            <p className="text-[#5B6660]" role="status">Loading...</p>
          ) : !canEdit || !listing || !user ? (
            <p className="text-[#5B6660]">Only the person who posted this listing can edit it.</p>
          ) : (
            <MarketplaceForm
              initial={marketplaceFormFromListing(listing)}
              userId={user.id}
              submitLabel="Save changes"
              onSubmit={handleSubmit}
              onCancel={() => router.push(`/marketplace/${id}`)}
            />
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
