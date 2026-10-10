// components/DirectoryWidget.tsx
// Business count line for the front page Directory card
// Version: 6.0.0 - Front page redesign: the card (icon, title) is now drawn by the front page;
//                  this is the one line under the title, in dark text for the white card.
// Previous: 5.0.1 - Error state: removed nested Sign In link (link inside the card link is invalid HTML)
// Date: 2026-10-10

'use client';

import { useState, useEffect } from 'react';
import { queryWithTimeout, supabase } from '@/lib/supabaseWithTimeout';

export function DirectoryWidget() {
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setHasError(false);
        // Get total approved businesses (with timeout)
        const { count: total } = await queryWithTimeout(async () =>
          supabase
            .from('directory_businesses')
            .select('*', { count: 'exact', head: true })
            .eq('is_approved', true)
        );

        setTotalCount(total || 0);
      } catch (error) {
        console.error('Error loading directory stats:', error);
        setHasError(true);
        setTotalCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();

    // Refresh every 5 minutes
    const interval = setInterval(loadStats, 300000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) return <span>Local businesses &amp; services</span>;
  if (hasError) return <span>Local businesses &amp; services</span>;

  return (
    <span className="text-sm text-[#1F2A24]">
      <strong>{totalCount} local {totalCount === 1 ? 'business' : 'businesses'}</strong> · Support local · Shop Gabriola
    </span>
  );
}
