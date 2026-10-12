// Path: components/AuthProvider.tsx
// Version: 3.3.0 - Fixed pages getting stuck on "Loading..." until refreshed. The sign-in listener
//                  waited on a database query inside Supabase's own sign-in lock; when the login
//                  token refreshed in the background, every other query on the page waited behind
//                  it forever. The profile now loads just after the listener returns, and a token
//                  refresh no longer reloads the profile at all.
// Previous: 3.2.0 - BULLETPROOF FIX: Detect and clear stale sessions on load
// Date: 2026-10-11

'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@/lib/types';

type AuthContextType = {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

// Helper to detect stale sessions (>7 days old or invalid)
function isSessionStale(session: any): boolean {
  if (!session?.expires_at) return true;
  
  const expiresAt = new Date(session.expires_at * 1000); // Convert to milliseconds
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  // Session is stale if it expires in the past or was created more than 7 days ago
  return expiresAt < now || expiresAt < sevenDaysAgo;
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
        
        // BULLETPROOF FIX PART 1: Detect and clear stale sessions
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        // If session error or session is stale (>7 days old), clear it
        if (sessionError || (session && isSessionStale(session))) {
          console.warn('⚠️ Stale or invalid session detected - clearing...');
          await supabase.auth.signOut({ scope: 'local' });
          if (!mounted) return;
          setUser(null);
          setLoading(false);
          return;
        }
        
        if (!mounted) return;
        
        console.log('🟢 Session:', session ? 'EXISTS' : 'NULL');
        
        if (session?.user) {
          console.log('🟢 User ID:', session.user.id);
          console.log('🟢 Fetching user profile from users table...');
          
          const startTime = Date.now();
          const { data: userProfile, error: profileError } = await supabase
            .from('users')
            .select(`
              id,
              email,
              full_name,
              username,
              avatar_url,
              bio,
              postal_code,
              phone_number,
              is_super_admin,
              is_banned,
              account_locked,
              forum_read_only,
              admin_events,
              admin_bbs,
              admin_forum,
              admin_directory,
              admin_alerts,
              admin_ferry,
              admin_users,
              can_post,
              can_comment,
              can_create_events,
              can_issue_alerts,
              can_rsvp,
              can_moderate_events,
              can_edit_directory,
              can_send_messages,
              can_receive_messages,
              alert_level_permission,
              alert_organization,
              is_resident,
              is_fire,
              is_police,
              is_medic,
              is_coast_guard,
              forum_moderator,
              role,
              posts_count,
              events_created_count,
              email_notifications,
              created_at,
              last_sign_in_at,
              last_activity_at
            `)
            .eq('id', session.user.id)
            .single();
          
          if (!mounted) return;
          
          const elapsed = Date.now() - startTime;
          console.log(`🟢 Profile fetch took ${elapsed}ms`);
          
          if (userProfile) {
            console.log('✅ User loaded:', userProfile.full_name);
            setUser(userProfile as User);
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
    // IMPORTANT: this callback must not await any Supabase call. Supabase holds its sign-in lock
    // while it runs, so a query here can lock up every other query on the page. The profile
    // load is deferred with setTimeout so it runs after the lock is released.
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      
      console.log('🔵 Auth event:', event);
      
      // CRITICAL: Ignore SIGNED_IN events - they fire before profile exists
      // Let getSession and INITIAL_SESSION handle profile loading
      if (event === 'SIGNED_IN') {
        console.log('🔵 SIGNED_IN ignored - getSession will handle profile loading');
        return;
      }

      // A background token refresh doesn't change who is signed in, so keep the profile we have
      if (event === 'TOKEN_REFRESHED') {
        return;
      }

      setTimeout(async () => {
      if (!mounted) return;
      if (session?.user) {
        console.log('🔵 Fetching profile for:', session.user.id);
        
        const startTime = Date.now();
        const { data: userProfile, error } = await supabase
          .from('users')
          .select(`
            id,
            email,
            full_name,
            username,
            avatar_url,
            bio,
            postal_code,
            phone_number,
            is_super_admin,
            is_banned,
            account_locked,
            forum_read_only,
            admin_events,
            admin_bbs,
            admin_forum,
            admin_directory,
            admin_alerts,
            admin_ferry,
            admin_users,
            can_post,
            can_comment,
            can_create_events,
            can_issue_alerts,
            can_rsvp,
            can_moderate_events,
            can_edit_directory,
            can_send_messages,
            can_receive_messages,
            alert_level_permission,
            alert_organization,
            is_resident,
            is_fire,
            is_police,
            is_medic,
            is_coast_guard,
            forum_moderator,
            role,
            posts_count,
            events_created_count,
            email_notifications,
            created_at,
            last_sign_in_at,
            last_activity_at
          `)
          .eq('id', session.user.id)
          .single();
        
        if (!mounted) return;
        
        const elapsed = Date.now() - startTime;
        console.log(`🔵 Profile fetch took ${elapsed}ms`);
        
        if (userProfile) {
          console.log('✅ Profile loaded:', userProfile.full_name);
          setUser(userProfile as User);
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
      }, 0);
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
