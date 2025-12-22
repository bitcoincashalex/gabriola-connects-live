// components/DirectoryWidget.tsx
// Shows business count with simple invite - REDESIGNED to match Alerts widget style
// Version: 5.0.0 - Added timeout handling + error state
// Date: 2025-12-22

'use client';

import { useState, useEffect } from 'react';
import { queryWithTimeout, supabase } from '@/lib/supabaseWithTimeout';
import { Book, AlertCircle } from 'lucide-react';
import Link from 'next/link';

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

  if (isLoading) {
    return (
      <div className="text-white/70 text-sm">
        Loading...
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-white/20 rounded-full flex-shrink-0">
            <Book className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-3xl font-bold text-white">Directory</h3>
        </div>
        
        <div className="text-sm text-white/90">Local businesses & services</div>
        
        {/* Timeout Error State */}
        <div className="text-center py-2">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-white/90" />
          <p className="font-medium text-sm mb-1 text-white">Unable to load directory</p>
          <p className="text-xs text-white/70 mb-3">Sign in to see the latest</p>
          <Link
            href="/signin"
            className="inline-block px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Big Icon LEFT + Big Title RIGHT - Like Alerts */}
      <div className="flex items-center gap-4">
        {/* Big Icon in Circle */}
        <div className="p-4 bg-white/20 rounded-full flex-shrink-0">
          <Book className="w-10 h-10 text-white" />
        </div>
        
        {/* Big Title */}
        <h3 className="text-3xl font-bold text-white">
          Directory
        </h3>
      </div>
      
      {/* Description */}
      <div className="text-sm text-white/90">
        Local businesses & services
      </div>
      
      {/* Business Count - Large & Visible */}
      <div className="text-lg font-semibold text-white">
        {totalCount} local {totalCount === 1 ? 'business' : 'businesses'}
      </div>
      
      {/* Simple Invite Message */}
      <div className="text-base text-white/90 font-medium">
        Support local • Shop Gabriola
      </div>
    </div>
  );
}
