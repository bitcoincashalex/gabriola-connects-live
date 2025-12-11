// components/DirectoryWidget.tsx
// Shows business count and how many are currently open
// Version: 1.0.0
// Date: 2025-12-11

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface BusinessHours {
  monday_open?: string;
  monday_close?: string;
  tuesday_open?: string;
  tuesday_close?: string;
  wednesday_open?: string;
  wednesday_close?: string;
  thursday_open?: string;
  thursday_close?: string;
  friday_open?: string;
  friday_close?: string;
  saturday_open?: string;
  saturday_close?: string;
  sunday_open?: string;
  sunday_close?: string;
}

export function DirectoryWidget() {
  const [totalCount, setTotalCount] = useState(0);
  const [openCount, setOpenCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        // Get total approved businesses
        const { count: total } = await supabase
          .from('directory_businesses')
          .select('*', { count: 'exact', head: true })
          .eq('is_approved', true);

        setTotalCount(total || 0);

        // Get all businesses with hours to check if open
        const { data: businesses } = await supabase
          .from('directory_businesses')
          .select('id, monday_open, monday_close, tuesday_open, tuesday_close, wednesday_open, wednesday_close, thursday_open, thursday_close, friday_open, friday_close, saturday_open, saturday_close, sunday_open, sunday_close')
          .eq('is_approved', true);

        if (businesses) {
          const now = new Date();
          const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof BusinessHours;
          const currentTime = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

          const openNow = businesses.filter(business => {
            const openTimeKey = `${currentDay}_open` as keyof BusinessHours;
            const closeTimeKey = `${currentDay}_close` as keyof BusinessHours;
            
            const openTime = (business as any)[openTimeKey];
            const closeTime = (business as any)[closeTimeKey];

            if (!openTime || !closeTime) return false;

            // Simple time comparison (handles most cases)
            return currentTime >= openTime && currentTime <= closeTime;
          });

          setOpenCount(openNow.length);
        }
      } catch (error) {
        console.error('Error loading directory stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();

    // Refresh every 5 minutes
    const interval = setInterval(loadStats, 300000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="text-xs text-white/70">
        Loading...
      </div>
    );
  }

  return (
    <div className="text-xs text-white">
      <div className="font-semibold">
        {totalCount} {totalCount === 1 ? 'business' : 'businesses'}
        {openCount > 0 && (
          <span className="text-white/90"> • {openCount} open now</span>
        )}
      </div>
    </div>
  );
}
