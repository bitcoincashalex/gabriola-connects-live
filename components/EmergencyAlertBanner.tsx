// components/EmergencyAlertBanner.tsx
// v1.0 - Dec 8, 2025 - Display active alerts on main page
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
  issuer_name: string;
  issuer_organization?: string;
  affected_areas?: string[];
  action_required?: string;
  contact_info?: string;
  created_at: string;
}

export default function EmergencyAlertBanner() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    fetchActiveAlerts();
    
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

  const fetchActiveAlerts = async () => {
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Sort by severity priority
      const sorted = data.sort((a, b) => {
        const priority = { emergency: 1, warning: 2, advisory: 3, info: 4 };
        return priority[a.severity as Alert['severity']] - priority[b.severity as Alert['severity']];
      });
      setAlerts(sorted);
    }
  };

  const dismissAlert = (alertId: string, severity: string) => {
    // Emergency alerts can't be dismissed
    if (severity === 'emergency') return;

    const newDismissed = [...dismissed, alertId];
    setDismissed(newDismissed);
    localStorage.setItem('dismissed_alerts', JSON.stringify(newDismissed));
  };

  const getSeverityStyle = (severity: Alert['severity']) => {
    const styles = {
      emergency: {
        bg: 'bg-red-600',
        text: 'text-white',
        border: 'border-red-700',
        icon: '🆘',
      },
      warning: {
        bg: 'bg-orange-500',
        text: 'text-white',
        border: 'border-orange-600',
        icon: '🚨',
      },
      advisory: {
        bg: 'bg-yellow-400',
        text: 'text-gray-900',
        border: 'border-yellow-500',
        icon: '⚠️',
      },
      info: {
        bg: 'bg-blue-500',
        text: 'text-white',
        border: 'border-blue-600',
        icon: '📢',
      },
    };
    return styles[severity];
  };

  // Filter out dismissed alerts (but always show emergency)
  const visibleAlerts = alerts.filter(alert => 
    alert.severity === 'emergency' || !dismissed.includes(alert.id)
  );

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {visibleAlerts.map(alert => {
        const style = getSeverityStyle(alert.severity);
        const canDismiss = alert.severity !== 'emergency';

        return (
          <div
            key={alert.id}
            className={`${style.bg} ${style.text} ${style.border} border-l-4 p-4 shadow-lg`}
          >
            <div className="max-w-7xl mx-auto">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{style.icon}</span>
                    <span className="font-bold uppercase text-sm tracking-wide">
                      {alert.severity}
                    </span>
                    {alert.affected_areas && alert.affected_areas.length > 0 && (
                      <span className="text-sm opacity-90">
                        • {alert.affected_areas.join(', ')}
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-xl font-bold mb-1">
                    {alert.title}
                  </h3>
                  
                  <p className="text-sm opacity-95 mb-2">
                    {alert.message}
                  </p>

                  {alert.action_required && (
                    <div className="bg-black/10 rounded-lg p-3 mb-2">
                      <p className="font-semibold text-sm">⚡ Action Required:</p>
                      <p className="text-sm mt-1">{alert.action_required}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs opacity-75 mt-2">
                    <span>
                      {alert.issuer_name}
                      {alert.issuer_organization && ` (${alert.issuer_organization})`}
                    </span>
                    {alert.contact_info && (
                      <span>• {alert.contact_info}</span>
                    )}
                    <Link 
                      href="/alerts" 
                      className="underline hover:no-underline ml-auto"
                    >
                      View all alerts →
                    </Link>
                  </div>
                </div>

                {canDismiss && (
                  <button
                    onClick={() => dismissAlert(alert.id, alert.severity)}
                    className="p-1 hover:bg-black/10 rounded-full transition-colors"
                    title="Dismiss alert"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
