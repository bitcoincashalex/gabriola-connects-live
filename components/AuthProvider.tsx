// components/AuthProvider.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@/lib/types';

type AuthContextType = {
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Fetch full profile
        supabase.from('users').select('*').eq('id', session.user.id).single().then(({ data }) => {
          setUser(data as User);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // Listen for changes
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        supabase.from('users').select('*').eq('id', session.user.id).single().then(({ data }) => {
          setUser(data as User);
        });
      } else {
        setUser(null);
      }
    });

    return () => { listener.subscription.unsubscribe(); };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useUser = () => useContext(AuthContext);