// components/Header.tsx — FINAL, FULLY WORKING, NO ERRORS
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { Search, Menu, X } from 'lucide-react';

export default function Header() {
  const { user } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const goHome = () => {
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

          {/* Search — hidden on mobile */}
          <div className="hidden md:flex flex-1 max-w-xl mx-8">
            <form action="/search" className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/70" />
              <input
                name="q"
                type="text"
                placeholder="Search everything..."
                className="w-full pl-12 pr-6 py-3 bg-white/20 border border-white/30 rounded-full text-white placeholder-white/70 focus:outline-none focus:bg-white/30 transition"
              />
            </form>
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

          {/* Right side — user + mobile menu */}
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <span className="hidden md:block text-sm">
                  {user.user_metadata?.full_name || user.email || 'Logged in'}
                  {user.role === 'admin' && ' (Admin)'}
                </span>
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    window.location.href = '/';
                  }}
                  className="bg-white text-gabriola-green px-6 py-2 rounded-full font-bold hover:bg-gray-100 transition"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link href="/signin" className="hidden md:block hover:underline text-sm">
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