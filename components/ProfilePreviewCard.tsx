// Path: components/ProfilePreviewCard.tsx
// Version: 1.0.2 - Fixed hover + from=forum + PRIVACY: exclude anonymous posts
// Date: 2025-12-22

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Calendar, MessageCircle, CalendarDays, Award } from 'lucide-react';
import { format } from 'date-fns';

interface ProfilePreviewCardProps {
  userId: string;
  children: React.ReactNode;
}

export default function ProfilePreviewCard({ userId, children }: ProfilePreviewCardProps) {
  const [showCard, setShowCard] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const [hideTimeout, setHideTimeout] = useState<NodeJS.Timeout | null>(null);

  const fetchProfile = async () => {
    if (profile || loading) return; // Already loaded or loading
    
    setLoading(true);
    
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        username,
        full_name,
        avatar_url,
        bio,
        is_resident,
        created_at,
        posts_count,
        events_created_count
      `)
      .eq('id', userId)
      .eq('is_banned', false)
      .single();

    if (!error && data) {
      // Count only non-anonymous posts for privacy
      const { count: nonAnonymousPostCount } = await supabase
        .from('bbs_posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_active', true)
        .eq('is_anonymous', false);
      
      setProfile({ ...data, posts_count: nonAnonymousPostCount || 0 });
    }
    
    setLoading(false);
  };

  const handleMouseEnter = () => {
    // Delay showing card by 500ms to avoid accidental hovers
    const timeout = setTimeout(() => {
      setShowCard(true);
      fetchProfile();
    }, 500);
    setHoverTimeout(timeout);
  };

  const handleMouseLeave = () => {
    // Clear timeout if user moves away before card shows
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    
    // Set a timeout to hide the card
    const timeout = setTimeout(() => {
      setShowCard(false);
    }, 400);
    setHideTimeout(timeout);
  };
  
  const handleCardMouseEnter = () => {
    // Cancel hide timeout if mouse enters card
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      setHideTimeout(null);
    }
    setShowCard(true);
  };
  
  const handleCardMouseLeave = () => {
    // Hide immediately when leaving card
    setShowCard(false);
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      setHideTimeout(null);
    }
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger element (username) */}
      {children}

      {/* Hover Card */}
      {showCard && profile && (
        <div 
          className="absolute z-50 w-80 bg-white rounded-xl shadow-2xl border-2 border-gray-200 p-6 mt-2 left-0"
          onMouseEnter={handleCardMouseEnter}
          onMouseLeave={handleCardMouseLeave}
        >
          {/* Header */}
          <div className="flex items-start gap-4 mb-4">
            {/* Avatar */}
            {profile.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt={profile.full_name}
                className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-500">
                {profile.full_name?.charAt(0) || '?'}
              </div>
            )}

            {/* Name and badges */}
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900">
                {profile.full_name}
              </h3>
              <p className="text-sm text-gray-600">@{profile.username}</p>
              
              {/* Resident Badge */}
              {profile.is_resident && (
                <span className="inline-block mt-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                  🏝️ Resident
                </span>
              )}
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-sm text-gray-700 mb-4 line-clamp-3">
              {profile.bio}
            </p>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4 py-3 border-t border-b">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-gabriola-green mb-1">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div className="text-lg font-bold text-gray-900">
                {profile.posts_count || 0}
              </div>
              <div className="text-xs text-gray-500">Posts</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-gabriola-green mb-1">
                <CalendarDays className="w-4 h-4" />
              </div>
              <div className="text-lg font-bold text-gray-900">
                {profile.events_created_count || 0}
              </div>
              <div className="text-xs text-gray-500">Events</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-gabriola-green mb-1">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="text-xs text-gray-500">Joined</div>
              <div className="text-xs font-medium text-gray-900">
                {format(new Date(profile.created_at), 'MMM yyyy')}
              </div>
            </div>
          </div>

          {/* View Profile Button */}
          <Link
            href={`/profile/${profile.id}?from=forum`}
            className="block w-full text-center bg-gabriola-green text-white px-4 py-2 rounded-lg font-medium hover:bg-gabriola-green-dark transition"
            onClick={() => setShowCard(false)}
          >
            View Full Profile
          </Link>
        </div>
      )}

      {/* Loading State */}
      {showCard && loading && (
        <div className="absolute z-50 w-80 bg-white rounded-xl shadow-2xl border-2 border-gray-200 p-6 mt-2 left-0">
          <div className="animate-pulse">
            <div className="flex gap-4 mb-4">
              <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
            <div className="h-3 bg-gray-200 rounded mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      )}
    </div>
  );
}
