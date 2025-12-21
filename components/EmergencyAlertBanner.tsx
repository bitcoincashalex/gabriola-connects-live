// components/EmergencyAlertBanner.tsx
// Version: 2.2.0 - Fixed mobile dismiss button with larger touch target (44x44px minimum)
// Date: 2025-12-20
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X } from 'lucide-react';
import Link from 'next/link';

interface Alert {
  id: string;
  severity: 'info' | 'advisory' | 'warning' | 'emergency';
  title: string;
  message: string;
  on_behalf_of_name?: string;
  on_behalf_of_organization?: string;
  affected_areas?: string[];
  action_required?: string;
  contact_info?: string;
  created_at: string;
  creator_name?: string;  // From JOIN with users table
}

export default function EmergencyAlertBanner() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    fetchCriticalAlerts();
    
    // Check for dismissed alerts in localStorage
    const stored = localStorage.getItem('dismissed_alerts');
    if (stored) {
      try {
        setDismissed(JSON.parse(stored));
      } catch (e) {
        // Invalid JSON, ignore
      }
    }
  }, []);

  const fetchCriticalAlerts = async () => {
    // FIXED: Added expires_at filter to prevent showing expired alerts
    const { data, error } = await supabase
      .from('alerts')
      .select(`
        *,
        creator:users!issued_by(full_name)
      `)
      .eq('active', true)
      .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)  // FIXED: Filter expired
      .in('severity', ['emergency', 'warning']) // ONLY red and orange
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Flatten creator data and sort by severity priority
      const formattedAlerts = data.map(alert => ({
        ...alert,
        creator_name: alert.creator?.full_name,
      }));
      
      const sorted = formattedAlerts.sort((a, b) => {
        const priority = { emergency: 1, warning: 2 };
        return priority[a.severity as 'emergency' | 'warning'] - priority[b.severity as 'emergency' | 'warning'];
      });
      setAlerts(sorted);
    }
  };

  const dismissAlert = (alertId: string, severity: string) => {
    // Emergency alerts CANNOT be dismissed
    if (severity === 'emergency') return;
    
    // Only warning alerts can be dismissed
    const newDismissed = [...dismissed, alertId];
    setDismissed(newDismissed);
    localStorage.setItem('dismissed_alerts', JSON.stringify(newDismissed));
  };

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'emergency':
        return {
          bg: 'bg-red-600',
          border: 'border-red-700',
          text: 'text-white',
          icon: '🆘',
        };
      case 'warning':
        return {
          bg: 'bg-orange-500',
          border: 'border-orange-600',
          text: 'text-white',
          icon: '⚠️',
        };
      default:
        return {
          bg: 'bg-gray-500',
          border: 'border-gray-600',
          text: 'text-white',
          icon: 'ℹ️',
        };
    }
  };

  // Filter out dismissed alerts (but ALWAYS show emergency)
  const visibleAlerts = alerts.filter(alert => 
    alert.severity === 'emergency' || !dismissed.includes(alert.id)
  );

  if (visibleAlerts.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      {visibleAlerts.map((alert) => {
        const styles = getSeverityStyles(alert.severity);
        const canDismiss = alert.severity !== 'emergency';

        return (
          <div
            key={alert.id}
            className={`${styles.bg} ${styles.border} border-b-2 ${styles.text} shadow-lg`}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <span className="text-2xl flex-shrink-0 mt-1">{styles.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg sm:text-xl font-bold">
                        {alert.title}
                      </h3>
                      <span className="text-xs bg-white/20 px-2 py-1 rounded uppercase font-bold">
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-sm sm:text-base opacity-95 mb-2">
                      {alert.message}
                    </p>

                    {/* Additional info */}
                    <div className="flex flex-wrap gap-4 text-xs sm:text-sm opacity-90">
                      {alert.affected_areas && alert.affected_areas.length > 0 && (
                        <div>
                          <strong>Areas:</strong> {alert.affected_areas.join(', ')}
                        </div>
                      )}
                      {alert.action_required && (
                        <div>
                          <strong>Action:</strong> {alert.action_required}
                        </div>
                      )}
                      {alert.contact_info && (
                        <div>
                          <strong>Contact:</strong> {alert.contact_info}
                        </div>
                      )}
                    </div>

                    {/* Issuer - show who created it */}
                    <div className="mt-2 text-xs opacity-75">
                      Created by {alert.creator_name || 'Unknown'}
                      {(alert.on_behalf_of_name || alert.on_behalf_of_organization) && (
                        <span>
                          {' '}on behalf of {alert.on_behalf_of_name}
                          {alert.on_behalf_of_organization && ` (${alert.on_behalf_of_organization})`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 flex-shrink-0">
                  <Link
                    href="/alerts"
                    className="bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition whitespace-nowrap"
                  >
                    View All Alerts →
                  </Link>
                  
                  {canDismiss && (
                    <button
                      onClick={() => dismissAlert(alert.id, alert.severity)}
                      className="p-3 sm:p-2 hover:bg-white/20 rounded-lg transition touch-manipulation"
                      aria-label="Dismiss warning alert"
                      title="Dismiss this warning"
                    >
                      <X className="w-6 h-6 sm:w-5 sm:h-5" />
                    </button>
                  )}

                  {!canDismiss && (
                    <div className="text-xs opacity-75 px-2 py-2 whitespace-nowrap">
                      Cannot dismiss
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
