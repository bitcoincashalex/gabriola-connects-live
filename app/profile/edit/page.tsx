// app/profile/edit/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Camera, Image as ImageIcon, Loader2, X } from 'lucide-react';

export default function ProfileEditPage() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  
  const [fullName, setFullName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [profileVisibility, setProfileVisibility] = useState('public');
  const [showEmail, setShowEmail] = useState(false);
  const [showLocation, setShowLocation] = useState(true);
  const [showInDirectory, setShowInDirectory] = useState(true);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/signin');
      } else {
        loadProfile();
      }
    }
  }, [user, authLoading]);

  const loadProfile = async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', user!.id)
      .single();

    if (data) {
      setFirstName(data.first_name || '');
      setLastName(data.last_name || '');
      setFullName(data.full_name || '');
      setUsername(data.username || '');
      setBio(data.bio || '');
      setPostalCode(data.postal_code || '');
      setProfilePhoto(data.profile_photo || '');
      setProfilePhotoPreview(data.profile_photo || null);
      setAvatarUrl(data.avatar_url || '');
      setAvatarPreview(data.avatar_url || null);
      setProfileVisibility(data.profile_visibility || 'public');
      setShowEmail(data.show_email || false);
      setShowLocation(data.show_location !== false);
      setShowInDirectory(data.show_in_directory !== false);
    }
    setLoading(false);
  };

  const handleProfilePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('Profile photo must be smaller than 10MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setProfilePhoto(result);
        setProfilePhotoPreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Avatar must be smaller than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setAvatarUrl(result);
        setAvatarPreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      alert('Please enter your first and last name');
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from('users')
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        username: username.trim() || null,
        bio: bio.trim() || null,
        postal_code: postalCode.trim() || null,
        profile_photo: profilePhoto || null,
        avatar_url: avatarUrl || null,
        profile_visibility: profileVisibility,
        show_email: showEmail,
        show_location: showLocation,
        show_in_directory: showInDirectory,
      })
      .eq('id', user!.id);

    if (error) {
      alert('Failed to save: ' + error.message);
      setSaving(false);
    } else {
      router.push(`/profile/${user!.id}`);
    }
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
          href={`/profile/${user!.id}`}
          className="inline-flex items-center gap-2 text-gabriola-green hover:underline mb-8 text-lg font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Profile
        </Link>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Edit Profile</h1>

          <div className="space-y-8">
            {/* Profile Photo */}
            <div>
              <label className="block font-bold text-gray-900 mb-3">
                Profile Photo
              </label>
              <p className="text-sm text-gray-600 mb-4">
                Large photo shown on your profile page (max 10MB)
              </p>
              <div className="flex items-center gap-6">
                {profilePhotoPreview ? (
                  <div className="relative">
                    <img
                      src={profilePhotoPreview}
                      alt="Profile"
                      className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                    />
                    <button
                      onClick={() => { setProfilePhoto(''); setProfilePhotoPreview(null); }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center text-4xl font-bold text-gray-400">
                    {firstName.charAt(0) || '?'}
                  </div>
                )}
                <label className="flex items-center gap-3 px-6 py-3 bg-gabriola-green text-white rounded-lg font-bold cursor-pointer hover:bg-gabriola-green-dark">
                  <Camera className="w-5 h-5" />
                  Upload Photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Avatar */}
            <div>
              <label className="block font-bold text-gray-900 mb-3">
                Avatar (Icon)
              </label>
              <p className="text-sm text-gray-600 mb-4">
                Small icon used in forum posts and messages (max 5MB)
              </p>
              <div className="flex items-center gap-6">
                {avatarPreview ? (
                  <div className="relative">
                    <img
                      src={avatarPreview}
                      alt="Avatar"
                      className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                    />
                    <button
                      onClick={() => { setAvatarUrl(''); setAvatarPreview(null); }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-400">
                    {firstName.charAt(0) || '?'}
                  </div>
                )}
                <label className="flex items-center gap-3 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold cursor-pointer hover:bg-gray-200">
                  <ImageIcon className="w-5 h-5" />
                  Upload Avatar
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <hr />

            {/* First Name */}
            <div>
              <label className="block font-bold text-gray-900 mb-2">
                First Name *
              </label>
              <input
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="First name"
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
              />
            </div>

            {/* Last Name */}
            <div>
              <label className="block font-bold text-gray-900 mb-2">
                Last Name *
              </label>
              <input
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="Last name"
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
              />
            </div>

            {/* Username */}
            <div>
              <label className="block font-bold text-gray-900 mb-2">
                Username (optional)
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="username"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block font-bold text-gray-900 mb-2">
                Bio / About Me
              </label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Tell the community about yourself..."
                rows={5}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent resize-none"
              />
              <p className="text-sm text-gray-500 mt-2">
                {bio.length} / 500 characters
              </p>
            </div>

            {/* Postal Code */}
            <div>
              <label className="block font-bold text-gray-900 mb-2">
                Postal Code
              </label>
              <input
                type="text"
                value={postalCode}
                onChange={e => setPostalCode(e.target.value)}
                placeholder="V0R 1X0"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
              />
            </div>

            <hr />

            {/* Privacy Settings */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Privacy Settings</h3>

              {/* Profile Visibility */}
              <div className="mb-6">
                <label className="block font-bold text-gray-900 mb-3">
                  Who can view your profile?
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="visibility"
                      value="public"
                      checked={profileVisibility === 'public'}
                      onChange={e => setProfileVisibility(e.target.value)}
                    />
                    <div>
                      <div className="font-bold">Public</div>
                      <div className="text-sm text-gray-600">Anyone can view your profile</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="visibility"
                      value="members"
                      checked={profileVisibility === 'members'}
                      onChange={e => setProfileVisibility(e.target.value)}
                    />
                    <div>
                      <div className="font-bold">Members Only</div>
                      <div className="text-sm text-gray-600">Only logged-in members can view</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="visibility"
                      value="private"
                      checked={profileVisibility === 'private'}
                      onChange={e => setProfileVisibility(e.target.value)}
                    />
                    <div>
                      <div className="font-bold">Private</div>
                      <div className="text-sm text-gray-600">Only you can view your profile</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Show Email */}
              <label className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 mb-3">
                <input
                  type="checkbox"
                  checked={showEmail}
                  onChange={e => setShowEmail(e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <div className="font-bold">Show email on profile</div>
                  <div className="text-sm text-gray-600">Let others see your email address</div>
                </div>
              </label>

              {/* Show Location */}
              <label className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 mb-3">
                <input
                  type="checkbox"
                  checked={showLocation}
                  onChange={e => setShowLocation(e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <div className="font-bold">Show postal code on profile</div>
                  <div className="text-sm text-gray-600">Display your location to others</div>
                </div>
              </label>

              {/* Show in Directory */}
              <label className="flex items-start gap-3 p-3 border-2 border-blue-200 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100">
                <input
                  type="checkbox"
                  checked={showInDirectory}
                  onChange={e => setShowInDirectory(e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <div className="font-bold text-blue-900">
                    Show in resident messaging directory
                  </div>
                  <div className="text-sm text-blue-700">
                    <strong>Residents only:</strong> Allow other residents to find and message you by name. 
                    Uncheck to hide from autocomplete search.
                  </div>
                </div>
              </label>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving || !firstName.trim() || !lastName.trim()}
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
                  Save Profile
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
