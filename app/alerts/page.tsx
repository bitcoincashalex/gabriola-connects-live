// app/alerts/page.tsx
// Version: 1.0.0 - PUBLIC alerts view, anyone can see active alerts
// Date: 2025-12-20
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { AlertTriangle, Bell, AlertCircle, Info, Clock, Building2, MapPin, Phone } from 'lucide-react';
import Link from 'next/link';
import Footer from '@/components/Footer';

interface Alert {
  id: string;
  severity: string;
  title: string;
  message: string;
  issued_by?: string | null;
  on_behalf_of_name?: string | null;
  on_behalf_of_organization?: string | null;
  created_at: string;
  expires_at?: string | null;
  active: boolean;
  affected_areas?: string[] | null;
  category?: string | null;
  contact_info?: string | null;
  action_required?: string | null;
  creator_name?: string;
  creator_email?: string;
}

export default function AlertsPage() {
  const { user } = useUser();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveAlerts();
  }, []);

  const fetchActiveAlerts = async () => {
    setLoading(true);

    // Fetch ACTIVE, non-expired alerts - PUBLIC access
    const { data } = await supabase
      .from('alerts')
      .select(`
        *,
        creator:users!issued_by(full_name, email)
      `)
      .eq('active', true)
      .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)
      .order('created_at', { ascending: false });

    if (data) {
      const formattedAlerts = data.map(alert => ({
        ...alert,
        creator_name: alert.creator?.full_name,
        creator_email: alert.creator?.email,
      }));
      
      // Sort by severity
      const sorted = formattedAlerts.sort((a, b) => {
        const priority: { [key: string]: number } = { 
          emergency: 1, 
          critical: 1,
          warning: 2, 
          important: 2,
          advisory: 3, 
          info: 4 
        };
        return (priority[a.severity] || 5) - (priority[b.severity] || 5);
      });
      
      setAlerts(sorted);
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
        className={`border-2 rounded-lg p-6 ${colorClass}`}
      >
        <div className="flex items-start gap-4">
          <Icon className="w-8 h-8 mt-1 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-2">
              <h2 className="font-bold text-xl">{alert.title}</h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${
                alert.severity === 'emergency' || alert.severity === 'critical'
                  ? 'bg-red-600 text-white'
                  : alert.severity === 'warning' || alert.severity === 'important'
                  ? 'bg-orange-600 text-white'
                  : alert.severity === 'advisory'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-blue-600 text-white'
              }`}>
                {alert.severity.toUpperCase()}
              </span>
            </div>
            
            <p className="text-gray-800 whitespace-pre-wrap mb-4 text-lg leading-relaxed">
              {alert.message}
            </p>
            
            {alert.action_required && (
              <div className="bg-white/50 border border-gray-300 rounded-lg p-3 mb-4">
                <p className="font-semibold text-sm mb-1">Action Required:</p>
                <p className="text-gray-700">{alert.action_required}</p>
              </div>
            )}
            
            <div className="space-y-2 text-sm text-gray-600">
              {alert.on_behalf_of_name || alert.on_behalf_of_organization ? (
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  <span className="font-medium">
                    {alert.on_behalf_of_name}
                    {alert.on_behalf_of_organization && ` (${alert.on_behalf_of_organization})`}
                  </span>
                </div>
              ) : null}
              
              {alert.affected_areas && alert.affected_areas.length > 0 && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>Affected areas: {alert.affected_areas.join(', ')}</span>
                </div>
              )}
              
              {alert.contact_info && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>{alert.contact_info}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-xs">
                <Clock className="w-4 h-4" />
                <span>
                  Posted: {new Date(alert.created_at).toLocaleString()}
                  {alert.expires_at && (
                    <> • Expires: {new Date(alert.expires_at).toLocaleString()}</>
                  )}
                </span>
              </div>

              {alert.category && (
                <div className="inline-block px-2 py-1 bg-gray-200 rounded text-xs font-medium">
                  {alert.category}
                </div>
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gabriola-green mb-2">
                Community Alerts
              </h1>
              <p className="text-gray-600">
                Stay informed about important community updates and emergency notifications
              </p>
            </div>
            
            {/* Manage My Alerts Button - Only for authorized users */}
            {user && (user.can_issue_alerts || user.is_super_admin) && (
              <Link
                href="/alerts/manage"
                className="bg-gabriola-green text-white px-6 py-3 rounded-lg hover:bg-gabriola-green-dark transition-colors font-medium"
              >
                Manage My Alerts
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gabriola-green mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading alerts...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-xl text-gray-600 mb-2">No active alerts</p>
            <p className="text-gray-500">Check back later for community updates</p>
          </div>
        ) : (
          <div className="space-y-6">
            {alerts.map(alert => renderAlert(alert))}
          </div>
        )}

        {/* Archive Link */}
        <div className="mt-8 text-center">
          <Link
            href="/alerts/archive"
            className="text-gabriola-green hover:underline font-medium"
          >
            View Archived Alerts →
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
