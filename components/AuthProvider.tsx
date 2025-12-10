// Path: components/AuthProvider.tsx
// Version: 2.0.3 - Added timeout to each retry attempt for mobile reliability
// Date: 2024-12-09

'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@/lib/types';

type AuthContextType = {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

// Helper to fetch with timeout
async function fetchWithTimeout<T>(promise: Promise<T>, timeoutMs = 5000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    )
  ]);
}

// Helper to poll for profile after signin/signup with timeout on EACH attempt
async function fetchProfileWithRetry(userId: string, maxAttempts = 5, delayMs = 200, attemptTimeoutMs = 3000): Promise<any> {
  console.log(`🔄 Starting profile fetch for ${userId}, max ${maxAttempts} attempts`);
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      console.log(`⏳ Waiting ${delayMs}ms before attempt ${attempt + 1}...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    
    console.log(`🔍 Profile fetch attempt ${attempt + 1}/${maxAttempts} (${attemptTimeoutMs}ms timeout)`);
    
    try {
      // Add timeout to THIS specific attempt
      const result = await fetchWithTimeout(
        supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single(),
        attemptTimeoutMs
      );
      
      const { data, error } = result;
      
      if (error) {
        console.log(`⚠️ Attempt ${attempt + 1} error:`, error.message, error.code);
      }
      
      if (data) {
        console.log(`✅ Profile found on attempt ${attempt + 1}:`, data.full_name);
        return { data, error: null };
      } else {
        console.log(`❌ Attempt ${attempt + 1}: Profile not found yet`);
      }
    } catch (err: any) {
      if (err.message === 'Request timeout') {
        console.log(`⏱️ Attempt ${attempt + 1}: TIMEOUT after ${attemptTimeoutMs}ms`);
        // Continue to next attempt
      } else {
        console.log(`💥 Attempt ${attempt + 1}: Exception:`, err.message);
      }
    }
  }
  
  console.log(`💥 Profile NOT found after ${maxAttempts} attempts`);
  return { data: null, error: new Error('Profile not found after retries') };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false); // Guard against concurrent fetches

  useEffect(() => {
    console.log('🟢 AuthProvider: Initializing...');
    let mounted = true;
    
    const getSession = async () => {
      if (!mounted) return;
      
      try {
        console.log('🟢 AuthProvider: Getting session...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        console.log('🟢 Session:', session ? 'EXISTS' : 'NULL');
        console.log('🟢 Session error:', sessionError);
        
        if (session?.user) {
          console.log('🟢 User ID:', session.user.id);
          console.log('🟢 Fetching user profile from users table...');
          
          try {
            const startTime = Date.now();
            const result = await fetchWithTimeout(
              supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single(),
              5000
            );
            
            if (!mounted) return;
            
            const userProfile = result.data;
            const profileError = result.error;
            
            const elapsed = Date.now() - startTime;
            console.log(`🟢 Profile fetch took ${elapsed}ms`);
            console.log('🟢 Profile data:', userProfile ? 'FOUND' : 'NULL');
            console.log('🟢 Profile error:', profileError);
            
            if (userProfile) {
              console.log('✅ User loaded:', userProfile.full_name);
              setUser(userProfile);
            } else {
              console.log('❌ No profile found!');
              setUser(null);
            }
          } catch (err: any) {
            if (!mounted) return;
            
            if (err.message === 'Request timeout') {
              console.error('⏱️ TIMEOUT fetching profile - retrying once...');
              
              try {
                const result = await fetchWithTimeout(
                  supabase.from('users').select('*').eq('id', session.user.id).single(),
                  5000
                );
                
                if (!mounted) return;
                
                const userProfile = result.data;
                
                if (userProfile) {
                  console.log('✅ Retry successful!');
                  setUser(userProfile);
                } else {
                  console.log('❌ Retry failed - no profile');
                  setUser(null);
                }
              } catch (retryErr) {
                console.error('❌ Retry also timed out');
                setUser(null);
              }
            } else {
              console.error('💥 Error fetching profile:', err);
              setUser(null);
            }
          }
        } else {
          console.log('❌ No session');
          setUser(null);
        }
        
        if (mounted) {
          setLoading(false);
          console.log('🟢 Loading complete');
        }
      } catch (err) {
        if (mounted) {
          console.error('💥 EXCEPTION in getSession:', err);
          setLoading(false);
        }
      }
    };

    getSession();

    console.log('🟢 Setting up auth state listener...');
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      // CRITICAL: Guard against concurrent fetches
      if (fetchingRef.current) {
        console.log(`🔒 Already fetching profile, ignoring ${event} event`);
        return;
      }
      
      try {
        console.log('🔵 Auth event:', event);
        console.log('🔵 Session:', session ? 'EXISTS' : 'NULL');
        
        if (session?.user) {
          console.log('🔵 Fetching profile for:', session.user.id);
          
          // For SIGNED_IN events, use retry logic since profile might not be ready
          if (event === 'SIGNED_IN') {
            console.log('🔄 SIGNED_IN detected - using smart retry...');
            fetchingRef.current = true; // Set guard
            
            try {
              const startTime = Date.now();
              // Use 3 second timeout per attempt for mobile reliability
              const result = await fetchProfileWithRetry(session.user.id, 5, 200, 3000);
              
              const elapsed = Date.now() - startTime;
              console.log(`🔵 Profile fetch took ${elapsed}ms total`);
              
              if (result.data) {
                console.log('🔵 Profile result: FOUND');
                setUser(result.data);
              } else {
                console.log('🔵 Profile result: NOT FOUND after retries');
                console.error('💥 CRITICAL: User signed in but no profile exists!');
                console.error('💥 User ID:', session.user.id);
                console.error('💥 This means the database trigger did not fire or failed');
                setUser(null);
              }
            } finally {
              fetchingRef.current = false; // Always clear guard
            }
            
            if (!mounted) return;
          } else {
            // For other events (INITIAL_SESSION, etc), profile should exist
            fetchingRef.current = true; // Set guard
            
            try {
              const startTime = Date.now();
              const result = await fetchWithTimeout(
                supabase.from('users').select('*').eq('id', session.user.id).single(),
                5000
              );
              
              if (!mounted) return;
              
              const userProfile = result.data;
              const error = result.error;
              
              const elapsed = Date.now() - startTime;
              console.log(`🔵 Profile fetch took ${elapsed}ms`);
              console.log('🔵 Profile result:', userProfile ? 'FOUND' : 'NULL', error);
              
              setUser(userProfile);
            } catch (err: any) {
              if (!mounted) return;
              
              if (err.message === 'Request timeout') {
                console.error('⏱️ TIMEOUT in listener - ignoring');
              } else {
                console.error('💥 Exception in listener:', err);
              }
            } finally {
              fetchingRef.current = false; // Always clear guard
            }
          }
        } else {
          console.log('🔵 Clearing user');
          setUser(null);
        }
        
        if (mounted) {
          setLoading(false);
        }
      } catch (err) {
        fetchingRef.current = false; // Clear guard on error
        
        if (mounted) {
          console.error('💥 EXCEPTION in listener:', err);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      fetchingRef.current = false; // Clear guard on unmount
      console.log('🟢 Cleaning up listener');
      listener.subscription.unsubscribe();
    };
  }, []);

  console.log('🟢 Rendering AuthProvider, user:', user?.full_name || 'NULL', 'loading:', loading);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useUser = () => useContext(AuthContext);
