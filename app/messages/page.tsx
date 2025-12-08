// app/messages/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Search, Settings, Shield, MessageSquare, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function MessagesPage() {
  const { user } = useUser();
  const router = useRouter();
  const [conversations, setConversations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;

    // Get all messages where user is sender or receiver
    const { data: messages } = await supabase
      .from('private_messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (!messages) {
      setLoading(false);
      return;
    }

    // Group by conversation partner
    const conversationMap = new Map();

    for (const msg of messages) {
      const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      
      if (!conversationMap.has(partnerId)) {
        // Fetch partner details
        const { data: partner } = await supabase
          .from('users')
          .select('id, full_name, first_name, avatar_url')
          .eq('id', partnerId)
          .single();

        if (partner) {
          conversationMap.set(partnerId, {
            partner,
            lastMessage: msg,
            unreadCount: 0,
          });
        }
      }

      // Count unread messages
      if (msg.receiver_id === user.id && !msg.read) {
        const conv = conversationMap.get(partnerId);
        if (conv) {
          conv.unreadCount++;
        }
      }
    }

    setConversations(Array.from(conversationMap.values()));
    setLoading(false);
  };

  const filteredConversations = searchQuery
    ? conversations.filter(c => 
        c.partner.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-gabriola-green animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
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
                className="bg-gabriola-green text-white px-6 py-3 rounded-lg font-bold hover:bg-gabriola-green-dark transition"
              >
                + New Message
              </Link>
              <Link
                href="/messages/settings"
                className="bg-gray-100 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-200 transition"
              >
                <Settings className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-900">
              <strong>Private & Secure:</strong> Your messages are encrypted and only visible to you and the recipient.{' '}
              <Link href="/privacy/messaging" className="underline font-bold">
                Learn more
              </Link>
            </div>
          </div>

          {/* Search */}
          <div className="relative mt-6">
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
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Loader2 className="w-12 h-12 text-gabriola-green animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading conversations...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {searchQuery ? 'No conversations found' : 'No messages yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery
                ? `No conversations match "${searchQuery}"`
                : 'Start a conversation with another resident'}
            </p>
            {!searchQuery && (
              <Link
                href="/messages/new"
                className="inline-block bg-gabriola-green text-white px-6 py-3 rounded-lg font-bold hover:bg-gabriola-green-dark transition"
              >
                Send Your First Message
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredConversations.map(conv => (
              <Link
                key={conv.partner.id}
                href={`/messages/${conv.partner.id}`}
                className="block bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition"
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  {conv.partner.avatar_url ? (
                    <img
                      src={conv.partner.avatar_url}
                      alt={conv.partner.full_name}
                      className="w-14 h-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gabriola-green text-white flex items-center justify-center font-bold text-xl">
                      {conv.partner.first_name?.charAt(0) || conv.partner.full_name?.charAt(0) || '?'}
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-gray-900 text-lg">
                        {conv.partner.full_name}
                      </h3>
                      <span className="text-sm text-gray-500">
                        {format(new Date(conv.lastMessage.created_at), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
                      {conv.lastMessage.sender_id === user.id && 'You: '}
                      {conv.lastMessage.message}
                    </p>
                  </div>

                  {/* Unread Badge */}
                  {conv.unreadCount > 0 && (
                    <div className="bg-gabriola-green text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                      {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
