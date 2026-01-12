// app/alerts/archive/page.tsx
// Version: 2.0.0 - PUBLIC archive with Expired/Archived tabs, image/link support, click-to-expand lightbox
// Date: 2025-01-11
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Archive, Clock, Building2, MapPin, AlertTriangle, AlertCircle, Bell, Info, ExternalLink, X } from 'lucide-react';
import Link from 'next/link';
import Footer from '@/components/Footer';

interface Alert {
  id: string;
  severity: string;
  title: string;
  message: string;
  on_behalf_of_name?: string | null;
  on_behalf_of_organization?: string | null;
  organization?: string | null; // alerts_archive uses this field name
  created_at: string;
  expires_at?: string | null;
  affected_areas?: string[] | null;
  category?: string | null;
  contact_info?: string | null;
  action_required?: string | null;
  image_url?: string | null;
  link_url?: string | null;
  link_text?: string | null;
}

export default function AlertsArchivePage() {
  const [expiredAlerts, setExpiredAlerts] = useState<Alert[]>([]);
  const [archivedAlerts, setArchivedAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'expired' | 'archived'>('expired');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    fetchExpiredAlerts();
    fetchArchivedAlerts();
  }, []);

  // ESC key to close lightbox
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxImage(null);
      }
    };
    
    if (lightboxImage) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [lightboxImage]);

  const fetchExpiredAlerts = async () => {
    setLoading(true);

    // Fetch EXPIRED alerts from alerts table (active but past expiration)
    const { data } = await supabase
      .from('alerts')
      .select(`
        *,
        creator:users!issued_by(full_name, email)
      `)
      .eq('active', true)
      .lt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(100);

    if (data) {
      setExpiredAlerts(data);
    }

    setLoading(false);
  };

  const fetchArchivedAlerts = async () => {
    // Fetch ARCHIVED alerts from alerts table (active = false)
    // This matches what /alerts/manage shows in the Archived tab
    const { data } = await supabase
      .from('alerts')
      .select(`
        *,
        creator:users!issued_by(full_name, email)
      `)
      .eq('active', false)
      .order('created_at', { ascending: false })
      .limit(100);

    if (data) {
      setArchivedAlerts(data);
    }
  };

  const renderAlert = (alert: Alert, isArchived: boolean) => {
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
        className={`border-2 rounded-lg p-6 ${colorClass} opacity-90`}
      >
        <div className="flex items-start gap-4">
          <Icon className="w-8 h-8 mt-1 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-2">
              <h2 className="font-bold text-xl">{alert.title}</h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${
                isArchived ? 'bg-gray-600 text-white' : 'bg-yellow-600 text-white'
              }`}>
                {isArchived ? 'ARCHIVED' : 'EXPIRED'}
              </span>
            </div>
            
            <p className="text-gray-800 whitespace-pre-wrap mb-4 text-lg leading-relaxed">
              {alert.message}
            </p>
            
            {/* Alert Image */}
            {alert.image_url && (
              <div className="mb-4">
                <img 
                  src={alert.image_url} 
                  alt={alert.title}
                  onClick={() => setLightboxImage(alert.image_url || null)}
                  className="w-full max-h-96 object-cover rounded-lg border-2 border-gray-300 cursor-pointer hover:border-gabriola-green transition-colors"
                  title="Click to view full size"
                />
              </div>
            )}

            {/* External Link */}
            {alert.link_url && (
              <div className="mb-4">
                <a
                  href={alert.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold transition-colors"
                >
                  {alert.link_text || 'More Information'}
                  <ExternalLink className="w-5 h-5" />
                </a>
              </div>
            )}
            
            {alert.action_required && (
              <div className="bg-white/50 border border-gray-300 rounded-lg p-3 mb-4">
                <p className="font-semibold text-sm mb-1">Action Required:</p>
                <p className="text-gray-700">{alert.action_required}</p>
              </div>
            )}
            
            <div className="space-y-2 text-sm text-gray-600">
              {(alert.on_behalf_of_name || alert.on_behalf_of_organization || alert.organization) && (
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  <span className="font-medium">
                    {alert.on_behalf_of_name}
                    {(alert.on_behalf_of_organization || alert.organization) && 
                      ` (${alert.on_behalf_of_organization || alert.organization})`}
                  </span>
                </div>
              )}
              
              {alert.affected_areas && alert.affected_areas.length > 0 && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>Affected areas: {alert.affected_areas.join(', ')}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-xs">
                <Clock className="w-4 h-4" />
                <span>
                  Posted: {new Date(alert.created_at).toLocaleString()}
                  {alert.expires_at && (
                    <> • Expired: {new Date(alert.expires_at).toLocaleString()}</>
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
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

      {/* Archive List - flex-1 makes it grow to fill space */}
      <div className="flex-1 max-w-6xl mx-auto px-6 py-8 w-full">
        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-300">
          <button
            onClick={() => setViewMode('expired')}
            className={`px-4 py-2 font-medium transition-colors ${
              viewMode === 'expired'
                ? 'border-b-2 border-gabriola-green text-gabriola-green'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Expired ({expiredAlerts.length})
          </button>
          <button
            onClick={() => setViewMode('archived')}
            className={`px-4 py-2 font-medium transition-colors ${
              viewMode === 'archived'
                ? 'border-b-2 border-gabriola-green text-gabriola-green'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Archived ({archivedAlerts.length})
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gabriola-green mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading alerts...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {viewMode === 'expired' && expiredAlerts.length === 0 && (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-xl text-gray-600 mb-2">No expired alerts</p>
                <p className="text-gray-500">Expired alerts appear here temporarily</p>
              </div>
            )}
            
            {viewMode === 'archived' && archivedAlerts.length === 0 && (
              <div className="text-center py-12">
                <Archive className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-xl text-gray-600 mb-2">No archived alerts</p>
                <p className="text-gray-500">Archived alerts are stored here permanently</p>
              </div>
            )}

            {viewMode === 'expired' && expiredAlerts.map(alert => renderAlert(alert, false))}
            {viewMode === 'archived' && archivedAlerts.map(alert => renderAlert(alert, true))}
          </div>
        )}
      </div>

      {/* Image Lightbox Modal */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-7xl max-h-screen">
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 p-2 transition-colors"
              title="Close (ESC)"
            >
              <X className="w-8 h-8" />
            </button>
            <img 
              src={lightboxImage} 
              alt="Full size"
              className="max-w-full max-h-screen object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
