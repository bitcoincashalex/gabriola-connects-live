// Path: components/EditThreadModal.tsx
// Version: 1.0.0 - Simple thread editing modal
// Date: 2025-12-20

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Loader2, Save } from 'lucide-react';

interface EditThreadModalProps {
  thread: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditThreadModal({ thread, onClose, onSuccess }: EditThreadModalProps) {
  const [title, setTitle] = useState(thread.title || '');
  const [body, setBody] = useState(thread.body || '');
  const [linkUrl, setLinkUrl] = useState(thread.link_url || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    // Validation
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!body.trim()) {
      setError('Body is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('bbs_posts')
        .update({
          title: title.trim(),
          body: body.trim(),
          link_url: linkUrl.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', thread.id);

      if (updateError) {
        throw updateError;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to update thread:', err);
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
        className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-8 py-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Edit Thread</h2>
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

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none text-lg"
              placeholder="Thread title..."
              maxLength={200}
              disabled={saving}
            />
            <div className="text-sm text-gray-500 mt-1">
              {title.length}/200 characters
            </div>
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Body *
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none min-h-[300px] resize-y"
              placeholder="Write your message..."
              disabled={saving}
            />
            <div className="text-sm text-gray-500 mt-1">
              {body.length} characters
            </div>
          </div>

          {/* Link URL (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              External Link (Optional)
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
          {thread.image_url && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> Image cannot be changed after posting. To change the image, you'll need to create a new thread.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              onClick={handleSave}
              disabled={saving || !title.trim() || !body.trim()}
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
