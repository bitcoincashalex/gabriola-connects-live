// lib/supabaseWithTimeout.ts
// Supabase client + timeout helper for the public front page widgets
// Version: 2.0.0 - 2026-10-09
//   - Widgets now use their own public (signed-out) client. Their data is public,
//     so they no longer wait in line behind the login session check/refresh.
//     That queue is what made the front page hang on first load.
//   - REMOVED signing the user out on timeout. It logged people out whenever the
//     network was slow and made the hang worse (lock errors, SIGNED_OUT storms).
//   - Timeout raised from 3s to 8s per attempt, still 2 attempts.
// Previous: 1.1.0 - Added retry logic + reduced timeout to 3s (2025-12-22)

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Public client for public data: no session, no token refresh, no auth lock.
// Separate storageKey so it never touches the signed-in user's session.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'sb-public-widgets',
  },
});

const QUERY_TIMEOUT = 8000;

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = QUERY_TIMEOUT
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
    ),
  ]);
}

// Run a query with a timeout, retrying once if it times out.
export async function queryWithTimeout<T>(
  queryFn: () => Promise<T>,
  timeoutMs: number = QUERY_TIMEOUT
): Promise<T> {
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await withTimeout(queryFn(), timeoutMs);
    } catch (error) {
      const isTimeout = error instanceof Error && error.message === 'Query timeout';
      if (!isTimeout) throw error;

      console.warn(`Supabase query timed out after ${timeoutMs}ms (attempt ${attempt}/${maxAttempts})`);
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  throw new Error('Request timed out. Please try again.');
}
