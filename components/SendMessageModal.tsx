// Path: components/SendMessageModal.tsx
// Version: 1.0.0 - Quick message modal from threads
// Date: 2024-12-09

'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Send, Loader2 } from 'lucide-react';

interface Props {
  recipientId: string;
  recipientName: string;
  currentUserId: string;
  onClose: () => void;
}

export default function SendMessageModal({ recipientId, recipientName, currentUserId, onClose }: Props) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }

    setSending(true);
    setError('');

    try {
      // Step 1: Find or create conversation
      let conversationId = await findOrCreateConversation(currentUserId, recipientId);

      if (!conversationId) {
        setError('Failed to create conversation');
        setSending(false);
        return;
      }

      // Step 2: Send message
      const { error: messageError } = await supabase
        .from('private_messages')
        .insert({
          sender_id: currentUserId,
          receiver_id: recipientId,
          message: message.trim(),
          conversation_id: conversationId,
          read: false,
        });

      if (messageError) {
        console.error('Error sending message:', messageError);
        setError('Failed to send message');
        setSending(false);
        return;
      }

      // Step 3: Update conversation last_message_at
      await supabase
        .from('message_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      // Success!
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred');
      setSending(false);
    }
  };

  const findOrCreateConversation = async (userId1: string, userId2: string): Promise<string | null> => {
    // Check if conversation exists (either direction)
    const { data: existingConv, error: searchError } = await supabase
      .from('message_conversations')
      .select('id')
      .or(`and(participant_1.eq.${userId1},participant_2.eq.${userId2}),and(participant_1.eq.${userId2},participant_2.eq.${userId1})`)
      .single();

    if (existingConv) {
      return existingConv.id;
    }

    // Create new conversation
    const { data: newConv, error: createError } = await supabase
      .from('message_conversations')
      .insert({
        participant_1: userId1,
        participant_2: userId2,
        last_message_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (createError || !newConv) {
      console.error('Error creating conversation:', createError);
      return null;
    }

    return newConv.id;
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Send Message</h2>
            <p className="text-gray-600 mt-1">To: <span className="font-medium text-gabriola-green">{recipientName}</span></p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 font-medium">✅ Message sent successfully!</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-medium">❌ {error}</p>
          </div>
        )}

        {/* Message Input */}
        {!success && (
          <>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent resize-none"
              rows={6}
              autoFocus
              disabled={sending}
            />

            {/* Character Count */}
            <p className="text-sm text-gray-500 mt-2">
              {message.length} characters
            </p>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSend}
                disabled={sending || !message.trim()}
                className="flex-1 flex items-center justify-center gap-2 bg-gabriola-green text-white py-3 rounded-lg font-bold hover:bg-gabriola-green-dark transition disabled:bg-gray-300 disabled:cursor-not-allowed"
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
              <button
                onClick={onClose}
                disabled={sending}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {/* Info Note */}
        <p className="text-xs text-gray-500 mt-4 text-center">
          This message will appear in your <a href="/messages" className="text-gabriola-green hover:underline">Messages</a> inbox
        </p>
      </div>
    </div>
  );
}
