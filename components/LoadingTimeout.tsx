// Path: components/LoadingTimeout.tsx
// Version: 1.0.0 - Simple timeout overlay - Does NOT touch AuthProvider
// Date: 2025-12-24
'use client';

import { useEffect, useState } from 'react';
import { useUser } from './AuthProvider';

export default function LoadingTimeout() {
  const { loading } = useUser();
  const [showTimeout, setShowTimeout] = useState(false);

  useEffect(() => {
    if (loading) {
      // After 15 seconds of loading, show help message
      const timer = setTimeout(() => {
        setShowTimeout(true);
      }, 15000);

      return () => clearTimeout(timer);
    } else {
      setShowTimeout(false);
    }
  }, [loading]);

  if (!loading || !showTimeout) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 border-4 border-gabriola-green border-t-transparent rounded-full animate-spin mb-4"></div>
          
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Still Loading...
          </h2>
          
          <p className="text-gray-600 mb-4">
            This is taking longer than expected. The site should load within a few seconds.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-3 bg-gabriola-green text-white rounded-lg hover:bg-gabriola-green-dark font-medium transition-colors"
          >
            Refresh Page
          </button>
          
          <button
            onClick={() => {
              // Clear browser storage and reload
              localStorage.clear();
              sessionStorage.clear();
              window.location.reload();
            }}
            className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
          >
            Clear Cache & Refresh
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          If this problem continues, please try again in a few minutes.
        </p>
      </div>
    </div>
  );
}
