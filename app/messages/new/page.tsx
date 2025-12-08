// app/messages/new/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Search, Send, Loader2, Image as ImageIcon, Link as LinkIcon, X } from 'lucide-react';

export default function NewMessagePage() {
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toUserId = searchParams.get('to');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [sending, setSending] = useState(false);
  const [searching, setSearching] = useState(false);

  // If 'to' param exists, load that user
  useEffect(() => {
    if (toUserId) {
      loadUser(toUserId);
    }
  }, [toUserId]);

  const loadUser = async (userId: string) => {
    const { data } = await supabase
      .from('users')
      .select('id, first_name, last_name, full_name, avatar_url')
      .eq('id', userId)
      .single();

    if (data) {
      setSelectedUser(data);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);

    const { data } = await supabase
      .from('users')
      .select('id, first_name, last_name, full_name, avatar_url, is_resident')
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,full_name.ilike.%${query}%`)
      .eq('is_resident', true)
      .eq('show_in_directory', true)
      .neq('id', user!.id)
      .limit(10);

    setSearchResults(data || []);
    setSearching(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery && !selectedUser) {
        searchUsers(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectUser = (selectedUser: any) => {
    setSelectedUser(selectedUser);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSend = async () => {
    if (!selectedUser || !message.trim()) return;

    setSending(true);

    const { error } = await supabase.from('private_messages').insert({
      sender_id: user!.id,
      receiver_id: selectedUser.id,
      message: message.trim(),
      image_url: imageUrl.trim() || null,
      link_url: linkUrl.trim() || null,
      read: false,
      is_deleted: false,
    });

    if (error) {
      alert('Failed to send message: ' + error.message);
      setSending(false);
      return;
    }

    // Redirect to conversation
    router.push(`/messages/${selectedUser.id}`);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-gabriola-green animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link
          href="/messages"
          className="inline-flex items-center gap-2 text-gabriola-green hover:underline mb-8 text-lg font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Messages
        </Link>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">New Message</h1>

          {/* User Search/Selection */}
          {!selectedUser ? (
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-900 mb-2">
                To: (Search residents)
              </label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
                />
              </div>

              {/* Search Results Dropdown */}
              {searchQuery && searchResults.length > 0 && (
                <div className="mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  {searchResults.map(u => (
                    <button
                      key={u.id}
                      onClick={() => handleSelectUser(u)}
                      className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition text-left"
                    >
                      {u.avatar_url ? (
                        <img
                          src={u.avatar_url}
                          alt={u.full_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gabriola-green text-white flex items-center justify-center font-bold">
                          {u.first_name?.charAt(0) || u.full_name?.charAt(0) || '?'}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-gray-900">{u.full_name}</p>
                        <p className="text-sm text-green-600">✓ Resident</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {searchQuery && searching && (
                <div className="mt-2 p-4 text-center text-gray-500">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                </div>
              )}

              {searchQuery && !searching && searchResults.length === 0 && (
                <div className="mt-2 p-4 text-center text-gray-500">
                  No residents found matching "{searchQuery}"
                </div>
              )}

              {!searchQuery && (
                <p className="mt-2 text-sm text-gray-500">
                  Start typing to search for residents by name
                </p>
              )}
            </div>
          ) : (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedUser.avatar_url ? (
                  <img
                    src={selectedUser.avatar_url}
                    alt={selectedUser.full_name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gabriola-green text-white flex items-center justify-center font-bold text-xl">
                    {selectedUser.first_name?.charAt(0) || selectedUser.full_name?.charAt(0) || '?'}
                  </div>
                )}
                <div>
                  <p className="font-bold text-gray-900">{selectedUser.full_name}</p>
                  <p className="text-sm text-green-600">✓ Resident</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-gray-500 hover:text-red-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Message Input */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Type your message..."
              rows={6}
              disabled={!selectedUser}
              className="w-full p-4 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent resize-none disabled:bg-gray-100"
            />
          </div>

          {/* Optional: Image URL */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-900 mb-2">
              <ImageIcon className="w-4 h-4 inline mr-2" />
              Image URL (optional)
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              disabled={!selectedUser}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent disabled:bg-gray-100"
            />
          </div>

          {/* Optional: Link URL */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-900 mb-2">
              <LinkIcon className="w-4 h-4 inline mr-2" />
              Link URL (optional)
            </label>
            <input
              type="url"
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              disabled={!selectedUser}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent disabled:bg-gray-100"
            />
          </div>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!selectedUser || !message.trim() || sending}
            className="w-full bg-gabriola-green text-white py-4 rounded-lg font-bold text-lg hover:bg-gabriola-green-dark transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {sending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Send Message
              </>
            )}
          </button>

          {/* Privacy Notice */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Privacy:</strong> Only verified residents who have opted into the directory can be found. 
              Your messages are private and encrypted.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
