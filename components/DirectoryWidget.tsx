// components/DirectoryWidget.tsx
// Shows business count only (simplified - no hours checking)
// Version: 1.1.0
// Date: 2025-12-11

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function DirectoryWidget() {
  const [totalCount, setTotalCount] = useState(0);
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
        {totalCount} local {totalCount === 1 ? 'business' : 'businesses'}
      </div>
    </div>
  );
}
