// components/DirectoryWidget.tsx
// Shows business count - REDESIGNED with icon + title layout
// Version: 3.0.0 - Icon and title on same line
// Date: 2025-12-11

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Book } from 'lucide-react';

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
      <div className="text-sm text-white/70">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Icon + Title on same line */}
      <div className="flex items-center gap-2">
        <Book className="w-5 h-5 text-white" />
        <h3 className="text-lg font-bold text-white">Directory</h3>
      </div>
      
      {/* Description */}
      <div className="text-sm text-white/90">
        Local businesses & services
      </div>
      
      {/* Divider */}
      <div className="border-t border-white/20 pt-2">
        {/* Business Count - Large & Visible */}
        <div className="text-lg font-semibold text-white">
          {totalCount} local {totalCount === 1 ? 'business' : 'businesses'}
        </div>
      </div>
    </div>
  );
}
