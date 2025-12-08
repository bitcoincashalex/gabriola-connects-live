// app/messages/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Mail, Search, Settings, Loader2, Shield, Plus } from 'lucide-react';

interface Conversation {
  id: string;
  other_user_id: string;
  other_user_name: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

export default function MessagesPage() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/signin');
      } else {
        fetchConversations();
      }
    }
  }, [user, authLoading]);

  const fetchConversations = async () => {
    if (!user) return;

    // Get all messages where user is sender or receiver
    const { data: messages } = await supabase
      .from('private_messages')
      .select(`
        *,
        sender:sender_id(id, full_name),
        receiver:receiver_id(id, full_name)
      `)
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (!messages) {
      setLoading(false);
      return;
    }

    // Group by conversation partner
    const convMap = new Map<string, Conversation>();

    messages.forEach((msg: any) => {
      const isReceiver = msg.receiver_id === user.id;
      const otherUserId = isReceiver ? msg.sender_id : msg.receiver_id;
      const otherUserName = isReceiver ? msg.sender?.full_name : msg.receiver?.full_name;

      if (!convMap.has(otherUserId)) {
        convMap.set(otherUserId, {
          id: otherUserId,
          other_user_id: otherUserId,
          other_user_name: otherUserName || 'Unknown User',
          last_message: msg.message,
          last_message_at: msg.created_at,
          unread_count: 0,
        });
      }

      // Count unread messages from this person
      if (isReceiver && !msg.read) {
        convMap.get(otherUserId)!.unread_count++;
      }
    });

    const convList = Array.from(convMap.values()).sort(
      (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
    );

    setConversations(convList);
    setLoading(false);
  };

  const filteredConversations = conversations.filter(conv =>
    conv.other_user_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-gabriola-green animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Mail className="w-8 h-8 text-gabriola-green" />
              <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
            </div>
            <div className="flex gap-3">
              <Link
                href="/messages/new"
                className="flex items-center gap-2 bg-gabriola-green text-white px-4 py-2 rounded-lg font-bold hover:bg-gabriola-green-dark"
              >
                <Plus className="w-5 h-5" />
                New Message
              </Link>
              <Link
                href="/messages/settings"
                className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-200"
              >
                <Settings className="w-5 h-5" />
                Settings
              </Link>
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-gray-700">
                Your messages are private and secure.{' '}
                <Link href="/privacy/messaging" className="text-blue-600 font-bold hover:underline">
                  Learn about our security
                </Link>
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-16">
              <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-700 mb-2">
                {searchQuery ? 'No conversations found' : 'No messages yet'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchQuery ? 'Try a different search' : 'Start a conversation with someone!'}
              </p>
              <Link
                href="/messages/new"
                className="inline-flex items-center gap-2 bg-gabriola-green text-white px-6 py-3 rounded-lg font-bold hover:bg-gabriola-green-dark"
              >
                <Plus className="w-5 h-5" />
                New Message
              </Link>
            </div>
          ) : (
            <div className="divide-y">
              {filteredConversations.map(conv => (
                <Link
                  key={conv.id}
                  href={`/messages/${conv.other_user_id}`}
                  className="block p-6 hover:bg-gray-50 transition group"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 bg-gabriola-green text-white rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0">
                      {conv.other_user_name.charAt(0)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-gray-900 text-lg">
                          {conv.other_user_name}
                        </h3>
                        <span className="text-sm text-gray-500">
                          {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-gray-600 truncate">
                          {conv.last_message}
                        </p>
                        {conv.unread_count > 0 && (
                          <span className="bg-gabriola-green text-white px-2 py-1 rounded-full text-xs font-bold ml-2">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
