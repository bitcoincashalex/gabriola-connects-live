'use client';

import { useEffect, useState } from 'react';
import { EmergencyAlert as EmergencyAlertType } from '@/lib/types';
import { AlertTriangle, X } from 'lucide-react';

interface EmergencyAlertProps {
  alert: EmergencyAlertType | null;
  onDismiss: () => void;
}

export default function EmergencyAlert({ alert, onDismiss }: EmergencyAlertProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (alert && alert.active) {
      setVisible(true);
      
      // Auto-dismiss after 30 seconds
      const timer = setTimeout(() => {
        handleDismiss();
      }, 30000);

      return () => clearTimeout(timer);
    }
  }, [alert]);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => {
      onDismiss();
    }, 300); // Wait for fade animation
  };

  if (!alert || !alert.active || !visible) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[100] fade-in"
      onClick={handleDismiss}
    >
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Red Alert Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-full emergency-pulse">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-1">EMERGENCY ALERT</h2>
              <p className="text-red-100 text-sm">
                Issued by {alert.issuer}
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Alert Message */}
        <div className="p-8">
          <p className="text-xl text-gray-800 leading-relaxed font-medium mb-6">
            {alert.message}
          </p>

          <div className="flex items-center justify-between text-sm text-gray-600 mb-6">
            <span>
              {alert.timestamp.toLocaleString('en-US', {
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
            <span className="text-xs text-gray-500">
              Auto-dismisses in 30 seconds
            </span>
          </div>

          <button
            onClick={handleDismiss}
            className="w-full bg-gabriola-green text-white py-4 px-6 rounded-xl font-bold text-lg hover:bg-gabriola-green-dark transition-colors"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
}
