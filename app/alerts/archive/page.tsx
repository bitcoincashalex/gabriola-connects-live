// app/alerts/archive/page.tsx
// Version: 1.0.0 - PUBLIC archive view, anyone can see past alerts
// Date: 2025-12-20
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Archive, Clock, Building2, MapPin, AlertTriangle, AlertCircle, Bell, Info } from 'lucide-react';
import Link from 'next/link';

interface Alert {
  id: string;
  severity: string;
  title: string;
  message: string;
  on_behalf_of_name?: string | null;
  on_behalf_of_organization?: string | null;
  created_at: string;
  expires_at?: string | null;
  affected_areas?: string[] | null;
  category?: string | null;
}

export default function AlertsArchivePage() {
  const [archivedAlerts, setArchivedAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArchivedAlerts();
  }, []);

  const fetchArchivedAlerts = async () => {
    setLoading(true);

    // Fetch archived alerts - PUBLIC access
    const { data } = await supabase
      .from('alerts')
      .select('*')
      .eq('active', false)
      .order('created_at', { ascending: false })
      .limit(100);

    if (data) {
      setArchivedAlerts(data);
    }

    setLoading(false);
  };

  const renderAlert = (alert: Alert) => {
    const severityColors: { [key: string]: string } = {
      emergency: 'bg-red-50 border-red-300',
      critical: 'bg-red-50 border-red-300',
      warning: 'bg-orange-50 border-orange-300',
      important: 'bg-orange-50 border-orange-300',
      advisory: 'bg-yellow-50 border-yellow-300',
      info: 'bg-blue-50 border-blue-300',
    };

    const severityIcons: { [key: string]: any } = {
      emergency: AlertTriangle,
      critical: AlertTriangle,
      warning: AlertCircle,
      important: AlertCircle,
      advisory: Bell,
      info: Info,
    };

    const Icon = severityIcons[alert.severity] || Info;
    const colorClass = severityColors[alert.severity] || 'bg-gray-50 border-gray-300';

    return (
      <div
        key={alert.id}
        className={`border-2 rounded-lg p-4 ${colorClass} opacity-75`}
      >
        <div className="flex items-start gap-3">
          <Icon className="w-6 h-6 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-1">
              <h3 className="font-bold text-lg">{alert.title}</h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap bg-gray-600 text-white">
                ARCHIVED
              </span>
            </div>
            
            <p className="text-gray-700 mb-2 line-clamp-3">{alert.message}</p>
            
            <div className="space-y-1 text-xs text-gray-600">
              {alert.on_behalf_of_organization && (
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3 h-3" />
                  <span>{alert.on_behalf_of_organization}</span>
                </div>
              )}
              
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                <span>
                  {new Date(alert.created_at).toLocaleDateString()}
                </span>
              </div>

              {alert.category && (
                <span className="inline-block px-2 py-0.5 bg-gray-200 rounded">
                  {alert.category}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/alerts"
              className="text-gabriola-green hover:underline font-medium"
            >
              ← Back to Active Alerts
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Archive className="w-10 h-10 text-gray-600" />
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">
                Alert Archive
              </h1>
              <p className="text-gray-600">
                View past community alerts and notifications
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Archive List */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gabriola-green mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading archive...</p>
          </div>
        ) : archivedAlerts.length === 0 ? (
          <div className="text-center py-12">
            <Archive className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-xl text-gray-600">No archived alerts</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {archivedAlerts.map(alert => renderAlert(alert))}
          </div>
        )}
      </div>
    </div>
  );
}
