// Path: components/AuthProvider.tsx
// Version: 2.0.7 - Removed SIGNED_IN retry (getSession + INITIAL_SESSION handle everything)
// Date: 2024-12-09

'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@/lib/types';

type AuthContextType = {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

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
        
        if (session?.user) {
          console.log('🟢 User ID:', session.user.id);
          console.log('🟢 Fetching user profile from users table...');
          
          const startTime = Date.now();
          const { data: userProfile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (!mounted) return;
          
          const elapsed = Date.now() - startTime;
          console.log(`🟢 Profile fetch took ${elapsed}ms`);
          
          if (userProfile) {
            console.log('✅ User loaded:', userProfile.full_name);
            setUser(userProfile);
          } else {
            console.log('❌ No profile found');
            console.error('Profile error:', profileError);
            setUser(null);
          }
        } else {
          console.log('❌ No session');
          setUser(null);
        }
        
        if (mounted) {
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          console.error('💥 Exception in getSession:', err);
          setLoading(false);
        }
      }
    };

    getSession();

    console.log('🟢 Setting up auth state listener...');
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      console.log('🔵 Auth event:', event);
      
      // CRITICAL: Ignore SIGNED_IN events - they fire before profile exists
      // Let getSession and INITIAL_SESSION handle profile loading
      if (event === 'SIGNED_IN') {
        console.log('🔵 SIGNED_IN ignored - getSession will handle profile loading');
        return;
      }
      
      if (session?.user) {
        console.log('🔵 Fetching profile for:', session.user.id);
        
        const startTime = Date.now();
        const { data: userProfile, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (!mounted) return;
        
        const elapsed = Date.now() - startTime;
        console.log(`🔵 Profile fetch took ${elapsed}ms`);
        
        if (userProfile) {
          console.log('✅ Profile loaded:', userProfile.full_name);
          setUser(userProfile);
        } else {
          console.log('❌ No profile found');
          console.error('Error:', error);
          setUser(null);
        }
      } else {
        console.log('🔵 Clearing user');
        setUser(null);
      }
      
      if (mounted) {
        setLoading(false);
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
