// components/AlertsWidget.tsx
// v1.0.0 - Shows top active alert summary for landing page
// Date: 2025-12-11
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, Info, AlertCircle } from 'lucide-react';

interface Alert {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'advisory' | 'warning' | 'emergency';
  category: string;
  created_at: string;
}

export function AlertsWidget() {
  const [topAlert, setTopAlert] = useState<Alert | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopAlert();
  }, []);

  const fetchTopAlert = async () => {
    try {
      // Get most severe active alert (emergency > warning > advisory > info)
      const { data, error } = await supabase
        .from('alerts')
        .select('id, title, message, severity, category, created_at')
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)
        .order('severity', { ascending: false }) // emergency first
        .order('created_at', { ascending: false }) // newest first
        .limit(1)
        .single();

      if (!error && data) {
        setTopAlert(data);
      }
    } catch (error) {
      console.error('Error fetching top alert:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'emergency':
        return <AlertTriangle className="w-4 h-4" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4" />;
      case 'advisory':
        return <AlertCircle className="w-4 h-4" />;
      case 'info':
        return <Info className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'emergency':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-600/20 text-red-100 rounded text-xs font-bold border border-red-400/30">
            {getSeverityIcon(severity)}
            EMERGENCY
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-600/20 text-orange-100 rounded text-xs font-bold border border-orange-400/30">
            {getSeverityIcon(severity)}
            WARNING
          </span>
        );
      case 'advisory':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-600/20 text-yellow-100 rounded text-xs font-bold border border-yellow-400/30">
            {getSeverityIcon(severity)}
            ADVISORY
          </span>
        );
      case 'info':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-600/20 text-blue-100 rounded text-xs font-bold border border-blue-400/30">
            {getSeverityIcon(severity)}
            INFO
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="text-white/70 text-sm">
        Loading alerts...
      </div>
    );
  }

  if (!topAlert) {
    return (
      <div className="text-white/90 text-sm">
        ✅ No active alerts — all clear!
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Severity Badge */}
      <div className="flex items-center gap-2">
        {getSeverityBadge(topAlert.severity)}
        <span className="text-xs text-white/60">
          {topAlert.category.charAt(0).toUpperCase() + topAlert.category.slice(1)}
        </span>
      </div>

      {/* Alert Title */}
      <div className="font-semibold text-white line-clamp-1">
        {topAlert.title}
      </div>

      {/* Alert Message (truncated) */}
      <div className="text-sm text-white/80 line-clamp-2">
        {topAlert.message}
      </div>
    </div>
  );
}
