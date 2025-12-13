// components/FloatingDebugConsole.tsx
// Floating Debug Console - Stays visible while navigating, captures all errors
// Date: 2024-12-13
'use client';

import { useEffect, useState } from 'react';
import { X, Minimize2, Maximize2, Copy, Trash2 } from 'lucide-react';

interface LogEntry {
  type: 'log' | 'error' | 'warn' | 'info';
  message: string;
  timestamp: string;
  stack?: string;
}

export default function FloatingDebugConsole() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Check URL for ?debug=true
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('debug') === 'true') {
      setIsVisible(true);
    }

    // Also listen for hash changes
    const checkDebug = () => {
      const params = new URLSearchParams(window.location.search);
      setIsVisible(params.get('debug') === 'true');
    };

    window.addEventListener('popstate', checkDebug);
    return () => window.removeEventListener('popstate', checkDebug);
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const addLog = (type: LogEntry['type'], message: string, stack?: string) => {
      const timestamp = new Date().toLocaleTimeString();
      setLogs(prev => [...prev, { type, message, timestamp, stack }]);
    };

    // Capture console.log
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      originalLog.apply(console, args);
      addLog('log', args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' '));
    };

    // Capture console.error
    const originalError = console.error;
    console.error = (...args: any[]) => {
      originalError.apply(console, args);
      addLog('error', args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' '));
    };

    // Capture console.warn
    const originalWarn = console.warn;
    console.warn = (...args: any[]) => {
      originalWarn.apply(console, args);
      addLog('warn', args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' '));
    };

    // Capture console.info
    const originalInfo = console.info;
    console.info = (...args: any[]) => {
      originalInfo.apply(console, args);
      addLog('info', args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' '));
    };

    // Capture unhandled errors
    const handleError = (event: ErrorEvent) => {
      addLog('error', `ERROR: ${event.message}`, `at ${event.filename}:${event.lineno}:${event.colno}\n${event.error?.stack || ''}`);
    };

    // Capture unhandled promise rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      addLog('error', `UNHANDLED REJECTION: ${event.reason}`, event.reason?.stack);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    // Add initial log
    addLog('info', '🐛 Debug Console Started');

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      console.info = originalInfo;
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, [isVisible]);

  const clearLogs = () => {
    setLogs([]);
  };

  const copyLogs = () => {
    const logText = logs.map(log => 
      `[${log.timestamp}] ${log.type.toUpperCase()}: ${log.message}${log.stack ? '\n' + log.stack : ''}`
    ).join('\n\n');
    
    navigator.clipboard.writeText(logText).then(() => {
      alert('✅ All logs copied to clipboard!');
    }).catch(() => {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = logText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert('✅ All logs copied to clipboard!');
    });
  };

  const getTypeColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'error': return 'bg-red-100 text-red-900 border-l-4 border-red-500';
      case 'warn': return 'bg-yellow-100 text-yellow-900 border-l-4 border-yellow-500';
      case 'info': return 'bg-blue-100 text-blue-900 border-l-4 border-blue-500';
      default: return 'bg-gray-100 text-gray-900 border-l-4 border-gray-500';
    }
  };

  const getTypeIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'error': return '🔴';
      case 'warn': return '🟡';
      case 'info': return '🔵';
      default: return '⚪';
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  if (!isVisible) return null;

  if (isMinimized) {
    return (
      <div
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
        className="fixed z-[9999] cursor-move select-none"
        onMouseDown={handleMouseDown}
      >
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-red-600 text-white px-4 py-3 rounded-lg shadow-2xl hover:bg-red-700 font-bold flex items-center gap-2 border-2 border-red-800"
        >
          <span className="text-lg">🐛</span>
          <span>Debug ({logs.length})</span>
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      className="fixed z-[9999] w-[95vw] max-w-2xl"
    >
      <div className="bg-white rounded-lg shadow-2xl border-2 border-gray-300 overflow-hidden">
        {/* Header - Draggable */}
        <div
          className="bg-red-600 text-white p-3 cursor-move select-none flex items-center justify-between"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🐛</span>
            <h3 className="font-bold text-sm">Debug Console</h3>
            <span className="text-xs opacity-75">({logs.length} logs)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(true)}
              className="hover:bg-red-700 p-1 rounded"
              title="Minimize"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="hover:bg-red-700 p-1 rounded"
              title="Close (add ?debug=true to URL to reopen)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-gray-100 p-2 flex gap-2 flex-wrap border-b border-gray-300">
          <button
            onClick={clearLogs}
            className="bg-red-500 text-white px-3 py-1 rounded text-xs font-medium hover:bg-red-600 flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
          <button
            onClick={copyLogs}
            className="bg-blue-500 text-white px-3 py-1 rounded text-xs font-medium hover:bg-blue-600 flex items-center gap-1"
          >
            <Copy className="w-3 h-3" />
            Copy All
          </button>
          <button
            onClick={() => console.log('Test log message')}
            className="bg-gray-500 text-white px-3 py-1 rounded text-xs font-medium hover:bg-gray-600"
          >
            Test Log
          </button>
          <button
            onClick={() => console.error('Test error message')}
            className="bg-red-500 text-white px-3 py-1 rounded text-xs font-medium hover:bg-red-600"
          >
            Test Error
          </button>
        </div>

        {/* Logs Display */}
        <div className="bg-white max-h-[50vh] overflow-y-auto">
          {logs.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p className="text-sm mb-1">No logs yet</p>
              <p className="text-xs">Navigate around to see logs appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className={`p-2 ${getTypeColor(log.type)}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-sm flex-shrink-0">{getTypeIcon(log.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-medium opacity-70 mb-1">
                        [{log.timestamp}] {log.type.toUpperCase()}
                      </div>
                      <div className="text-xs font-mono break-words whitespace-pre-wrap">
                        {log.message}
                      </div>
                      {log.stack && (
                        <details className="mt-1">
                          <summary className="text-[10px] cursor-pointer opacity-70 hover:opacity-100">
                            Stack trace
                          </summary>
                          <pre className="text-[10px] mt-1 opacity-70 overflow-x-auto">
                            {log.stack}
                          </pre>
                        </details>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        const text = `[${log.timestamp}] ${log.type.toUpperCase()}: ${log.message}${log.stack ? '\n' + log.stack : ''}`;
                        navigator.clipboard.writeText(text).then(() => {
                          alert('✅ Log entry copied!');
                        });
                      }}
                      className="text-[10px] bg-white bg-opacity-50 px-2 py-1 rounded hover:bg-opacity-100 flex-shrink-0"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-100 p-2 border-t border-gray-300 text-center">
          <p className="text-[10px] text-gray-600">
            Drag header to move • Logs persist while navigating • Remove <code className="bg-gray-200 px-1 rounded">?debug=true</code> from URL to disable
          </p>
        </div>
      </div>
    </div>
  );
}
