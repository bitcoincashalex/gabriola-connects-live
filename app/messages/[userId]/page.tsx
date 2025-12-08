// app/messages/[userId]/page.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowLeft, Send, Image as ImageIcon, Link2, X, Loader2 } from 'lucide-react';

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const [otherUser, setOtherUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const otherUserId = params.userId as string;

  useEffect(() => {
    if (!user) {
      router.push('/signin');
      return;
    }
    fetchOtherUser();
    fetchMessages();

    // Mark messages as read
    markAsRead();

    // Subscribe to new messages
    const subscription = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new.sender_id === otherUserId) {
            fetchMessages();
            markAsRead();
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, otherUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchOtherUser = async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', otherUserId)
      .single();

    setOtherUser(data);
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('private_messages')
      .select('*')
      .or(`and(sender_id.eq.${user!.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user!.id})`)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    setMessages(data || []);
    setLoading(false);
  };

  const markAsRead = async () => {
    await supabase
      .from('private_messages')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('receiver_id', user!.id)
      .eq('sender_id', otherUserId)
      .eq('read', false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        alert('Image must be smaller than 25MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImageUrl(result);
        setImagePreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !imageUrl && !linkUrl) || sending) return;

    setSending(true);

    const { error } = await supabase.from('private_messages').insert({
      sender_id: user!.id,
      receiver_id: otherUserId,
      message: newMessage.trim() || '(Media message)',
      image_url: imageUrl || null,
      link_url: linkUrl.trim() || null,
      read: false,
    });

    if (!error) {
      setNewMessage('');
      setLinkUrl('');
      setImageUrl('');
      setImagePreview(null);
      fetchMessages();
    }

    setSending(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-gabriola-green animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link href="/messages" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="w-10 h-10 bg-gabriola-green text-white rounded-full flex items-center justify-center text-lg font-bold">
            {otherUser?.full_name?.charAt(0) || '?'}
          </div>
          <div>
            <h1 className="font-bold text-lg">{otherUser?.full_name || 'Unknown User'}</h1>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((msg) => {
            const isMine = msg.sender_id === user!.id;
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-md ${isMine ? 'bg-gabriola-green text-white' : 'bg-white'} rounded-2xl p-4 shadow`}>
                  {msg.link_url && (
                    <a
                      href={msg.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`block mb-2 p-2 ${isMine ? 'bg-white/20' : 'bg-blue-50'} rounded-lg text-sm`}
                    >
                      🔗 {msg.link_url}
                    </a>
                  )}
                  {msg.image_url && (
                    <img
                      src={msg.image_url}
                      alt="Attachment"
                      className="mb-2 rounded-lg max-w-full"
                      style={{ maxHeight: '300px' }}
                    />
                  )}
                  <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                  <p className={`text-xs mt-2 ${isMine ? 'text-white/70' : 'text-gray-500'}`}>
                    {format(new Date(msg.created_at), 'p')}
                    {isMine && msg.read && ' • Read'}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t px-4 py-4">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto">
          {linkUrl && (
            <div className="mb-2 p-2 bg-blue-50 rounded-lg flex items-center justify-between">
              <span className="text-sm truncate">🔗 {linkUrl}</span>
              <button type="button" onClick={() => setLinkUrl('')} className="p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {imagePreview && (
            <div className="mb-2 relative">
              <img src={imagePreview} alt="Preview" className="rounded-lg max-h-40" />
              <button
                type="button"
                onClick={() => { setImageUrl(''); setImagePreview(null); }}
                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <label className="p-3 hover:bg-gray-100 rounded-lg cursor-pointer">
              <ImageIcon className="w-6 h-6 text-gray-600" />
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
            <button
              type="button"
              onClick={() => {
                const url = prompt('Enter URL:');
                if (url) setLinkUrl(url);
              }}
              className="p-3 hover:bg-gray-100 rounded-lg"
            >
              <Link2 className="w-6 h-6 text-gray-600" />
            </button>
            <textarea
              placeholder="Type a message..."
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyPress={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              rows={1}
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
            />
            <button
              type="submit"
              disabled={sending || (!newMessage.trim() && !imageUrl && !linkUrl)}
              className="bg-gabriola-green text-white p-3 rounded-lg hover:bg-gabriola-green-dark disabled:opacity-50"
            >
              <Send className="w-6 h-6" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
