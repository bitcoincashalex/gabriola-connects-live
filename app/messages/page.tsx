// app/messages/page.tsx — FIXED: no more 'user is possibly null' error
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { Mail, Send, ArrowLeft } from 'lucide-react';

export default function MessagesPage() {
  const { user } = useUser();
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    if (!user?.id) return;

    const fetchConversations = async () => {
      const { data } = await supabase
        .from('private_messages')
        .select('*, sender:auth.users!sender_id(username,full_name), receiver:auth.users!receiver_id(username,full_name)')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      setMessages(data || []);
    };

    fetchConversations();

    // Real-time subscription
    const channel = supabase
      .channel('messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'private_messages' }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    await supabase.from('private_messages').insert({
      receiver_id: selectedConversation,
      message: newMessage.trim(),
    });

    setNewMessage('');
  };

  // Group messages by conversation
  const conversations = messages.reduce((acc, msg) => {
    const otherId = msg.sender_id === user?.id ? msg.receiver_id : msg.sender_id;
    if (!acc[otherId]) {
      acc[otherId] = {
        user: msg.sender_id === user?.id ? msg.receiver : msg.sender,
        lastMessage: msg,
        unread: msg.receiver_id === user?.id && !msg.read,
      };
    }
    return acc;
  }, {} as Record<string, any>);

  const currentConvo = selectedConversation
    ? messages.filter(m =>
        (m.sender_id === user?.id && m.receiver_id === selectedConversation) ||
        (m.receiver_id === user?.id && m.sender_id === selectedConversation)
      )
    : [];

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center py-32">
        <p className="text-2xl text-gray-600">Sign in to view messages</p>
        <Link href="/signin" className="text-gabriola-green underline">Sign In</Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 h-screen flex flex-col md:flex-row gap-4">
      {/* Conversations List */}
      <div className="w-full md:w-80 bg-white rounded-2xl shadow-lg p-4">
        <h2 className="text-2xl font-bold mb-4">Messages</h2>
        {Object.values(conversations).length === 0 ? (
          <p className="text-gray-500 text-center py-8">No messages yet</p>
        ) : (
          <div className="space-y-2">
            {Object.values(conversations).map((convo: any) => (
              <button
                key={convo.user.id}
                onClick={() => setSelectedConversation(convo.user.id)}
                className={`w-full text-left p-4 rounded-lg hover:bg-gray-50 transition ${
                  selectedConversation === convo.user.id ? 'bg-gabriola-green/10' : ''
                }`}
              >
                <div className="font-semibold">{convo.user.full_name || convo.user.username}</div>
                <div className="text-sm text-gray-600 truncate">{convo.lastMessage.message}</div>
                {convo.unread && <span className="text-xs text-red-600">New</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chat Window */}
      <div className="flex-1 bg-white rounded-2xl shadow-lg flex flex-col">
        {selectedConversation ? (
          <>
            <div className="p-4 border-b flex items-center gap-3">
              <button onClick={() => setSelectedConversation(null)} className="md:hidden">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h3 className="text-xl font-bold">
                {conversations[selectedConversation]?.user?.full_name || 'Chat'}
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {currentConvo.map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-2xl ${
                      msg.sender_id === user.id
                        ? 'bg-gabriola-green text-white'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    {msg.message}
                    {msg.attachment_url && (
                      <img src={msg.attachment_url} alt="attachment" className="mt-2 rounded-lg max-w-full" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t flex gap-2">
              <input
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gabriola-green"
              />
              <button
                onClick={sendMessage}
                className="bg-gabriola-green text-white p-3 rounded-lg hover:bg-gabriola-green-dark transition"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  );
}