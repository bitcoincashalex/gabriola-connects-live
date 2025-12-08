// components/AuthProvider.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
              Promise.resolve(
                supabase
                  .from('users')
                  .select('*')
                  .eq('id', session.user.id)
                  .single()
              ),
              5000 // 5 second timeout
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
              
              // Retry once
              try {
                const result = await fetchWithTimeout(
                  Promise.resolve(supabase.from('users').select('*').eq('id', session.user.id).single()),
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
      
      try {
        console.log('🔵 Auth event:', event);
        console.log('🔵 Session:', session ? 'EXISTS' : 'NULL');
        
        if (session?.user) {
          console.log('🔵 Fetching profile for:', session.user.id);
          
          try {
            const startTime = Date.now();
            const result = await fetchWithTimeout(
              Promise.resolve(supabase.from('users').select('*').eq('id', session.user.id).single()),
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
            // Don't clear user on timeout - keep existing state
          }
        } else {
          console.log('🔵 Clearing user');
          setUser(null);
        }
        
        if (mounted) {
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          console.error('💥 EXCEPTION in listener:', err);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
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
