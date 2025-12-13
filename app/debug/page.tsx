// app/debug/page.tsx
// Mobile Debug Console - Shows errors and logs on screen
// Date: 2024-12-13
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface LogEntry {
  type: 'log' | 'error' | 'warn' | 'info';
  message: string;
  timestamp: string;
}

export default function DebugPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    // Capture console.log
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      originalLog.apply(console, args);
      addLog('log', args.join(' '));
    };

    // Capture console.error
    const originalError = console.error;
    console.error = (...args: any[]) => {
      originalError.apply(console, args);
      addLog('error', args.join(' '));
    };

    // Capture console.warn
    const originalWarn = console.warn;
    console.warn = (...args: any[]) => {
      originalWarn.apply(console, args);
      addLog('warn', args.join(' '));
    };

    // Capture console.info
    const originalInfo = console.info;
    console.info = (...args: any[]) => {
      originalInfo.apply(console, args);
      addLog('info', args.join(' '));
    };

    // Capture unhandled errors
    const handleError = (event: ErrorEvent) => {
      addLog('error', `ERROR: ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`);
    };

    // Capture unhandled promise rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      addLog('error', `UNHANDLED REJECTION: ${event.reason}`);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      console.info = originalInfo;
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  const addLog = (type: LogEntry['type'], message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { type, message, timestamp }]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const copyLogs = () => {
    const logText = logs.map(log => `[${log.timestamp}] ${log.type.toUpperCase()}: ${log.message}`).join('\n');
    navigator.clipboard.writeText(logText).then(() => {
      alert('Logs copied to clipboard!');
    });
  };

  const getTypeColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'error': return 'bg-red-100 text-red-800 border-red-300';
      case 'warn': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 bg-gabriola-green text-white px-6 py-3 rounded-full shadow-2xl hover:bg-gabriola-green-dark z-50 font-bold text-lg"
      >
        🐛 Show Console ({logs.length})
      </button>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* Header */}
      <div className="bg-gabriola-green text-white p-4 rounded-t-lg shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">🐛 Debug Console</h1>
          <button
            onClick={() => setIsMinimized(true)}
            className="bg-white text-gabriola-green px-4 py-2 rounded font-bold hover:bg-gray-100"
          >
            Minimize
          </button>
        </div>
        <p className="text-sm opacity-90">All console logs and errors appear here</p>
      </div>

      {/* Controls */}
      <div className="bg-white p-4 border-x border-gray-300 flex gap-2 flex-wrap">
        <button
          onClick={clearLogs}
          className="bg-red-600 text-white px-4 py-2 rounded font-medium hover:bg-red-700"
        >
          Clear Logs
        </button>
        <button
          onClick={copyLogs}
          className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700"
        >
          Copy All Logs
        </button>
        <Link
          href="/"
          className="bg-gabriola-green text-white px-4 py-2 rounded font-medium hover:bg-gabriola-green-dark"
        >
          Go to Home
        </Link>
        <Link
          href="/#calendar"
          className="bg-purple-600 text-white px-4 py-2 rounded font-medium hover:bg-purple-700"
        >
          Go to Calendar
        </Link>
        <Link
          href="/#forum"
          className="bg-teal-600 text-white px-4 py-2 rounded font-medium hover:bg-teal-700"
        >
          Go to Forum
        </Link>
      </div>

      {/* Log Counter */}
      <div className="bg-gray-200 p-2 border-x border-gray-300 text-sm font-medium">
        Total Logs: {logs.length}
      </div>

      {/* Logs Display */}
      <div className="bg-white border border-gray-300 rounded-b-lg shadow-lg max-h-[600px] overflow-y-auto">
        {logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-lg mb-2">No logs yet</p>
            <p className="text-sm">Navigate around the site to see console output here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {logs.map((log, index) => (
              <div
                key={index}
                className={`p-3 ${getTypeColor(log.type)} border-l-4`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium opacity-70 mb-1">
                      [{log.timestamp}] {log.type.toUpperCase()}
                    </div>
                    <div className="text-sm font-mono break-words whitespace-pre-wrap">
                      {log.message}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(log.message);
                      alert('Log entry copied!');
                    }}
                    className="text-xs bg-white px-2 py-1 rounded opacity-70 hover:opacity-100 flex-shrink-0"
                  >
                    Copy
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="font-bold text-blue-900 mb-2">📱 How to Use:</h2>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
          <li>Keep this page open</li>
          <li>Use the navigation buttons above to test different pages</li>
          <li>All errors and console logs will appear here</li>
          <li>Click "Copy All Logs" to copy everything</li>
          <li>Send the copied logs to help debug issues</li>
        </ol>
      </div>

      {/* Test Buttons */}
      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h2 className="font-bold text-yellow-900 mb-2">🧪 Test Buttons:</h2>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => console.log('Test log message')}
            className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
          >
            Test Log
          </button>
          <button
            onClick={() => console.error('Test error message')}
            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
          >
            Test Error
          </button>
          <button
            onClick={() => console.warn('Test warning message')}
            className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
          >
            Test Warning
          </button>
          <button
            onClick={() => {
              throw new Error('Intentional test error');
            }}
            className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700"
          >
            Throw Error
          </button>
        </div>
      </div>
    </div>
  );
}
