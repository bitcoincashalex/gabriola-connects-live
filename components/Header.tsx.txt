// components/Header.tsx
// Version: 2.0.0 - Added debugging for real-time message notifications
// Date: 2024-12-13
'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { Menu, X, User, Mail, Settings, Shield, LogOut, ChevronDown } from 'lucide-react';
import HeaderSearch from './HeaderSearch';

export default function Header() {
  const { user } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingUsersCount, setPendingUsersCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const isSuperAdmin = user?.is_super_admin;
  const isForumAdmin = (user as any)?.admin_forum;
  const isEventAdmin = (user as any)?.admin_events;
  const isDirectoryAdmin = (user as any)?.admin_directory;
  const hasAnyAdminAccess = isSuperAdmin || isForumAdmin || isEventAdmin || isDirectoryAdmin;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch unread message count
  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      
      // Fetch pending users count for super admin
      if (isSuperAdmin) {
        fetchPendingUsersCount();
      }
      
      // Subscribe to new messages
      const subscription = supabase
        .channel('unread_messages_header')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'private_messages',
            filter: `receiver_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('🔔 [Header] Real-time message event:', payload.eventType);
            console.log('🔔 [Header] Message data:', payload.new);
            fetchUnreadCount();
          }
        )
        .subscribe((status) => {
          console.log('🔔 [Header] Subscription status:', status);
        });

      // Subscribe to new user signups (super admin only)
      let userSubscription: any = null;
      if (isSuperAdmin) {
        userSubscription = supabase
          .channel('new_users_header')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'users',
            },
            () => fetchPendingUsersCount()
          )
          .subscribe();
      }

      return () => {
        subscription.unsubscribe();
        if (userSubscription) {
          userSubscription.unsubscribe();
        }
      };
    }
  }, [user, isSuperAdmin]);

  const fetchUnreadCount = async () => {
    if (!user) return;

    console.log('🔔 [Header] Fetching unread count for user:', user.id);

    const { count, error } = await supabase
      .from('private_messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('read', false)
      .eq('is_deleted', false);

    console.log('🔔 [Header] Unread count:', count, 'Error:', error);

    setUnreadCount(count || 0);
  };

  const fetchPendingUsersCount = async () => {
    if (!user?.is_super_admin) return;

    // Get users from last 7 days who aren't verified residents
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString())
      .eq('is_resident', false);

    setPendingUsersCount(count || 0);
  };

  const goHome = () => {
    window.location.href = '/';
  };

  const navItems = [
    { label: 'Home', onClick: goHome },
    { label: 'Events', href: '/events' },
    { label: 'Discussion', href: '/community' },
    { label: 'Ferry', href: '/ferry' },
    { label: 'Directory', href: '/directory/business' },
    { label: 'Alerts', href: '/alerts' },
  ];

  return (
    <header className="bg-gabriola-green text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-20">

          {/* Logo */}
          <button onClick={goHome} className="flex items-center gap-3 hover:opacity-90 transition">
            <div className="text-left">
              <h1 className="text-xl md:text-3xl font-bold leading-tight">
                Gabriola Connects
              </h1>
              <p className="text-xs md:text-sm opacity-90">Your Island Community Hub</p>
            </div>
          </button>

          {/* Search — hidden on mobile - NOW CONTEXT-AWARE! */}
          <div className="hidden md:flex flex-1 max-w-xl mx-8">
            <HeaderSearch />
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-8 text-lg">
            {navItems.map((item) =>
              item.onClick ? (
                <button key={item.label} onClick={item.onClick} className="hover:underline">
                  {item.label}
                </button>
              ) : (
                <Link key={item.label} href={item.href!} className="hover:underline">
                  {item.label}
                </Link>
              )
            )}
          </nav>

          {/* Right side — user menu or sign in */}
          <div className="flex items-center gap-4">
            {user ? (
              <div className="relative" ref={menuRef}>
                {/* User Menu Button */}
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full transition"
                >
                  <User className="w-5 h-5" />
                  <span className="hidden md:block">
                    {(user as any).full_name || user.email?.split('@')[0] || 'User'}
                  </span>
                  {unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                  <ChevronDown className={`w-4 h-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl py-2 text-gray-800">
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-gray-200">
                      <p className="font-bold text-gray-900">
                        {(user as any).full_name || 'User'}
                      </p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {(user as any).user_role || 'member'}
                      </p>
                    </div>

                    {/* Menu items */}
                    <Link
                      href={`/profile/${user.id}`}
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition"
                    >
                      <User className="w-5 h-5 text-gray-600" />
                      <span>My Profile</span>
                    </Link>

                    <Link
                      href="/messages"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition"
                    >
                      <Mail className="w-5 h-5 text-gray-600" />
                      <span>Messages</span>
                      {unreadCount > 0 && (
                        <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full px-2 py-1">
                          {unreadCount}
                        </span>
                      )}
                    </Link>

                    <Link
                      href="/profile/edit"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition"
                    >
                      <Settings className="w-5 h-5 text-gray-600" />
                      <span>Settings</span>
                    </Link>

                    {/* Admin section - Only show if user has ANY admin access */}
                    {hasAnyAdminAccess && (
                      <>
                        <div className="border-t border-gray-200 my-2"></div>
                        <div className="px-4 py-2">
                          <p className="text-xs font-bold text-gray-500 uppercase">Admin</p>
                        </div>
                        
                        {/* New User Signups - SUPER ADMIN ONLY */}
                        {isSuperAdmin && (
                          <Link
                            href="/admin/new-users"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-orange-50 transition text-orange-700"
                          >
                            <Shield className="w-5 h-5" />
                            <span className="font-bold">New User Signups</span>
                            {pendingUsersCount > 0 && (
                              <span className="ml-auto bg-orange-500 text-white text-xs font-bold rounded-full px-2 py-1">
                                {pendingUsersCount}
                              </span>
                            )}
                          </Link>
                        )}
                        
                        {/* User Management - SUPER ADMIN ONLY */}
                        {isSuperAdmin && (
                          <Link
                            href="/admin/users"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition text-red-700"
                          >
                            <Shield className="w-5 h-5" />
                            <span>User Management</span>
                          </Link>
                        )}
                        
                        {/* Forum Admin - Super Admin, Forum Admin, or Forum Moderator */}
                        {((user as any).is_super_admin || (user as any).admin_forum || (user as any).forum_moderator) && (
                          <Link
                            href="/admin/forum"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition text-red-700"
                          >
                            <Shield className="w-5 h-5" />
                            <span>Forum Admin</span>
                          </Link>
                        )}
                        
                        {/* Event Management - Event Admin or Super Admin */}
                        {(isEventAdmin || isSuperAdmin) && (
                          <Link
                            href="/admin/events"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition text-red-700"
                          >
                            <Shield className="w-5 h-5" />
                            <span>Event Management</span>
                          </Link>
                        )}
                        
                        {/* Directory Management - Directory Admin or Super Admin */}
                        {(isDirectoryAdmin || isSuperAdmin) && (
                          <Link
                            href="/admin/directory"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition text-red-700"
                          >
                            <Shield className="w-5 h-5" />
                            <span>Directory Management</span>
                          </Link>
                        )}
                      </>
                    )}

                    <div className="border-t border-gray-200 my-2"></div>

                    <button
                      onClick={async () => {
                        await supabase.auth.signOut();
                        setUserMenuOpen(false);
                        window.location.href = '/';
                      }}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition w-full text-left text-red-600"
                    >
                      <LogOut className="w-5 h-5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/signin"
                className="bg-white text-gabriola-green px-6 py-2 rounded-full font-bold hover:bg-gray-100 transition"
              >
                Sign In
              </Link>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2"
            >
              {mobileMenuOpen ? <X className="w-8 h-8" /> : <Menu className="w-8 h-8" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-white/20">
            <nav className="py-4 space-y-3 text-center text-lg">
              {navItems.map((item) =>
                item.onClick ? (
                  <button
                    key={item.label}
                    onClick={() => {
                      item.onClick();
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full py-3 hover:bg-white/10"
                  >
                    {item.label}
                  </button>
                ) : (
                  <Link
                    key={item.label}
                    href={item.href!}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full py-3 hover:bg-white/10"
                  >
                    {item.label}
                  </Link>
                )
              )}

              {user && (
                <>
                  <Link
                    href={`/profile/${user.id}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full py-3 hover:bg-white/10"
                  >
                    My Profile
                  </Link>
                  <Link
                    href="/messages"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full py-3 hover:bg-white/10 relative"
                  >
                    Messages {unreadCount > 0 && `(${unreadCount})`}
                  </Link>
                  <Link
                    href="/profile/edit"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full py-3 hover:bg-white/10"
                  >
                    Settings
                  </Link>
                  {hasAnyAdminAccess && (
                    <Link
                      href="/admin/users"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block w-full py-3 hover:bg-white/10 text-red-300 font-bold"
                    >
                      Admin Panel
                    </Link>
                  )}
                </>
              )}

              {user ? (
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    window.location.href = '/';
                  }}
                  className="block w-full py-3 text-red-300 hover:bg-white/10"
                >
                  Sign Out
                </button>
              ) : (
                <Link href="/signin" onClick={() => setMobileMenuOpen(false)} className="block w-full py-3 hover:bg-white/10">
                  Sign In
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
