// app/profile/edit/page.tsx
// Version: 3.0.1 - Added visual feedback for required fields (first/last name)
// Date: 2025-12-22

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Camera, Image as ImageIcon, Loader2, X, Bell, Mail, MessageSquare, Smartphone, Globe, Facebook } from 'lucide-react';

export default function ProfileEditPage() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  
  const [fullName, setFullName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [profileVisibility, setProfileVisibility] = useState('public');
  const [showEmail, setShowEmail] = useState(false);
  const [showLocation, setShowLocation] = useState(true);
  const [showInDirectory, setShowInDirectory] = useState(true);
  
  // NEW: Enhanced profile fields
  const [website, setWebsite] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [isResident, setIsResident] = useState(false);
  const [residentSince, setResidentSince] = useState('');
  
  // Notification preferences
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySms, setNotifySms] = useState(false);
  const [notifyPush, setNotifyPush] = useState(true);
  const [alertSubscriptions, setAlertSubscriptions] = useState<string[]>(['warning', 'emergency']);
  
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
      setPhoneNumber(data.phone_number || '');
      setProfilePhoto(data.profile_photo || '');
      setProfilePhotoPreview(data.profile_photo || null);
      setAvatarUrl(data.avatar_url || '');
      setAvatarPreview(data.avatar_url || null);
      setProfileVisibility(data.profile_visibility || 'public');
      setShowEmail(data.show_email || false);
      setShowLocation(data.show_location !== false);
      setShowInDirectory(data.show_in_directory !== false);
      
      // Load enhanced profile fields
      setWebsite(data.website || '');
      setFacebookUrl(data.facebook_url || '');
      setIsResident(data.is_resident || false);
      setResidentSince(data.resident_since || '');
      
      // Load notification preferences
      setNotifyEmail(data.notify_email !== false);
      setNotifySms(data.notify_sms || false);
      setNotifyPush(data.notify_push !== false);
      setAlertSubscriptions(data.alert_subscriptions || ['warning', 'emergency']);
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

  const toggleAlertLevel = (level: string) => {
    if (alertSubscriptions.includes(level)) {
      setAlertSubscriptions(alertSubscriptions.filter(l => l !== level));
    } else {
      setAlertSubscriptions([...alertSubscriptions, level]);
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
        phone_number: phoneNumber.trim() || null,
        profile_photo: profilePhoto || null,
        avatar_url: avatarUrl || null,
        profile_visibility: profileVisibility,
        show_email: showEmail,
        show_location: showLocation,
        show_in_directory: showInDirectory,
        // Enhanced profile fields
        website: website.trim() || null,
        facebook_url: facebookUrl.trim() || null,
        is_resident: isResident,
        resident_since: residentSince || null,
        // Notification preferences
        notify_email: notifyEmail,
        notify_sms: notifySms,
        notify_push: notifyPush,
        alert_subscriptions: alertSubscriptions,
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
            {/* Required fields notice */}
            {(!firstName.trim() || !lastName.trim()) && (
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-900">Required Information</p>
                    <p className="text-sm text-amber-800 mt-1">
                      Please fill in your first and last name below to save your profile.
                    </p>
                  </div>
                </div>
              </div>
            )}

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
                Avatar
              </label>
              <p className="text-sm text-gray-600 mb-4">
                Small icon shown next to your posts and comments (max 5MB)
              </p>
              <div className="flex items-center gap-6">
                {avatarPreview ? (
                  <div className="relative">
                    <img
                      src={avatarPreview}
                      alt="Avatar"
                      className="w-16 h-16 rounded-full object-cover border-4 border-gray-200"
                    />
                    <button
                      onClick={() => { setAvatarUrl(''); setAvatarPreview(null); }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-400">
                    {firstName.charAt(0) || '?'}
                  </div>
                )}
                <label className="flex items-center gap-3 px-6 py-3 bg-gabriola-green text-white rounded-lg font-bold cursor-pointer hover:bg-gabriola-green-dark">
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

            {/* Name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-gray-900 mb-2">
                  First Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent ${
                    !firstName.trim() ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                  placeholder="Enter your first name"
                  required
                />
                {!firstName.trim() && (
                  <p className="text-sm text-red-600 mt-1">Required field</p>
                )}
              </div>
              <div>
                <label className="block font-bold text-gray-900 mb-2">
                  Last Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent ${
                    !lastName.trim() ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                  placeholder="Enter your last name"
                  required
                />
                {!lastName.trim() && (
                  <p className="text-sm text-red-600 mt-1">Required field</p>
                )}
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block font-bold text-gray-900 mb-2">
                Username
              </label>
              <p className="text-sm text-gray-600 mb-2">
                Optional - appears in your profile URL
              </p>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
                placeholder="your-username"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block font-bold text-gray-900 mb-2">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent resize-none"
                placeholder="Tell us about yourself..."
              />
            </div>

            {/* Postal Code */}
            <div>
              <label className="block font-bold text-gray-900 mb-2">
                Postal Code
              </label>
              <p className="text-sm text-gray-600 mb-2">
                For resident verification (V0R 1X for Gabriola)
              </p>
              <input
                type="text"
                value={postalCode}
                onChange={e => setPostalCode(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
                placeholder="V0R 1X0"
                maxLength={7}
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block font-bold text-gray-900 mb-2">
                Phone Number
              </label>
              <p className="text-sm text-gray-600 mb-2">
                Optional - for SMS notifications
              </p>
              <input
                type="tel"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
                placeholder="(250) 555-1234"
              />
            </div>

            {/* Website */}
            <div>
              <label className="block font-bold text-gray-900 mb-2">
                Website
              </label>
              <p className="text-sm text-gray-600 mb-2">
                Optional - link to your personal or business website
              </p>
              <input
                type="url"
                value={website}
                onChange={e => setWebsite(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
                placeholder="https://yourwebsite.com"
              />
            </div>

            {/* Facebook URL */}
            <div>
              <label className="block font-bold text-gray-900 mb-2">
                Facebook Profile
              </label>
              <p className="text-sm text-gray-600 mb-2">
                Optional - connect with neighbors on social media
              </p>
              <input
                type="url"
                value={facebookUrl}
                onChange={e => setFacebookUrl(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
                placeholder="https://facebook.com/yourprofile"
              />
            </div>

            {/* Gabriola Resident Section */}
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <input
                  type="checkbox"
                  id="is-resident"
                  checked={isResident}
                  onChange={e => setIsResident(e.target.checked)}
                  className="w-6 h-6 mt-1 cursor-pointer accent-green-600"
                />
                <div className="flex-1">
                  <label htmlFor="is-resident" className="block font-bold text-gray-900 mb-1 cursor-pointer">
                    🏝️ I am a Gabriola Island Resident
                  </label>
                  <p className="text-sm text-gray-700">
                    Residents get special badges on their profile and forum posts
                  </p>
                </div>
              </div>

              {/* Resident Since (only show if is_resident is checked) */}
              {isResident && (
                <div className="mt-4 pl-10">
                  <label className="block font-medium text-gray-900 mb-2">
                    Resident Since
                  </label>
                  <input
                    type="date"
                    value={residentSince}
                    onChange={e => setResidentSince(e.target.value)}
                    className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    max={new Date().toISOString().split('T')[0]}
                  />
                  <p className="text-xs text-gray-600 mt-1">When did you move to Gabriola?</p>
                </div>
              )}
            </div>

            {/* Privacy Settings */}
            <div className="border-t-2 pt-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Privacy Settings</h2>

              {/* Profile Visibility */}
              <div className="mb-6">
                <label className="block font-bold text-gray-900 mb-3">
                  Profile Visibility
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

            {/* Notification Preferences */}
            <div className="border-t-2 pt-8">
              <div className="flex items-center gap-3 mb-6">
                <Bell className="w-8 h-8 text-gabriola-green" />
                <h2 className="text-2xl font-bold text-gray-900">Notification Preferences</h2>
              </div>

              <p className="text-gray-600 mb-6">
                Choose how you want to receive community alerts and notifications
              </p>

              {/* Notification Methods */}
              <div className="space-y-3 mb-6">
                <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={notifyEmail}
                    onChange={e => setNotifyEmail(e.target.checked)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-bold text-gray-900">
                      <Mail className="w-5 h-5 text-blue-600" />
                      Email Notifications
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Receive alerts and updates via email
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={notifySms}
                    onChange={e => setNotifySms(e.target.checked)}
                    disabled={!phoneNumber.trim()}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-bold text-gray-900">
                      <MessageSquare className="w-5 h-5 text-green-600" />
                      SMS Notifications
                      {!phoneNumber.trim() && (
                        <span className="text-xs text-orange-600 font-normal">(Add phone number above)</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Receive urgent alerts via text message
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={notifyPush}
                    onChange={e => setNotifyPush(e.target.checked)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-bold text-gray-900">
                      <Smartphone className="w-5 h-5 text-purple-600" />
                      Browser Notifications
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Show notifications in your browser
                    </div>
                  </div>
                </label>
              </div>

              {/* Alert Level Subscriptions */}
              <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-6">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-orange-600" />
                  Alert Level Subscriptions
                </h3>
                <p className="text-sm text-gray-700 mb-4">
                  Select which alert levels you want to receive notifications for:
                </p>
                
                <div className="space-y-2">
                  <label className="flex items-start gap-3 p-3 bg-white border-2 border-blue-200 rounded-lg cursor-pointer hover:bg-blue-50">
                    <input
                      type="checkbox"
                      checked={alertSubscriptions.includes('info')}
                      onChange={() => toggleAlertLevel('info')}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-bold text-blue-700">
                        🔵 Info - Community Notices
                      </div>
                      <div className="text-sm text-gray-600">
                        General community announcements, events, reminders
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 bg-white border-2 border-yellow-200 rounded-lg cursor-pointer hover:bg-yellow-50">
                    <input
                      type="checkbox"
                      checked={alertSubscriptions.includes('advisory')}
                      onChange={() => toggleAlertLevel('advisory')}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-bold text-yellow-700">
                        🟡 Advisory - Be Aware
                      </div>
                      <div className="text-sm text-gray-600">
                        Weather advisories, road conditions, service updates
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 bg-white border-2 border-orange-300 rounded-lg cursor-pointer hover:bg-orange-50">
                    <input
                      type="checkbox"
                      checked={alertSubscriptions.includes('warning')}
                      onChange={() => toggleAlertLevel('warning')}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-bold text-orange-700">
                        🟠 Warning - Take Action
                      </div>
                      <div className="text-sm text-gray-600">
                        Severe weather, power outages, ferry disruptions
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 bg-white border-2 border-red-300 rounded-lg cursor-pointer hover:bg-red-50">
                    <input
                      type="checkbox"
                      checked={alertSubscriptions.includes('emergency')}
                      onChange={() => toggleAlertLevel('emergency')}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-bold text-red-700">
                        🔴 Emergency - Life Safety
                      </div>
                      <div className="text-sm text-gray-600">
                        Evacuations, wildfires, tsunamis, medical emergencies
                      </div>
                    </div>
                  </label>
                </div>

                {alertSubscriptions.length === 0 && (
                  <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                    <p className="text-sm text-red-800 font-medium">
                      ⚠️ You won't receive any alert notifications. We recommend subscribing to at least Warning and Emergency alerts.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving || !firstName.trim() || !lastName.trim()}
              title={(!firstName.trim() || !lastName.trim()) ? 'Please fill in your first and last name' : 'Save your profile changes'}
              className="w-full bg-gabriola-green text-white py-4 rounded-xl font-bold text-lg hover:bg-gabriola-green-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transition-all"
            >
              {saving ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Saving...
                </>
              ) : (!firstName.trim() || !lastName.trim()) ? (
                <>
                  <Save className="w-6 h-6" />
                  Fill Required Fields to Save
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
