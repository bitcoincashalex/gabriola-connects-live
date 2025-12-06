// components/AdminMenu.tsx
'use client';

import Link from 'next/link';
import { useUser } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';

export default function AdminMenu() {
  const { user } = useUser();

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="bg-red-600 text-white rounded-full shadow-2xl">
        <details className="dropdown dropdown-top dropdown-end">
          <summary className="btn btn-circle btn-lg bg-red-600 hover:bg-red-700 border-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </summary>
          <ul className="p-4 menu dropdown-content bg-white rounded-box shadow-2xl text-gray-800 w-64">
            <li><Link href="/community/deleted" className="hover:bg-gray-100">🗑 Deleted Items</Link></li>
            <li><Link href="/admin/users" className="hover:bg-gray-100">👥 Manage Users</Link></li>
            <li><Link href="/admin/badges" className="hover:bg-gray-100">🏅 Award Badges</Link></li>
            <li className="divider my-2"></li>
            <li>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = '/';
                }}
                className="text-red-600 hover:bg-red-50 w-full text-left"
              >
                🚪 Log Out (Admin)
              </button>
            </li>
          </ul>
        </details>
      </div>
    </div>
  );
}