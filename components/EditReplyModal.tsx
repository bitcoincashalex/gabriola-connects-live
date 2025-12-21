// Path: components/EditReplyModal.tsx
// Version: 1.0.0 - Simple reply editing modal
// Date: 2025-12-20

'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Loader2, Save } from 'lucide-react';

interface EditReplyModalProps {
  reply: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditReplyModal({ reply, onClose, onSuccess }: EditReplyModalProps) {
  const [body, setBody] = useState(reply.body || '');
  const [linkUrl, setLinkUrl] = useState(reply.link_url || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    // Validation
    if (!body.trim()) {
      setError('Reply text is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('bbs_replies')
        .update({
          body: body.trim(),
          link_url: linkUrl.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reply.id);

      if (updateError) {
        throw updateError;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to update reply:', err);
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-8 py-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Edit Reply</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
            disabled={saving}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <div className="p-8 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              {error}
            </div>
          )}

          {/* Body */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reply Text *
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none min-h-[200px] resize-y"
              placeholder="Write your reply..."
              disabled={saving}
            />
            <div className="text-sm text-gray-500 mt-1">
              {body.length} characters
            </div>
          </div>

          {/* Link URL (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Link (Optional)
            </label>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
              placeholder="https://example.com"
              disabled={saving}
            />
          </div>

          {/* Image Note */}
          {reply.image_url && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> Image cannot be changed after posting. To change the image, you'll need to post a new reply.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              onClick={handleSave}
              disabled={saving || !body.trim()}
              className="flex-1 flex items-center justify-center gap-2 bg-gabriola-green text-white px-6 py-4 rounded-lg font-bold hover:bg-gabriola-green-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Changes
                </>
              )}
            </button>

            <button
              onClick={onClose}
              disabled={saving}
              className="px-6 py-4 border-2 border-gray-300 rounded-lg font-bold hover:bg-gray-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
