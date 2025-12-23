// lib/supabaseWithTimeout.ts
// Wrapper to add timeout to Supabase queries
// Prevents widgets from hanging forever on stale auth
// Version: 1.1.0 - Added retry logic + reduced timeout to 3s
// Date: 2025-12-22

import { supabase } from './supabase';

const QUERY_TIMEOUT = 3000; // REDUCED from 5000 to 3000ms

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

// BULLETPROOF FIX: Helper to wrap Supabase queries with timeout + retry + session clear
export async function queryWithTimeout<T>(
  queryFn: () => Promise<T>,
  timeoutMs: number = QUERY_TIMEOUT
): Promise<T> {
  let attempt = 0;
  const maxAttempts = 2; // Try twice
  
  while (attempt < maxAttempts) {
    attempt++;
    
    try {
      const result = await withTimeout(queryFn(), timeoutMs);
      return result; // Success!
      
    } catch (error) {
      const isTimeout = error instanceof Error && error.message === 'Query timeout';
      
      if (isTimeout) {
        console.warn(`Supabase query timed out after ${timeoutMs}ms (attempt ${attempt}/${maxAttempts})`);
        
        // If we have retries left, clear session and try again
        if (attempt < maxAttempts) {
          console.warn('⚠️ Clearing potentially stale session and retrying...');
          
          try {
            await supabase.auth.signOut({ scope: 'local' });
          } catch (signOutError) {
            console.error('Error clearing session:', signOutError);
          }
          
          // Wait 500ms before retry
          await new Promise(resolve => setTimeout(resolve, 500));
          continue; // Retry
        }
        
        // No more retries
        throw new Error('Request timed out. Please try again.');
      }
      
      // Different error - throw it
      throw error;
    }
  }
  
  // Should never reach here
  throw new Error('Query failed after all retry attempts');
}

export { supabase };
