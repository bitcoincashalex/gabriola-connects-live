// components/Header.tsx
// Updated: 2025-12-11 - Added context-aware search with inline results
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
          () => fetchUnreadCount()
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user, isSuperAdmin]);

  const fetchUnreadCount = async () => {
    if (!user) return;

    const { count } = await supabase
      .from('private_messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('read', false)
      .eq('is_deleted', false);

    setUnreadCount(count || 0);
  };

  const fetchPendingUsersCount = async () => {
    if (!isSuperAdmin) return;

    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_approved', false);

    setPendingUsersCount(count || 0);
  };

  const goHome = () => {
    window.location.href = '/';
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const navItems = [
    { label: 'Home', onClick: goHome },
    { label: 'Events', href: '/events' },
    { label: 'Discussion', href: '/community' },
    { label: 'Directory', href: '/directory/business' },
    { label: 'Ferry', href: '/ferry' },
    { label: 'Alerts', href: '/alerts' },
  ];

  return (
    <header className="bg-gabriola-green text-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <button onClick={goHome} className="flex-shrink-0">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Gabriola Connects</h1>
              <p className="text-xs md:text-sm opacity-90">Your Island Community Hub</p>
            </div>
          </button>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 hover:bg-white/10 rounded"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
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

          {/* User Menu - Desktop */}
          <div className="hidden lg:flex items-center gap-4 relative" ref={menuRef}>
            {user ? (
              <>
                {/* Messages Icon */}
                <Link href="/messages" className="relative p-2 hover:bg-white/10 rounded-full transition-colors">
                  <Mail className="w-6 h-6" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>

                {/* User Dropdown */}
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <User className="w-6 h-6" />
                  <span className="font-medium">{user.username}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 text-gray-700">
                    <Link
                      href="/profile"
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <User className="w-5 h-5" />
                      <span>Profile</span>
                    </Link>

                    <Link
                      href="/messages"
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors relative"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Mail className="w-5 h-5" />
                      <span>Messages</span>
                      {unreadCount > 0 && (
                        <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                          {unreadCount}
                        </span>
                      )}
                    </Link>

                    <Link
                      href="/settings"
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Settings className="w-5 h-5" />
                      <span>Settings</span>
                    </Link>

                    {hasAnyAdminAccess && (
                      <>
                        <div className="border-t border-gray-200 my-2"></div>
                        <Link
                          href="/admin"
                          className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Shield className="w-5 h-5 text-gabriola-green" />
                          <span className="font-medium text-gabriola-green">Admin Panel</span>
                          {isSuperAdmin && pendingUsersCount > 0 && (
                            <span className="ml-auto bg-orange-500 text-white text-xs rounded-full px-2 py-0.5">
                              {pendingUsersCount}
                            </span>
                          )}
                        </Link>
                      </>
                    )}

                    <div className="border-t border-gray-200 my-2"></div>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleSignOut();
                      }}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors w-full text-left text-red-600"
                    >
                      <LogOut className="w-5 h-5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <Link
                href="/signin"
                className="bg-white text-gabriola-green px-6 py-2 rounded-full font-semibold hover:bg-gray-100 transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-4 pb-4 border-t border-white/20 pt-4">
            <nav className="flex flex-col gap-3">
              {navItems.map((item) =>
                item.onClick ? (
                  <button
                    key={item.label}
                    onClick={() => {
                      item.onClick();
                      setMobileMenuOpen(false);
                    }}
                    className="text-left py-2 px-4 hover:bg-white/10 rounded transition-colors"
                  >
                    {item.label}
                  </button>
                ) : (
                  <Link
                    key={item.label}
                    href={item.href!}
                    className="py-2 px-4 hover:bg-white/10 rounded transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                )
              )}

              {user ? (
                <>
                  <div className="border-t border-white/20 my-2"></div>
                  <Link
                    href="/profile"
                    className="flex items-center gap-3 py-2 px-4 hover:bg-white/10 rounded transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User className="w-5 h-5" />
                    <span>Profile</span>
                  </Link>
                  <Link
                    href="/messages"
                    className="flex items-center gap-3 py-2 px-4 hover:bg-white/10 rounded transition-colors relative"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Mail className="w-5 h-5" />
                    <span>Messages</span>
                    {unreadCount > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    href="/settings"
                    className="flex items-center gap-3 py-2 px-4 hover:bg-white/10 rounded transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Settings className="w-5 h-5" />
                    <span>Settings</span>
                  </Link>
                  {hasAnyAdminAccess && (
                    <Link
                      href="/admin"
                      className="flex items-center gap-3 py-2 px-4 hover:bg-white/10 rounded transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Shield className="w-5 h-5" />
                      <span>Admin Panel</span>
                      {isSuperAdmin && pendingUsersCount > 0 && (
                        <span className="ml-auto bg-orange-500 text-white text-xs rounded-full px-2 py-0.5">
                          {pendingUsersCount}
                        </span>
                      )}
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleSignOut();
                    }}
                    className="flex items-center gap-3 py-2 px-4 hover:bg-white/10 rounded transition-colors text-left"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <>
                  <div className="border-t border-white/20 my-2"></div>
                  <Link
                    href="/signin"
                    className="py-2 px-4 bg-white text-gabriola-green rounded font-semibold text-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
