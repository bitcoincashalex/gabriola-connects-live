// app/admin/forum/logs/page.tsx
// Version: 1.0.0 - Activity Logs Admin Page
// Date: 2025-12-11

'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Clock, Search, Filter, Download, Shield, Eye, Ban, Pin, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface LogEntry {
  id: string;
  moderator_id: string;
  action_type: string;
  target_type: string;
  target_id: string;
  reason: string | null;
  notes: string | null;
  metadata: any;
  ip_address: string | null;
  created_at: string;
  moderator: {
    email: string;
    full_name: string | null;
  };
}

export default function ActivityLogsPage() {
  const { user } = useUser();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterModerator, setFilterModerator] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [moderators, setModerators] = useState<any[]>([]);

  // Check admin access
  const isAdmin = user && (
    (user as any).is_super_admin ||
    (user as any).admin_forum ||
    (user as any).forum_moderator
  );

  useEffect(() => {
    if (!isAdmin) {
      window.location.href = '/';
      return;
    }
    fetchLogs();
    fetchModerators();
  }, [isAdmin]);

  useEffect(() => {
    filterLogs();
  }, [logs, searchQuery, filterAction, filterModerator, dateFrom, dateTo]);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('bbs_moderation_logs')
        .select(`
          *,
          moderator:moderator_id(email, full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchModerators = async () => {
    try {
      const { data } = await supabase
        .from('users')
        .select('id, email, full_name')
        .or('is_super_admin.eq.true,admin_forum.eq.true,forum_moderator.eq.true');

      setModerators(data || []);
    } catch (error) {
      console.error('Error fetching moderators:', error);
    }
  };

  const filterLogs = () => {
    let filtered = [...logs];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(log =>
        log.action_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.target_id?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Action filter
    if (filterAction !== 'all') {
      filtered = filtered.filter(log => log.action_type === filterAction);
    }

    // Moderator filter
    if (filterModerator !== 'all') {
      filtered = filtered.filter(log => log.moderator_id === filterModerator);
    }

    // Date range
    if (dateFrom) {
      filtered = filtered.filter(log => new Date(log.created_at) >= new Date(dateFrom));
    }
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59);
      filtered = filtered.filter(log => new Date(log.created_at) <= endDate);
    }

    setFilteredLogs(filtered);
  };

  const exportLogs = () => {
    const csv = [
      ['Date', 'Moderator', 'Action', 'Target Type', 'Target ID', 'Reason', 'Notes'].join(','),
      ...filteredLogs.map(log => [
        new Date(log.created_at).toLocaleString(),
        log.moderator.full_name || log.moderator.email,
        log.action_type,
        log.target_type,
        log.target_id,
        log.reason || '',
        log.notes || ''
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `moderation-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getActionIcon = (actionType: string) => {
    if (actionType.includes('hide')) return <Eye className="w-4 h-4" />;
    if (actionType.includes('ban')) return <Ban className="w-4 h-4" />;
    if (actionType.includes('pin')) return <Pin className="w-4 h-4" />;
    if (actionType.includes('delete')) return <Trash2 className="w-4 h-4" />;
    return <Shield className="w-4 h-4" />;
  };

  const getActionColor = (actionType: string) => {
    if (actionType.includes('ban')) return 'bg-red-100 text-red-700';
    if (actionType.includes('delete')) return 'bg-red-100 text-red-700';
    if (actionType.includes('hide')) return 'bg-yellow-100 text-yellow-700';
    if (actionType.includes('pin')) return 'bg-green-100 text-green-700';
    if (actionType.includes('moderator')) return 'bg-purple-100 text-purple-700';
    return 'bg-blue-100 text-blue-700';
  };

  const formatActionName = (actionType: string) => {
    return actionType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (!isAdmin) {
    return <div className="text-center py-20">Access Denied</div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gabriola-green"></div>
          <p className="mt-4 text-gray-600">Loading activity logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Link href="/admin/forum" className="text-gray-500 hover:text-gray-700">
              Admin
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900">Activity Logs</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Activity Logs</h1>
              <p className="text-gray-600">Complete audit trail of moderation actions</p>
            </div>
            <button
              onClick={exportLogs}
              className="flex items-center gap-2 px-4 py-2 bg-gabriola-green text-white rounded-lg hover:bg-gabriola-green-dark transition"
            >
              <Download className="w-5 h-5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600">Total Actions</p>
            <p className="text-2xl font-bold text-gray-900">{logs.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600">Today</p>
            <p className="text-2xl font-bold text-blue-600">
              {logs.filter(log => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return new Date(log.created_at) >= today;
              }).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600">This Week</p>
            <p className="text-2xl font-bold text-green-600">
              {logs.filter(log => {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return new Date(log.created_at) >= weekAgo;
              }).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600">Moderators</p>
            <p className="text-2xl font-bold text-purple-600">{moderators.length}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search logs..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
              />
            </div>

            {/* Action Filter */}
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
            >
              <option value="all">All Actions</option>
              <option value="hide_post">Hide Post</option>
              <option value="unhide_post">Unhide Post</option>
              <option value="delete_post">Delete Post</option>
              <option value="pin_post">Pin Post</option>
              <option value="ban_user">Ban User</option>
              <option value="unban_user">Unban User</option>
              <option value="make_moderator">Make Moderator</option>
              <option value="resolve_report">Resolve Report</option>
            </select>

            {/* Moderator Filter */}
            <select
              value={filterModerator}
              onChange={(e) => setFilterModerator(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
            >
              <option value="all">All Moderators</option>
              {moderators.map(mod => (
                <option key={mod.id} value={mod.id}>
                  {mod.full_name || mod.email}
                </option>
              ))}
            </select>

            {/* Date From */}
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
            />

            {/* Date To */}
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
            />
          </div>
        </div>

        {/* Logs List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Moderator
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Target
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No logs found
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {log.moderator.full_name || log.moderator.email}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getActionColor(log.action_type)}`}>
                          {getActionIcon(log.action_type)}
                          {formatActionName(log.action_type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{log.target_type}</div>
                          <div className="text-xs text-gray-500 font-mono">{log.target_id.substring(0, 8)}...</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {log.reason && (
                          <div className="mb-1">
                            <strong>Reason:</strong> {log.reason}
                          </div>
                        )}
                        {log.notes && (
                          <div className="text-xs text-gray-600">
                            {log.notes}
                          </div>
                        )}
                        {log.ip_address && (
                          <div className="text-xs text-gray-500 mt-1">
                            IP: {log.ip_address}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Results Count */}
        <div className="mt-6 text-sm text-gray-600 text-center">
          Showing {filteredLogs.length} of {logs.length} log entries
        </div>
      </div>
    </div>
  );
}
