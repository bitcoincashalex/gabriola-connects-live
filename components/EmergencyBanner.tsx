'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export default function EmergencyBanner() {
  const [criticalAlert, setCriticalAlert] = useState<any>(null);

  useEffect(() => {
    const fetchCriticalAlert = async () => {
      const { data } = await supabase
        .from('alerts')
        .select('id, title, message, severity')
        .eq('active', true)
        .eq('severity', 'critical')
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setCriticalAlert(data);
    };

    fetchCriticalAlert();

    // Optional: refresh every 30 seconds
    const interval = setInterval(fetchCriticalAlert, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!criticalAlert) return null;

  return (
    <div className="w-full bg-red-600 text-white shadow-2xl">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <AlertTriangle className="w-8 h-8 animate-pulse flex-shrink-0" />
          <div>
            <h3 className="text-xl font-bold">{criticalAlert.title}</h3>
            <p className="text-sm opacity-90 max-w-2xl">
              {criticalAlert.message.length > 120
                ? criticalAlert.message.substring(0, 120) + '...'
                : criticalAlert.message}
            </p>
          </div>
        </div>
        <Link
          href="/alerts"
          className="bg-white text-red-600 px-6 py-3 rounded-full font-bold hover:bg-gray-100 transition whitespace-nowrap"
        >
          View Details →
        </Link>
      </div>
    </div>
  );
}