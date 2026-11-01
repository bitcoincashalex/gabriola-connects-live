// app/alerts/page.tsx
// Version: 3.0.1 - Gabriola time is fixed UTC-7 (lib/gabriolaTime.ts): B.C. no longer falls back, but many devices think it does
// Previous: 3.0.0 - Alerts redesign to match the rest of the site: each alert has a coloured band
//                  (red emergency/warning, amber advisory, navy info, same as the front page card)
//                  over a white card; times shown in Gabriola time; Alerts highlighted in the bottom
//                  menu; no longer asks the database for the name and email of whoever posted the
//                  alert (this page never showed them, but they were being sent to every visitor).
// Previous: 2.0.0 - PUBLIC alerts view with image/link support and click-to-expand lightbox
// Date: 2026-11-01
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { AlertTriangle, Bell, AlertCircle, Info, Clock, Building2, MapPin, Phone, ExternalLink, X } from 'lucide-react';
import Link from 'next/link';
import Footer from '@/components/Footer';
import { GABRIOLA_TZ } from '@/lib/gabriolaTime';

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
  image_url?: string | null;
  link_url?: string | null;
  link_text?: string | null;
}

const PRIORITY: Record<string, number> = {
  emergency: 1, critical: 1, warning: 2, important: 2, advisory: 3, info: 4,
};

const STYLE: Record<string, { band: string; label: string; icon: any }> = {
  emergency: { band: 'bg-[#B42318]', label: 'EMERGENCY', icon: AlertTriangle },
  critical: { band: 'bg-[#B42318]', label: 'CRITICAL', icon: AlertTriangle },
  warning: { band: 'bg-[#B42318]', label: 'WARNING', icon: AlertCircle },
  important: { band: 'bg-[#B42318]', label: 'IMPORTANT', icon: AlertCircle },
  advisory: { band: 'bg-[#9A4A00]', label: 'ADVISORY', icon: Bell },
  info: { band: 'bg-[#002774]', label: 'INFO', icon: Info },
};

