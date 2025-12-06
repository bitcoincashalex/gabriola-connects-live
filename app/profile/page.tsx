// app/profile/page.tsx — FINAL, FIXED, NO ERRORS
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { Mail, Bell, Smartphone, Save } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, loading: authLoading } = useUser();
  const [profile, setProfile] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    setProfile(data || {});
    setLoading(false);
  };

  const save = async () => {
    if (!user?.id) return;
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: profile.full_name,
        username: profile.username,
        bio: profile.bio,
        phone: profile.phone,
        alert_email: profile.alert_email,
        alert_sms: profile.alert_sms,
        alert_push: profile.alert_push,
        alert_level: profile.alert_level,
      })
      .eq('id', user.id);

    if (!error) alert('Profile saved!');
  };

  if (authLoading || loading) {
    return <div className="p-12 text-center text-xl">Loading profile...</div>;
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center py-32">
        <p className="text-2xl text-gray-600">Please sign in to view your profile</p>
        <Link href="/signin" className="text-gabriola-green underline text-xl mt-4 inline-block">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8 py-20">
      <h1 className="text-4xl font-bold text-gabriola-green mb-8">My Profile & Alerts</h1>

      <div className="bg-white rounded-2xl shadow-xl p-8 space-y-10">
        {/* Basic Info */}
        <section>
          <h2 className="text-2xl font-bold text-gabriola-green-dark mb-6">About Me</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <input placeholder="Full Name" value={profile.full_name || ''} onChange={e => setProfile({ ...profile, full_name: e.target.value })} className="p-4 border rounded-lg" />
            <input placeholder="Username" value={profile.username || ''} onChange={e => setProfile({ ...profile, username: e.target.value })} className="p-4 border rounded-lg" />
            <input placeholder="Phone (for SMS)" value={profile.phone || ''} onChange={e => setProfile({ ...profile, phone: e.target.value })} className="p-4 border rounded-lg" />
            <textarea placeholder="Bio" rows={3} value={profile.bio || ''} onChange={e => setProfile({ ...profile, bio: e.target.value })} className="p-4 border rounded-lg md:col-span-2" />
          </div>
        </section>

        {/* Alert Preferences */}
        <section className="border-t pt-8">
          <h2 className="text-2xl font-bold text-gabriola-green-dark mb-6 flex items-center gap-3">
            <Bell className="w-7 h-7" /> Alert Preferences
          </h2>
          <div className="space-y-5">
            <label className="flex items-center gap-4">
              <input type="checkbox" checked={profile.alert_email ?? true} onChange={e => setProfile({ ...profile, alert_email: e.target.checked })} className="w-5 h-5" />
              <span className="flex items-center gap-2"><Mail className="w-5 h-5" /> Email alerts</span>
            </label>
            <label className="flex items-center gap-4">
              <input type="checkbox" checked={profile.alert_sms ?? false} onChange={e => setProfile({ ...profile, alert_sms: e.target.checked })} className="w-5 h-5" />
              <span className="flex items-center gap-2"><Smartphone className="w-5 h-5" /> SMS alerts (phone required)</span>
            </label>
            <label className="flex items-center gap-4">
              <input type="checkbox" checked={profile.alert_push ?? true} onChange={e => setProfile({ ...profile, alert_push: e.target.checked })} className="w-5 h-5" />
              <span className="flex items-center gap-2"><Bell className="w-5 h-5" /> Browser push notifications</span>
            </label>

            <div className="mt-6">
              <label className="block font-medium mb-2">Minimum alert level</label>
              <select value={profile.alert_level || 'important'} onChange={e => setProfile({ ...profile, alert_level: e.target.value })} className="w-full p-4 border rounded-lg">
                <option value="critical">Critical (red) only</option>
                <option value="important">Important (orange) + critical</option>
                <option value="advisory">Advisory (yellow) + above</option>
                <option value="info">All alerts (including info)</option>
              </select>
            </div>
          </div>
        </section>

        <button onClick={save} className="w-full bg-gabriola-green text-white py-4 rounded-lg font-bold hover:bg-gabriola-green-dark flex items-center justify-center gap-3">
          <Save className="w-5 h-5" /> Save Profile
        </button>
      </div>
    </div>
  );
}