// app/admin/forum/reports/page.tsx
// Version: 1.0.0 - Reports Review Admin Page
// Date: 2025-12-11

'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Flag, Search, Eye, Trash2, X, Check, AlertCircle, MessageSquare } from 'lucide-react';
import Link from 'next/link';

interface ReportData {
  id: string;
  reporter_id: string;
  report_type: string;
  reported_id: string;
  reason: string;
  description: string | null;
  status: string;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  action_taken: string | null;
  priority: number;
  created_at: string;
  reporter: {
    email: string;
    full_name: string | null;
  };
  post?: {
    title: string;
    body: string;
    display_name: string | null;
  };
  reply?: {
    body: string;
    display_name: string | null;
  };
}

export default function ReportsPage() {
  const { user } = useUser();
  const [reports, setReports] = useState<ReportData[]>([]);
  const [filteredReports, setFilteredReports] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('pending');
  const [filterReason, setFilterReason] = useState('all');
  const [selectedReport, setSelectedReport] = useState<ReportData | null>(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Check admin access
  const isAdmin = user && (
    (user as any).is_super_admin ||
    (user as any).admin_forum ||
    (user as any).forum_moderator
  );

  const isForumAdmin = user && ((user as any).is_super_admin || (user as any).admin_forum);

  useEffect(() => {
    if (!isAdmin) {
      window.location.href = '/';
      return;
    }
    fetchReports();
  }, [isAdmin]);

  useEffect(() => {
    filterReports();
  }, [reports, searchQuery, filterStatus, filterReason]);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('bbs_reports')
        .select(`
          *,
          reporter:reporter_id(email, full_name)
        `)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch related post/reply data
      const reportsWithContent = await Promise.all(
        (data || []).map(async (report) => {
          if (report.report_type === 'post') {
            const { data: post } = await supabase
              .from('bbs_posts')
              .select('title, body, display_name')
              .eq('id', report.reported_id)
              .single();
            return { ...report, post };
          } else if (report.report_type === 'reply') {
            const { data: reply } = await supabase
              .from('bbs_replies')
              .select('body, display_name')
              .eq('id', report.reported_id)
              .single();
            return { ...report, reply };
          }
          return report;
        })
      );

      setReports(reportsWithContent);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterReports = () => {
    let filtered = [...reports];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(r =>
        r.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.post?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.post?.body?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.reply?.body?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(r => r.status === filterStatus);
    }

    // Reason filter
    if (filterReason !== 'all') {
      filtered = filtered.filter(r => r.reason === filterReason);
    }

    setFilteredReports(filtered);
  };

  const handleResolve = async (dismiss: boolean = false) => {
    if (!selectedReport) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('bbs_reports')
        .update({
          status: dismiss ? 'dismissed' : 'resolved',
          resolved_by: user?.id,
          resolved_at: new Date().toISOString(),
          resolution_notes: resolutionNotes,
          action_taken: actionTaken
        })
        .eq('id', selectedReport.id);

      if (error) throw error;

      // Log action
      await supabase.rpc('log_moderation_action', {
        p_moderator_id: user?.id,
        p_action_type: dismiss ? 'dismiss_report' : 'resolve_report',
        p_target_type: 'report',
        p_target_id: selectedReport.id,
        p_notes: resolutionNotes
      });

      setShowResolveModal(false);
      setResolutionNotes('');
      setActionTaken('');
      setSelectedReport(null);
      fetchReports();
    } catch (error) {
      console.error('Error resolving report:', error);
      alert('Failed to resolve report');
    } finally {
      setActionLoading(false);
    }
  };

  const getReasonBadgeColor = (reason: string) => {
    const colors: Record<string, string> = {
      'spam': 'bg-orange-100 text-orange-700',
      'harassment': 'bg-red-100 text-red-700',
      'hate_speech': 'bg-red-100 text-red-700',
      'misinformation': 'bg-yellow-100 text-yellow-700',
      'off_topic': 'bg-blue-100 text-blue-700',
      'inappropriate': 'bg-purple-100 text-purple-700',
      'other': 'bg-gray-100 text-gray-700'
    };
    return colors[reason] || colors['other'];
  };

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-700',
      'reviewing': 'bg-blue-100 text-blue-700',
      'resolved': 'bg-green-100 text-green-700',
      'dismissed': 'bg-gray-100 text-gray-700'
    };
    return colors[status] || colors['pending'];
  };

  if (!isAdmin) {
    return <div className="text-center py-20">Access Denied</div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gabriola-green"></div>
          <p className="mt-4 text-gray-600">Loading reports...</p>
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
            <span className="text-gray-900">Reports</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Report Review</h1>
          <p className="text-gray-600">Review and action reported content</p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600">Total Reports</p>
            <p className="text-2xl font-bold text-gray-900">{reports.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">
              {reports.filter(r => r.status === 'pending').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600">Resolved</p>
            <p className="text-2xl font-bold text-green-600">
              {reports.filter(r => r.status === 'resolved').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600">Dismissed</p>
            <p className="text-2xl font-bold text-gray-600">
              {reports.filter(r => r.status === 'dismissed').length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reports..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
              />
            </div>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="reviewing">Reviewing</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>

            {/* Reason Filter */}
            <select
              value={filterReason}
              onChange={(e) => setFilterReason(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:border-gabriola-green focus:outline-none"
            >
              <option value="all">All Reasons</option>
              <option value="spam">Spam</option>
              <option value="harassment">Harassment</option>
              <option value="hate_speech">Hate Speech</option>
              <option value="misinformation">Misinformation</option>
              <option value="off_topic">Off Topic</option>
              <option value="inappropriate">Inappropriate</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {/* Reports List */}
        <div className="space-y-4">
          {filteredReports.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
              No reports found
            </div>
          ) : (
            filteredReports.map((report) => (
              <div
                key={report.id}
                className={`bg-white rounded-xl shadow-sm p-6 ${
                  report.priority > 0 ? 'border-l-4 border-red-500' : ''
                }`}
              >
                {/* Report Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getReasonBadgeColor(report.reason)}`}>
                        {report.reason.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(report.status)}`}>
                        {report.status.toUpperCase()}
                      </span>
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        {report.report_type.toUpperCase()}
                      </span>
                      {report.priority > 0 && (
                        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          HIGH PRIORITY
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      Reported by <strong>{report.reporter.full_name || report.reporter.email}</strong> on {new Date(report.created_at).toLocaleString()}
                    </p>
                    {report.description && (
                      <p className="text-gray-700 mb-3 bg-gray-50 p-3 rounded-lg">
                        "{report.description}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Reported Content */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Reported Content:</h4>
                  {report.post && (
                    <div>
                      <h5 className="font-medium text-gray-900 mb-1">{report.post.title}</h5>
                      <p className="text-gray-700 text-sm line-clamp-3">{report.post.body}</p>
                      <p className="text-xs text-gray-600 mt-2">
                        By {report.post.display_name || 'Anonymous'}
                      </p>
                    </div>
                  )}
                  {report.reply && (
                    <div>
                      <p className="text-gray-700 text-sm">{report.reply.body}</p>
                      <p className="text-xs text-gray-600 mt-2">
                        By {report.reply.display_name || 'Anonymous'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Resolution Info */}
                {report.status === 'resolved' || report.status === 'dismissed' ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold text-gray-900 mb-2">
                      {report.status === 'resolved' ? 'Resolved' : 'Dismissed'}
                    </h4>
                    {report.resolution_notes && (
                      <p className="text-sm text-gray-700 mb-2">{report.resolution_notes}</p>
                    )}
                    {report.action_taken && (
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>Action:</strong> {report.action_taken}
                      </p>
                    )}
                    <p className="text-xs text-gray-600">
                      Resolved on {report.resolved_at && new Date(report.resolved_at).toLocaleString()}
                    </p>
                  </div>
                ) : (
                  /* Actions */
                  <div className="flex flex-wrap gap-2 pt-4 border-t">
                    <Link
                      href={report.report_type === 'post' ? `/community/thread/${report.reported_id}` : '#'}
                      target="_blank"
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      View Content
                    </Link>

                    <button
                      onClick={() => {
                        setSelectedReport(report);
                        setShowResolveModal(true);
                      }}
                      className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 transition flex items-center gap-1"
                    >
                      <Check className="w-4 h-4" />
                      Resolve
                    </button>

                    <button
                      onClick={() => {
                        if (confirm('Dismiss this report?')) {
                          setSelectedReport(report);
                          handleResolve(true);
                        }
                      }}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition flex items-center gap-1"
                    >
                      <X className="w-4 h-4" />
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Results Count */}
        <div className="mt-6 text-sm text-gray-600 text-center">
          Showing {filteredReports.length} of {reports.length} reports
        </div>
      </div>

      {/* Resolve Modal */}
      {showResolveModal && selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowResolveModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Resolve Report</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Action Taken
              </label>
              <input
                type="text"
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
                placeholder="e.g., Hidden post, Banned user, No action needed"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resolution Notes
              </label>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Add notes about how this was resolved..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleResolve(false)}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50"
              >
                {actionLoading ? 'Resolving...' : 'Resolve'}
              </button>
              <button
                onClick={() => {
                  setShowResolveModal(false);
                  setResolutionNotes('');
                  setActionTaken('');
                }}
                disabled={actionLoading}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
