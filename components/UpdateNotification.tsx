// components/UpdateNotification.tsx
// v1.0.0 - PWA auto-update detection with user prompt
// Date: 2024-12-13

'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

export default function UpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    // Only run in browser with service worker support
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Check for waiting service worker on page load
    navigator.serviceWorker.ready.then((registration) => {
      if (registration.waiting) {
        setWaitingWorker(registration.waiting);
        setShowUpdate(true);
      }
    });

    // Listen for new service worker waiting to activate
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // New service worker has taken control - reload the page
      window.location.reload();
    });

    // Listen for updates
    const handleUpdateFound = () => {
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setShowUpdate(true);
        }

        // Listen for new service worker installing
        if (registration.installing) {
          registration.installing.addEventListener('statechange', (e) => {
            const worker = e.target as ServiceWorker;
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker installed and waiting
              setWaitingWorker(worker);
              setShowUpdate(true);
            }
          });
        }
      });
    };

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'UPDATE_AVAILABLE') {
        handleUpdateFound();
      }
    });

    // Check for updates every 60 seconds
    const interval = setInterval(() => {
      navigator.serviceWorker.ready.then((registration) => {
        registration.update();
      });
    }, 60000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      // Tell the waiting service worker to skip waiting and activate
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      setShowUpdate(false);
    }
  };

  const handleDismiss = () => {
    setShowUpdate(false);
    // Show again in 10 minutes
    setTimeout(() => {
      if (waitingWorker) {
        setShowUpdate(true);
      }
    }, 600000);
  };

  if (!showUpdate) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:max-w-md bg-gabriola-green text-white rounded-xl shadow-2xl p-4 z-50 animate-slide-up">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-white/80 hover:text-white"
        aria-label="Dismiss"
      >
        <X className="w-5 h-5" />
      </button>
      
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
          <Download className="w-6 h-6 text-white" />
        </div>
        
        <div className="flex-1">
          <h3 className="font-bold text-white mb-1">Update Available</h3>
          <p className="text-sm text-white/90 mb-3">
            A new version of Gabriola Connects is ready!
          </p>
          
          <div className="flex gap-2">
            <button
              onClick={handleUpdate}
              className="px-4 py-2 bg-white text-gabriola-green rounded-lg font-medium hover:bg-white/90 transition"
            >
              Update Now
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 bg-white/20 text-white rounded-lg font-medium hover:bg-white/30 transition"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
