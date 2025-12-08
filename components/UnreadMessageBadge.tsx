// components/UnreadMessageBadge.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import Link from 'next/link';
import { Mail } from 'lucide-react';

export default function UnreadMessageBadge() {
  const { user } = useUser();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    fetchUnreadCount();

    // Subscribe to new messages
    const subscription = supabase
      .channel('unread_messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'private_messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

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

  if (!user) return null;

  return (
    <Link
      href="/messages"
      className="relative p-2 hover:bg-gray-100 rounded-lg transition"
      title="Messages"
    >
      <Mail className="w-6 h-6 text-gray-700" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
