// components/AlertsWidget.tsx
// v3.0.0 - Front page redesign: draws the whole Community Alerts card. White when all clear;
//          the card turns red (emergency/warning), amber (advisory) or navy (info) only when
//          an alert is active. Shows how many alerts are active. No emoji.
// Previous: v2.0.1 - Error state: removed Sign In link (it sat inside the alerts banner button, invalid HTML)
// Previous: v2.0.0 - Shows top active alert summary for landing page + timeout handling
// Date: 2026-10-10
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { queryWithTimeout, supabase } from '@/lib/supabaseWithTimeout';
import { Bell, ChevronRight } from 'lucide-react';
import { HomeCard } from '@/components/HomeCard';

interface Alert {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'advisory' | 'warning' | 'emergency';
  category: string;
  created_at: string;
}

const SEVERITY_ORDER: Record<string, number> = { emergency: 4, warning: 3, advisory: 2, info: 1 };

const SEVERITY_STYLE: Record<string, { bg: string; label: string }> = {
  emergency: { bg: 'bg-[#B42318]', label: 'EMERGENCY' },
  warning: { bg: 'bg-[#B42318]', label: 'WARNING' },
  advisory: { bg: 'bg-[#9A4A00]', label: 'ADVISORY' },
  info: { bg: 'bg-[#002774]', label: 'INFO' },
};

export function AlertsWidget() {
  const [topAlert, setTopAlert] = useState<Alert | null>(null);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    fetchTopAlert();
  }, []);

  const fetchTopAlert = async () => {
    try {
      setHasError(false);
      // Get all active alerts (with timeout)
      const { data, error } = await queryWithTimeout(async () =>
        supabase
          .from('alerts')
          .select('id, title, message, severity, category, created_at')
          .eq('active', true)
          .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)
          .order('created_at', { ascending: false })
      );

      if (error || !data || data.length === 0) {
        setTopAlert(null);
        setActiveCount(0);
        return;
      }

      // Most severe first, then newest
      const sorted = [...data].sort((a, b) => {
        const diff = (SEVERITY_ORDER[b.severity as string] || 0) - (SEVERITY_ORDER[a.severity as string] || 0);
        if (diff !== 0) return diff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setTopAlert(sorted[0] as Alert);
      setActiveCount(sorted.length);
    } catch (error) {
      console.error('Error fetching top alert:', error);
      setHasError(true);
      setTopAlert(null);
      setActiveCount(0);
    } finally {
      setLoading(false);
    }
  };

  if (!topAlert) {
    const line = loading
      ? 'Loading alerts...'
      : hasError
        ? 'Unable to load alerts. Please refresh the page to try again.'
        : 'No active alerts — all clear!';
    return (
      <HomeCard
        href="/alerts"
        icon={Bell}
        title="Community Alerts"
        subtitle={<span className={!loading && !hasError ? 'text-sm font-semibold text-gabriola-green' : ''}>{line}</span>}
      />
    );
  }

  const style = SEVERITY_STYLE[topAlert.severity] || SEVERITY_STYLE.info;
  const category = topAlert.category ? topAlert.category.charAt(0).toUpperCase() + topAlert.category.slice(1) : '';

  return (
    <Link
      href="/alerts"
      className={`group block ${style.bg} text-white rounded-2xl p-5 shadow-md hover:shadow-lg transition-shadow`}
    >
      <div className="flex items-start gap-3">
        <div className="relative w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <Bell className="w-[22px] h-[22px]" aria-hidden="true" />
          {activeCount > 1 && (
            <span className="absolute -top-2 -right-2 bg-white text-[#1F2A24] text-xs font-bold min-w-[22px] h-[22px] px-1 rounded-full flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-display text-[21px] font-bold leading-tight">Community Alerts</h2>
          </div>
          <div className="text-xs font-bold tracking-wide mt-1">
            {style.label}{category && <span className="font-medium opacity-90"> · {category}</span>}
          </div>
          <div className="font-semibold mt-1 line-clamp-1">{topAlert.title}</div>
          <div className="text-sm opacity-95 line-clamp-2">{topAlert.message}</div>
        </div>
        <ChevronRight className="w-5 h-5 flex-shrink-0 mt-2 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
      </div>
    </Link>
  );
}
