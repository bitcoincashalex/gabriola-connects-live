// Path: components/ProfilePreviewCard.tsx
// Version: 1.1.0 - COMPLETE REWRITE: Mobile click support + simplified positioning
// Date: 2025-12-22

'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isMounted, setIsMounted] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const calculatePosition = () => {
    if (!triggerRef.current) return { top: 0, left: 0 };
    
    const rect = triggerRef.current.getBoundingClientRect();
    const cardWidth = 320;
    const cardHeight = 400;
    const gap = 8;
    const padding = 16;
    
    let top = 0;
    let left = 0;
    
    // Vertical: Check if there's room below, otherwise show above
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow >= cardHeight + gap) {
      // Show below
      top = rect.bottom + window.scrollY + gap;
    } else {
      // Show above
      top = rect.top + window.scrollY - cardHeight - gap;
    }
    
    // Horizontal: Keep on screen
    left = rect.left + window.scrollX;
    if (left + cardWidth > window.innerWidth) {
      left = window.innerWidth - cardWidth - padding;
    }
    left = Math.max(padding, left);
    
    return { top, left };
  };

  const fetchProfile = async () => {
    if (profile || loading) return;
    
    setLoading(true);
    
    const { data, error } = await supabase
      .from('users')
      .select('id, username, full_name, avatar_url, bio, is_resident, created_at, events_created_count')
      .eq('id', userId)
      .single();
    
    if (data && !error) {
      // Count non-anonymous posts
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

  const handleShow = (e?: React.MouseEvent | React.TouchEvent) => {
    // Stop propagation to prevent interference with other elements
    e?.stopPropagation();
    
    // Clear any existing timeouts
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    
    // Calculate position
    const pos = calculatePosition();
    setPosition(pos);
    
    // Show immediately on click (mobile), or after delay on hover (desktop)
    if (e?.type === 'click' || e?.type === 'touchstart') {
      setShowCard(true);
      fetchProfile();
    } else {
      // Hover - small delay to avoid accidental triggers
      hoverTimeoutRef.current = setTimeout(() => {
        setShowCard(true);
        fetchProfile();
      }, 300);
    }
  };

  const handleHide = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    hideTimeoutRef.current = setTimeout(() => {
      setShowCard(false);
    }, 400);
  };

  const handleCardEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
  };

  const handleCardLeave = () => {
    setShowCard(false);
  };

  // Close card when clicking outside
  useEffect(() => {
    if (!showCard) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (
        cardRef.current && 
        !cardRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setShowCard(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCard]);

  const card = showCard && profile && (
    <div
      ref={cardRef}
      className="fixed z-[10000] w-80 bg-white rounded-xl shadow-2xl border-2 border-gray-200 p-6 pointer-events-auto"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      onMouseEnter={handleCardEnter}
      onMouseLeave={handleCardLeave}
      onClick={(e) => e.stopPropagation()}
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
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-gray-900 truncate">
            {profile.full_name || profile.username}
          </h3>
          <p className="text-sm text-gray-600">@{profile.username}</p>
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
      <div className="grid grid-cols-3 gap-4 mb-4 pb-4 border-b border-gray-200">
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
  );

  const loadingCard = showCard && loading && (
    <div
      className="fixed z-[10000] w-80 bg-white rounded-xl shadow-2xl border-2 border-gray-200 p-6"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
    >
      <div className="animate-pulse">
        <div className="flex gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-gray-200"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded mb-2 w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
        <div className="h-3 bg-gray-200 rounded mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
      </div>
    </div>
  );

  return (
    <>
      <div
        ref={triggerRef}
        className="relative inline-block cursor-pointer"
        onMouseEnter={handleShow}
        onMouseLeave={handleHide}
        onClick={handleShow}
      >
        {children}
      </div>
      
      {/* Render card in portal to body */}
      {isMounted && createPortal(
        <>
          {card}
          {loadingCard}
        </>,
        document.body
      )}
    </>
  );
}
