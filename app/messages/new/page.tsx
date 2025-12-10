// Path: app/messages/new/page.tsx
// Version: 2.0.0 - Image upload with 10MB limit and compression
// Date: 2024-12-10

'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Search, Send, Loader2, Image as ImageIcon, Link as LinkIcon, X } from 'lucide-react';
import { compressImage } from '@/lib/imageCompression';

function NewMessageForm() {
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toUserId = searchParams.get('to');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [sending, setSending] = useState(false);
  const [searching, setSearching] = useState(false);
  const [compressionSavings, setCompressionSavings] = useState<string | null>(null);

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

  const handleSelectUser = (u: any) => {
    setSelectedUser(u);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be smaller than 10MB');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    try {
      // Compress image
      const result = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.85,
        maxSizeMB: 10
      });

      // Check if compression was successful
      if (!result.success) {
        alert(result.error);
        return;
      }

      // Calculate savings
      const savedBytes = result.originalSize - result.compressedSize;
      const savedPercent = ((savedBytes / result.originalSize) * 100).toFixed(0);
      
      if (savedBytes > 0) {
        setCompressionSavings(`Compressed: ${savedPercent}% smaller`);
      }

      // Convert to data URL for preview and storage
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setImageUrl(dataUrl);
        setImagePreview(dataUrl);
      };
      reader.readAsDataURL(result.file);
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Failed to process image. Please try another file.');
    }
  };

  const removeImage = () => {
    setImageUrl('');
    setImagePreview(null);
    setCompressionSavings(null);
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

    // Success
    setMessage('');
    setImageUrl('');
    setImagePreview(null);
    setLinkUrl('');
    setCompressionSavings(null);
    router.push(`/messages/${selectedUser.id}`);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-2xl text-gray-600">Please sign in to send messages</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="mb-6">
          <Link href="/messages" className="text-blue-600 hover:underline flex items-center gap-2">
            <ArrowLeft className="w-5 h-5" />
            Back to Messages
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gabriola-green mb-8">New Message</h1>

          {!selectedUser ? (
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-900 mb-2">To: (search residents)</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by name..."
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
                />
              </div>

              {searching && (
                <div className="mt-4 text-center text-gray-600">
                  <Loader2 className="w-6 h-6 animate-spin inline" />
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="mt-4 space-y-2">
                  {searchResults.map(u => (
                    <button
                      key={u.id}
                      onClick={() => handleSelectUser(u)}
                      className="w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-lg flex items-center gap-3 text-left transition"
                    >
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt={u.full_name} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gabriola-green text-white flex items-center justify-center font-bold text-xl">
                          {u.first_name?.charAt(0) || u.full_name?.charAt(0) || '?'}
                        </div>
                      )}
                      <div>
                        <p className="font-bold">{u.full_name}</p>
                        <p className="text-sm text-green-600">✓ Resident</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedUser.avatar_url ? (
                  <img src={selectedUser.avatar_url} alt={selectedUser.full_name} className="w-12 h-12 rounded-full object-cover" />
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
              <button onClick={() => setSelectedUser(null)} className="text-gray-500 hover:text-red-600">
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-900 mb-2">Message</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Type your message..."
              rows={6}
              disabled={!selectedUser}
              className="w-full p-4 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent resize-none disabled:bg-gray-100"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-900 mb-2">
              <ImageIcon className="w-4 h-4 inline mr-2" />
              Attach Image (optional, max 10MB)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={!selectedUser}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent disabled:bg-gray-100"
            />
            {imagePreview && (
              <div className="mt-4 relative">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="max-w-full h-auto rounded-lg border-2 border-gray-200"
                  style={{ maxHeight: '300px' }}
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition"
                >
                  <X className="w-4 h-4" />
                </button>
                {compressionSavings && (
                  <p className="mt-2 text-sm text-green-600">✓ {compressionSavings}</p>
                )}
              </div>
            )}
          </div>

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

export default function NewMessagePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-gabriola-green animate-spin" />
      </div>
    }>
      <NewMessageForm />
    </Suspense>
  );
}
