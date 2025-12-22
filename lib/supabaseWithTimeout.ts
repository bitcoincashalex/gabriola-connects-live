// lib/supabaseWithTimeout.ts
// Wrapper to add timeout to Supabase queries
// Prevents widgets from hanging forever on stale auth

import { supabase } from './supabase';

const QUERY_TIMEOUT = 5000; // 5 seconds

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

// Helper to wrap Supabase queries with timeout
export async function queryWithTimeout<T>(
  queryFn: () => Promise<T>,
  timeoutMs: number = QUERY_TIMEOUT
): Promise<T> {
  try {
    return await withTimeout(queryFn(), timeoutMs);
  } catch (error) {
    if (error instanceof Error && error.message === 'Query timeout') {
      console.warn('Supabase query timed out after', timeoutMs, 'ms');
      throw new Error('Request timed out. Please try again.');
    }
    throw error;
  }
}

export { supabase };
