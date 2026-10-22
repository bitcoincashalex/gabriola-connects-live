// components/ClaimBusiness.tsx
// "Is this your business?" at the bottom of a business's details. A signed-in member can ask to
// be connected to a business that has no owner yet; a directory admin approves it at
// /admin/directory/claims, and then the member can edit the listing.
// Version: 1.0.0
// Date: 2026-10-22
// Needs sql/2026-10-22-directory-claims.sql
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';

type Status = 'loading' | 'signed_out' | 'owner' | 'owned' | 'pending' | 'none' | 'error';

export default function ClaimBusiness({ businessId, businessName }: { businessId: string; businessName: string }) {
  const { user } = useUser();
  const [status, setStatus] = useState<Status>('loading');
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setOpen(false);
    setError('');
    (async () => {
      const { data, error } = await supabase.rpc('directory_claim_status', { p_business: businessId });
      if (cancelled) return;
      if (error) {
        console.error('[ClaimBusiness] status:', error.message);
        setStatus('error');
      } else {
        setStatus((data as Status) || 'none');
      }
    })();
    return () => { cancelled = true; };
  }, [businessId, user?.id]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');
    const { data, error } = await supabase.rpc('claim_directory_business', { p_business: businessId, p_note: note });
    if (error) {
      console.error('[ClaimBusiness] claim:', error.message);
      setError('Sorry, that didn\'t go through. Please try again.');
    } else {
      setStatus((data as Status) || 'pending');
      setOpen(false);
    }
    setSending(false);
  };

  // Nothing to offer: still loading, someone else owns it, or it couldn't be checked
  if (status === 'loading' || status === 'owned' || status === 'error') return null;

  return (
    <div className="mt-6 pt-4 border-t border-gray-200">
      {status === 'owner' ? (
        <p className="text-sm text-gray-700">
          This is your listing. Tap the pencil next to it in the Directory to update it.
        </p>
      ) : status === 'pending' ? (
        <p className="text-sm text-gray-700" role="status">
          Thanks, your request to edit {businessName} has been sent. You&apos;ll get a message in your inbox once it&apos;s approved.
        </p>
      ) : status === 'signed_out' ? (
        <p className="text-sm text-gray-700">
          <span className="font-semibold">Is this your business?</span>{' '}
          <Link href="/signin" className="font-semibold text-gabriola-green hover:underline">Sign in</Link>{' '}
          to ask to be connected to it, so you can keep the listing up to date.
        </p>
      ) : !open ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-gray-700 font-semibold">Is this your business?</span>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="min-h-[44px] px-4 rounded-lg border-2 border-gabriola-green text-gabriola-green text-sm font-semibold hover:bg-[#E6EFE8]"
          >
            Ask to edit this listing
          </button>
        </div>
      ) : (
        <form onSubmit={send} className="space-y-2">
          <label htmlFor={`claim-note-${businessId}`} className="block text-sm font-semibold text-gray-800">
            Is this your business? Tell us how you&apos;re connected to {businessName}
          </label>
          <textarea
            id={`claim-note-${businessId}`}
            value={note}
            onChange={e => setNote(e.target.value)}
            maxLength={500}
            placeholder="For example: I'm the owner, you can reach me at the shop or 250-..."
            className="w-full min-h-[80px] px-3 py-2 rounded-lg border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-gabriola-green"
          />
          <p className="text-xs text-gray-600">An admin checks every request before you can edit the listing.</p>
          {error && <p className="text-sm font-semibold text-red-700" role="alert">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={sending}
              className="min-h-[44px] px-5 rounded-lg bg-gabriola-green text-white text-sm font-semibold hover:bg-gabriola-green-dark disabled:opacity-60"
            >
              {sending ? 'Sending...' : 'Send request'}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="min-h-[44px] px-4 rounded-lg border border-gray-300 text-sm font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
