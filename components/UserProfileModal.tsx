// components/UserProfileModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { X, Mail, MapPin, Calendar, Shield } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';

interface Props {
  userId: string;
  onClose: () => void;
}

export default function UserProfileModal({ userId, onClose }: Props) {
  const { user: currentUser } = useUser();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    setProfile(data);
    setLoading(false);
  };

  const handleSendMessage = () => {
    if (!currentUser) {
      alert('Please sign in to send messages');
      return;
    }
    router.push(`/messages/new?to=${userId}`);
    onClose();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full">
          <p className="text-center text-gray-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const badges = [];
  if (profile.is_super_admin) badges.push({ text: 'Super Admin', color: 'bg-red-600' });
  if (profile.admin_forum) badges.push({ text: 'Forum Admin', color: 'bg-purple-600' });
  if (profile.moderator_forum) badges.push({ text: 'Moderator', color: 'bg-blue-600' });
  if (profile.fire_dept) badges.push({ text: '🔥 Fire Dept', color: 'bg-orange-600' });
  if (profile.rcmp) badges.push({ text: '👮 RCMP', color: 'bg-indigo-600' });
  if (profile.medic) badges.push({ text: '⚕️ Medic', color: 'bg-green-600' });
  if (profile.coast_guard) badges.push({ text: '⚓ Coast Guard', color: 'bg-teal-600' });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full relative shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Avatar section */}
        <div className="bg-gradient-to-br from-gabriola-green to-gabriola-green-dark p-8 rounded-t-2xl">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-4xl font-bold text-gabriola-green">
            {profile.full_name?.charAt(0) || profile.email?.charAt(0) || '?'}
          </div>
          <h2 className="text-3xl font-bold text-white text-center mb-2">
            {profile.full_name || 'Anonymous User'}
          </h2>
          {profile.username && (
            <p className="text-white/80 text-center">@{profile.username}</p>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Badges */}
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {badges.map((badge, i) => (
                <span
                  key={i}
                  className={`${badge.color} text-white px-3 py-1 rounded-full text-xs font-bold`}
                >
                  {badge.text}
                </span>
              ))}
            </div>
          )}

          {/* Info */}
          <div className="space-y-3 mb-6">
            {profile.postal_code && (
              <div className="flex items-center gap-3 text-gray-600">
                <MapPin className="w-5 h-5" />
                <span>{profile.postal_code}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-gray-600">
              <Calendar className="w-5 h-5" />
              <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Actions */}
          {currentUser && currentUser.id !== userId && (
            <button
              onClick={handleSendMessage}
              className="w-full bg-gabriola-green text-white py-4 rounded-xl font-bold text-lg hover:bg-gabriola-green-dark transition flex items-center justify-center gap-3"
            >
              <Mail className="w-6 h-6" />
              Send Private Message
            </button>
          )}

          {currentUser?.id === userId && (
            <div className="text-center text-gray-500 py-4">
              This is your profile
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
