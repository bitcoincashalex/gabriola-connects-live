// Path: app/auth/callback/page.tsx
// Version: 1.1.0 - Gives up after 20 seconds with a clear message instead of spinning forever
// Previous: 1.0.0 - Google (OAuth) sign in landing page
// Date: 2026-10-10
// Purpose: Google sends the user back here after sign in. The Supabase client
//          picks the session up from the URL automatically (detectSessionInUrl).
//          This page then checks the user's profile exists (created by the
//          handle_new_user trigger), blocks banned users, and sends them home.

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, AlertCircle } from 'lucide-react';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const GIVE_UP_MS = 20000;

function backToSignIn(message: string) {
  window.location.href = '/signin?error=' + encodeURIComponent(message);
}

export default function AuthCallbackPage() {
  const [status, setStatus] = useState('Signing you in...');
  const [failed, setFailed] = useState('');

  useEffect(() => {
    const giveUp = setTimeout(() => {
      setFailed('Signing in is taking too long. Close any other Gabriola Connects tabs, then try Continue with Google again.');
    }, GIVE_UP_MS);

    const finish = async () => {
      // Google or Supabase can send an error back (e.g. user pressed Cancel)
      const query = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const oauthError = query.get('error_description') || hash.get('error_description')
        || query.get('error') || hash.get('error');
      if (oauthError) {
        backToSignIn('Google sign in did not complete: ' + oauthError.replace(/\+/g, ' '));
        return;
      }

      // getSession waits for the client to finish reading the tokens from the URL
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.user) {
        backToSignIn('Google sign in did not complete. Please try again.');
        return;
      }

      // Profile row is created by the database trigger. Give it a moment if needed.
      setStatus('Loading your profile...');
      let profile: { id: string; full_name: string | null; is_banned: boolean | null; created_at: string } | null = null;
      for (let attempt = 0; attempt < 5 && !profile; attempt++) {
        const { data } = await supabase
          .from('users')
          .select('id, full_name, is_banned, created_at')
          .eq('id', session.user.id)
          .maybeSingle();
        profile = data;
        if (!profile) await sleep(800);
      }

      if (!profile) {
        await supabase.auth.signOut({ scope: 'local' });
        setFailed('Your Google sign in worked, but your Gabriola Connects profile could not be created. Please contact the site admin.');
        return;
      }

      if (profile.is_banned) {
        await supabase.auth.signOut({ scope: 'local' });
        backToSignIn('Your account has been banned.');
        return;
      }

      // Brand new account (created in the last 2 minutes) - same welcome flags as email sign up
      const isNew = Date.now() - new Date(profile.created_at).getTime() < 2 * 60 * 1000;
      if (isNew) {
        sessionStorage.setItem('justSignedUp', 'true');
        sessionStorage.setItem('newUserName', profile.full_name || '');
      }

      // Full page load so AuthProvider picks up the signed in user
      clearTimeout(giveUp);
      window.location.href = '/';
    };

    finish().catch(err => {
      clearTimeout(giveUp);
      console.error('[auth/callback]', err);
      setFailed('Something went wrong finishing your Google sign in. Please try again.');
    });
    return () => clearTimeout(giveUp);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gabriola-sand/30 via-white to-gabriola-green/10 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {failed ? (
          <>
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-700 font-medium mb-6">{failed}</p>
            <a href="/signin" className="text-gabriola-green font-bold hover:underline">Back to Sign In</a>
          </>
        ) : (
          <>
            <Loader2 className="w-12 h-12 text-gabriola-green animate-spin mx-auto mb-4" />
            <p className="text-gray-700 text-lg">{status}</p>
          </>
        )}
      </div>
    </div>
  );
}