function gabriolaTime(iso: string): string {
  return new Date(iso).toLocaleString('en-CA', {
    timeZone: GABRIOLA_TZ,
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export default function AlertsPage() {
  const { user } = useUser();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveAlerts();
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

  const fetchActiveAlerts = async () => {
    setLoading(true);

    // Active, non-expired alerts - public
    const { data } = await supabase
      .from('alerts')
      .select('*')
      .eq('active', true)
      .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)
      .order('created_at', { ascending: false });

    if (data) {
      const sorted = [...(data as Alert[])].sort(
        (a, b) => (PRIORITY[a.severity] || 5) - (PRIORITY[b.severity] || 5)
      );
      setAlerts(sorted);
    }

    setLoading(false);
  };

  const renderAlert = (alert: Alert) => {
    const style = STYLE[alert.severity] || STYLE.info;
    const Icon = style.icon;
    const category = alert.category ? alert.category.charAt(0).toUpperCase() + alert.category.slice(1) : '';

    return (
      <article key={alert.id} className="bg-white border border-[#E3DCCF] rounded-2xl overflow-hidden">
        <div className={`${style.band} text-white px-4 py-2.5 flex items-center gap-2 text-sm font-bold tracking-wide`}>
          <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          {style.label}
          {category && <span className="font-medium opacity-90">· {category}</span>}
        </div>

        <div className="p-4 md:p-5">
          <h2 className="text-xl font-bold leading-snug text-[#1F2A24]">{alert.title}</h2>

          <p className="text-[#1F2A24] whitespace-pre-wrap mt-2 text-base leading-relaxed">
            {alert.message}
          </p>

          {alert.image_url && (
            <button
              onClick={() => setLightboxImage(alert.image_url || null)}
              className="block w-full mt-3"
              aria-label="View image full size"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={alert.image_url}
                alt={alert.title}
                className="w-full max-h-96 object-cover rounded-xl border border-[#E3DCCF] hover:border-gabriola-green transition-colors"
              />
            </button>
          )}

          {alert.action_required && (
            <div className="bg-[#FDF0E1] text-[#8A3E00] rounded-xl p-3 mt-3">
              <p className="font-bold text-sm">Action Required:</p>
              <p className="text-sm mt-0.5">{alert.action_required}</p>
            </div>
          )}

          {alert.link_url && (
            <a
              href={alert.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-3 min-h-[44px] bg-[#002774] text-white px-5 rounded-xl hover:bg-[#001d57] font-semibold transition-colors"
            >
              {alert.link_text || 'More Information'}
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
            </a>
          )}

          <div className="mt-4 pt-3 border-t border-[#EEE8DD] space-y-1.5 text-sm text-[#5B6660]">
            {(alert.on_behalf_of_name || alert.on_behalf_of_organization) && (
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                <span className="font-medium text-[#3A4640]">
                  {alert.on_behalf_of_name}
                  {alert.on_behalf_of_organization && alert.on_behalf_of_organization !== alert.on_behalf_of_name && ` (${alert.on_behalf_of_organization})`}
                </span>
              </div>
            )}

            {alert.affected_areas && alert.affected_areas.length > 0 && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                <span>Affected areas: {alert.affected_areas.join(', ')}</span>
              </div>
            )}

            {alert.contact_info && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                <span>{alert.contact_info}</span>
              </div>
            )}

            <div className="flex items-start gap-2 text-[13px]">
              <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                Posted {gabriolaTime(alert.created_at)}
                {alert.expires_at && <> · Expires {gabriolaTime(alert.expires_at)}</>}
              </span>
            </div>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F2EA] text-[#1F2A24]">
      {/* Title bar */}
      <div className="bg-white border-b border-[#E3DCCF]">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-[#E6EFE8] text-gabriola-green flex items-center justify-center flex-shrink-0">
              <Bell className="w-6 h-6" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-2xl md:text-3xl font-bold text-gabriola-green-dark leading-tight">
                Community Alerts
              </h1>
              <p className="text-sm text-[#5B6660]">
                Stay informed about important community updates and emergency notifications
              </p>
            </div>
          </div>

          {/* Manage My Alerts - only for people who can issue alerts */}
          {user && (user.can_issue_alerts || user.is_super_admin) && (
            <Link
              href="/alerts/manage"
              className="flex-shrink-0 flex items-center min-h-[44px] bg-gabriola-green text-white px-4 rounded-lg hover:bg-gabriola-green-dark transition-colors font-semibold text-sm"
            >
              Manage My Alerts
            </Link>
          )}
        </div>
      </div>

      {/* Alerts */}
      <div className="flex-1 w-full max-w-5xl mx-auto px-4 py-5">
        {loading ? (
          <div className="py-16 text-center text-[#5B6660]" role="status">Loading alerts...</div>
        ) : alerts.length === 0 ? (
          <div className="bg-white border border-[#E3DCCF] rounded-2xl text-center px-6 py-10">
            <div className="w-14 h-14 rounded-2xl bg-[#E6EFE8] text-gabriola-green flex items-center justify-center mx-auto mb-3">
              <Bell className="w-7 h-7" aria-hidden="true" />
            </div>
            <p className="text-lg font-semibold text-gabriola-green-dark">No active alerts</p>
            <p className="text-[#5B6660] mt-1">Check back later for community updates</p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map(alert => renderAlert(alert))}
          </div>
        )}

        <div className="mt-6 text-center">
          <Link
            href="/alerts/archive"
            className="inline-flex items-center min-h-[44px] px-4 text-gabriola-green hover:underline font-semibold"
          >
            View Archived Alerts →
          </Link>
        </div>
      </div>

      {/* Image Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-7xl max-h-screen">
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 p-2 transition-colors"
              aria-label="Close"
            >
              <X className="w-8 h-8" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxImage}
              alt="Full size"
              className="max-w-full max-h-screen object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      <Footer activeTab="alerts" />
    </div>
  );
}
