// Path: app/profile/[userId]/page.tsx
// Version: 2.0.1 - Smart back navigation (forum vs home based on referrer)
// Date: 2025-12-22

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import Link from 'next/link';
import { 
  ArrowLeft, Calendar, MessageCircle, CalendarDays, 
  Mail, MapPin, Loader2, Ban, Globe, Facebook 
} from 'lucide-react';
import { format } from 'date-fns';
import SendMessageModal from '@/components/SendMessageModal';

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useUser();
  const [profile, setProfile] = useState<any>(null);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [backText, setBackText] = useState('Back');
  const [backUrl, setBackUrl] = useState('/');

  useEffect(() => {
    if (!authLoading) {
      fetchProfile();
    }
  }, [params.userId, authLoading]);

  // Smart back navigation based on referrer
  useEffect(() => {
    const referrer = document.referrer;
    const isOwnProfile = params.userId === user?.id;
    
    // If came from forum, go back to forum
    if (referrer && (referrer.includes('/community') || referrer.includes('/thread/'))) {
      setBackText('Back to Forum');
      setBackUrl('/community');
    } 
    // If viewing own profile (likely from header), go home
    else if (isOwnProfile) {
      setBackText('Back to Home');
      setBackUrl('/');
    }
    // Default: back to home
    else {
      setBackText('Back to Home');
      setBackUrl('/');
    }
  }, [params.userId, user]);

  const fetchProfile = async () => {
    // Fetch user profile
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select(`
        id,
        username,
        full_name,
        avatar_url,
        bio,
        postal_code,
        is_resident,
        resident_since,
        website,
        facebook_url,
        is_banned,
        created_at,
        posts_count,
        events_created_count,
        last_activity_at
      `)
      .eq('id', params.userId)
      .single();

    if (profileError || !profileData) {
      console.error('Error fetching profile:', profileError);
      setError(true);
      setLoading(false);
      return;
    }

    setProfile(profileData);

    // Fetch recent posts (if not banned)
    if (!profileData.is_banned) {
      const { data: postsData } = await supabase
        .from('bbs_posts')
        .select('id, title, created_at, vote_score, reply_count, category')
        .eq('user_id', profileData.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentPosts(postsData || []);

      // Fetch recent events
      const { data: eventsData } = await supabase
        .from('events')
        .select('id, title, start_date, location')
        .eq('created_by', profileData.id)
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true })
        .limit(3);

      setRecentEvents(eventsData || []);
    }

    setLoading(false);
  };

  // Check if user is logged in
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Sign In Required
          </h1>
          <p className="text-gray-600 mb-6">
            You must be logged in to view user profiles.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/signup"
              className="bg-gabriola-green text-white px-8 py-3 rounded-lg font-bold hover:bg-gabriola-green-dark transition"
            >
              Sign Up Free
            </Link>
            <Link
              href="/signin"
              className="bg-white text-gabriola-green border-2 border-gabriola-green px-8 py-3 rounded-lg font-bold hover:bg-gray-50 transition"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-gabriola-green animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">User Not Found</h1>
          <p className="text-gray-600 mb-8">This user doesn't exist or has been deleted.</p>
          <Link 
            href={backUrl}
            className="inline-flex items-center gap-2 bg-gabriola-green text-white px-6 py-3 rounded-lg font-bold hover:bg-gabriola-green-dark"
          >
            <ArrowLeft className="w-5 h-5" />
            {backText}
          </Link>
        </div>
      </div>
    );
  }

  // Banned user - show minimal info
  if (profile.is_banned) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <Link 
            href={backUrl}
            className="inline-flex items-center gap-2 text-gabriola-green hover:underline mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            {backText}
          </Link>

          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Ban className="w-12 h-12 text-red-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {profile.full_name}
            </h1>
            <p className="text-gray-600">@{profile.username}</p>
            <p className="text-red-600 mt-4 font-medium">
              This user account has been banned.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isOwnProfile = user && user.id === profile.id;
  const canMessage = user && !isOwnProfile;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Back link */}
        <Link 
          href={backUrl}
          className="inline-flex items-center gap-2 text-gabriola-green hover:underline mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          {backText}
        </Link>

        {/* Profile Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            {profile.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt={profile.full_name}
                className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center text-4xl font-bold text-gray-500">
                {profile.full_name?.charAt(0) || '?'}
              </div>
            )}

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 mb-1">
                    {profile.full_name}
                  </h1>
                  <p className="text-xl text-gray-600">@{profile.username}</p>
                </div>

                {/* Message Button */}
                {canMessage && (
                  <button
                    onClick={() => setShowMessageModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                  >
                    <Mail className="w-5 h-5" />
                    Message
                  </button>
                )}
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                {profile.is_resident && (
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                    🏝️ Gabriola Resident
                    {profile.resident_since && ` since ${new Date(profile.resident_since).getFullYear()}`}
                  </span>
                )}
                <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Joined {format(new Date(profile.created_at), 'MMMM yyyy')}
                </span>
              </div>

              {/* Contact Links */}
              {(profile.website || profile.facebook_url) && (
                <div className="flex flex-wrap gap-3 mb-4">
                  {profile.website && (
                    <a 
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-sm font-medium"
                    >
                      <Globe className="w-4 h-4" />
                      Website
                    </a>
                  )}
                  {profile.facebook_url && (
                    <a 
                      href={profile.facebook_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                    >
                      <Facebook className="w-4 h-4" />
                      Facebook
                    </a>
                  )}
                </div>
              )}

              {/* Bio */}
              {profile.bio && (
                <p className="text-lg text-gray-700 whitespace-pre-wrap">
                  {profile.bio}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow p-6 text-center">
            <div className="flex items-center justify-center gap-2 text-gabriola-green mb-2">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {profile.posts_count || 0}
            </div>
            <div className="text-sm text-gray-600">Forum Posts</div>
          </div>

          <div className="bg-white rounded-xl shadow p-6 text-center">
            <div className="flex items-center justify-center gap-2 text-gabriola-green mb-2">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {profile.events_created_count || 0}
            </div>
            <div className="text-sm text-gray-600">Events Created</div>
          </div>

          <div className="bg-white rounded-xl shadow p-6 text-center">
            <div className="flex items-center justify-center gap-2 text-gabriola-green mb-2">
              <Calendar className="w-6 h-6" />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))}
            </div>
            <div className="text-sm text-gray-600">Days on Gabriola Connects</div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Posts */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-gabriola-green" />
              Recent Posts
            </h2>
            {recentPosts.length > 0 ? (
              <div className="space-y-3">
                {recentPosts.map(post => (
                  <Link
                    key={post.id}
                    href={`/community/thread/${post.id}`}
                    className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                  >
                    <h3 className="font-medium text-gray-900 mb-1">
                      {post.title}
                    </h3>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{format(new Date(post.created_at), 'MMM d, yyyy')}</span>
                      <span>💬 {post.reply_count || 0}</span>
                      <span>👍 {post.vote_score || 0}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No recent posts</p>
            )}
          </div>

          {/* Recent Events */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-gabriola-green" />
              Upcoming Events
            </h2>
            {recentEvents.length > 0 ? (
              <div className="space-y-3">
                {recentEvents.map(event => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                  >
                    <h3 className="font-medium text-gray-900 mb-1">
                      {event.title}
                    </h3>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>📅 {format(new Date(event.start_date), 'MMM d, yyyy')}</span>
                      {event.location && <span>📍 {event.location}</span>}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No upcoming events</p>
            )}
          </div>
        </div>
      </div>

      {/* Send Message Modal */}
      {showMessageModal && canMessage && (
        <SendMessageModal
          recipientId={profile.id}
          recipientName={profile.full_name}
          currentUserId={user!.id}
          onClose={() => setShowMessageModal(false)}
        />
      )}
    </div>
  );
}
