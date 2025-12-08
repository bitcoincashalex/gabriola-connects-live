// app/messages/settings/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Shield, Save, Loader2 } from 'lucide-react';

export default function MessageSettingsPage() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const [allowFrom, setAllowFrom] = useState('everyone');
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/signin');
      } else {
        fetchSettings();
      }
    }
  }, [user, authLoading]);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('message_settings')
      .select('*')
      .eq('user_id', user!.id)
      .single();

    if (data) {
      setAllowFrom(data.allow_messages_from);
      setEmailNotifs(data.email_notifications);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);

    const { error } = await supabase
      .from('message_settings')
      .upsert({
        user_id: user!.id,
        allow_messages_from: allowFrom,
        email_notifications: emailNotifs,
      });

    if (!error) {
      alert('Settings saved!');
    } else {
      alert('Failed to save: ' + error.message);
    }

    setSaving(false);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-gabriola-green animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link
          href="/messages"
          className="inline-flex items-center gap-2 text-gabriola-green hover:underline mb-8 text-lg font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Messages
        </Link>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center gap-3 mb-8">
            <Shield className="w-8 h-8 text-gabriola-green" />
            <h1 className="text-3xl font-bold text-gray-900">Message Settings</h1>
          </div>

          <div className="space-y-8">
            {/* Who can message you */}
            <div>
              <label className="block text-lg font-bold text-gray-900 mb-3">
                Who can send you messages?
              </label>
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                  <input
                    type="radio"
                    name="allowFrom"
                    value="everyone"
                    checked={allowFrom === 'everyone'}
                    onChange={e => setAllowFrom(e.target.value)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-bold text-gray-900">Everyone</div>
                    <div className="text-sm text-gray-600">
                      Any community member can message you (default)
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                  <input
                    type="radio"
                    name="allowFrom"
                    value="members"
                    checked={allowFrom === 'members'}
                    onChange={e => setAllowFrom(e.target.value)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-bold text-gray-900">Members Only</div>
                    <div className="text-sm text-gray-600">
                      Only registered, verified members can message you
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                  <input
                    type="radio"
                    name="allowFrom"
                    value="connections"
                    checked={allowFrom === 'connections'}
                    onChange={e => setAllowFrom(e.target.value)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-bold text-gray-900">Connections Only</div>
                    <div className="text-sm text-gray-600">
                      Only people you've messaged before can message you
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                  <input
                    type="radio"
                    name="allowFrom"
                    value="nobody"
                    checked={allowFrom === 'nobody'}
                    onChange={e => setAllowFrom(e.target.value)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-bold text-gray-900">Nobody</div>
                    <div className="text-sm text-gray-600">
                      Turn off private messages completely
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Email notifications */}
            <div>
              <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                <input
                  type="checkbox"
                  checked={emailNotifs}
                  onChange={e => setEmailNotifs(e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <div className="font-bold text-gray-900">Email Notifications</div>
                  <div className="text-sm text-gray-600">
                    Send me an email when I receive a new message
                  </div>
                </div>
              </label>
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-gabriola-green text-white py-4 rounded-xl font-bold text-lg hover:bg-gabriola-green-dark disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {saving ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-6 h-6" />
                  Save Settings
                </>
              )}
            </button>

            {/* Privacy link */}
            <div className="text-center">
              <Link
                href="/privacy/messaging"
                className="text-blue-600 hover:underline font-medium"
              >
                Learn more about message privacy and security →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
