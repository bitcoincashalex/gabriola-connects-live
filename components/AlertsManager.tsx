// components/AlertsManager.tsx
// v3.0 - Dec 9, 2025 - Add edit, archive viewing, proper permissions
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { AlertTriangle, Plus, X, Bell, AlertCircle, Info, Edit2, Archive } from 'lucide-react';
import { AlertSeverity } from '@/lib/types';

interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  issued_by?: string | null;
  issuer_name: string;
  issuer_organization?: string | null;
  created_at: string;
  expires_at?: string | null;
  active: boolean;
  affected_areas?: string[] | null;
  category?: string | null;
  contact_info?: string | null;
  action_required?: string | null;
}

export default function AlertsManager() {
  const { user } = useUser();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [archivedAlerts, setArchivedAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const [form, setForm] = useState({
    title: '',
    message: '',
    severity: 'info' as AlertSeverity,
    issuer_name: user?.full_name || '',
    issuer_organization: '',
    affected_areas: '',
    category: '',
    contact_info: '',
    action_required: '',
    expiresInHours: 24,
  });

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);

    // Fetch active alerts
    const { data: activeData, error: activeError } = await supabase
      .from('alerts')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (!activeError && activeData) {
      const sorted = activeData.sort((a, b) => {
        const priority = { emergency: 1, warning: 2, advisory: 3, info: 4 };
        return priority[a.severity as AlertSeverity] - priority[b.severity as AlertSeverity];
      });
      setAlerts(sorted);
    }

    // Fetch archived alerts
    const { data: archivedData, error: archivedError } = await supabase
      .from('alerts')
      .select('*')
      .eq('active', false)
      .order('created_at', { ascending: false })
      .limit(50); // Last 50 archived alerts

    if (!archivedError && archivedData) {
      setArchivedAlerts(archivedData);
    }

    setLoading(false);
  };

  const canManageAlerts = user?.can_issue_alerts || user?.is_super_admin || false;

  const canEditAlert = (alert: Alert) => {
    if (!user) return false;
    // Super admin can edit anything, or creator can edit their own
    return user.is_super_admin || alert.issued_by === user.id;
  };

  const openEditForm = (alert: Alert) => {
    setEditingAlert(alert);
    setForm({
      title: alert.title,
      message: alert.message,
      severity: alert.severity,
      issuer_name: alert.issuer_name,
      issuer_organization: alert.issuer_organization || '',
      affected_areas: alert.affected_areas?.join(', ') || '',
      category: alert.category || '',
      contact_info: alert.contact_info || '',
      action_required: alert.action_required || '',
      expiresInHours: 24,
    });
    setShowForm(true);
  };

  const openNewForm = () => {
    setEditingAlert(null);
    setForm({
      title: '',
      message: '',
      severity: 'info' as AlertSeverity,
      issuer_name: user?.full_name || '',
      issuer_organization: '',
      affected_areas: '',
      category: '',
      contact_info: '',
      action_required: '',
      expiresInHours: 24,
    });
    setShowForm(true);
  };

  const createOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      alert('Title and message required');
      return;
    }

    const areasArray = form.affected_areas
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const payload = {
      title: form.title.trim(),
      message: form.message.trim(),
      severity: form.severity,
      issuer_name: form.issuer_name.trim() || user?.full_name || 'Anonymous',
      issuer_organization: form.issuer_organization.trim() || null,
      affected_areas: areasArray.length > 0 ? areasArray : null,
      category: form.category.trim() || null,
      contact_info: form.contact_info.trim() || null,
      action_required: form.action_required.trim() || null,
      expires_at: new Date(Date.now() + form.expiresInHours * 60 * 60 * 1000).toISOString(),
      active: true,
    };

    if (editingAlert) {
      // UPDATE existing alert
      const { error } = await supabase
        .from('alerts')
        .update(payload)
        .eq('id', editingAlert.id);

      if (error) {
        alert('Error updating alert: ' + error.message);
      } else {
        alert('Alert updated successfully!');
        setShowForm(false);
        setEditingAlert(null);
        fetchAlerts();
      }
    } else {
      // CREATE new alert
      const { error } = await supabase
        .from('alerts')
        .insert({
          ...payload,
          issued_by: user?.id,
        });

      if (error) {
        alert('Error creating alert: ' + error.message);
      } else {
        alert('Alert created successfully!');
        setShowForm(false);
        fetchAlerts();
      }
    }
  };

  const archiveAlert = async (alertId: string) => {
    if (!confirm('Archive this alert? It will no longer be visible to users, but will remain in the archive.')) return;

    const { error } = await supabase
      .from('alerts')
      .update({ active: false })
      .eq('id', alertId);

    if (error) {
      alert('Error archiving alert: ' + error.message);
    } else {
      alert('Alert archived successfully');
      fetchAlerts();
    }
  };

  const reactivateAlert = async (alertId: string) => {
    if (!confirm('Reactivate this alert? It will become visible to users again.')) return;

    const { error } = await supabase
      .from('alerts')
      .update({ active: true })
      .eq('id', alertId);

    if (error) {
      alert('Error reactivating alert: ' + error.message);
    } else {
      alert('Alert reactivated successfully');
      fetchAlerts();
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'emergency': return 'bg-red-100 border-red-500 text-red-900';
      case 'warning': return 'bg-orange-100 border-orange-500 text-orange-900';
      case 'advisory': return 'bg-yellow-100 border-yellow-500 text-yellow-900';
      case 'info': return 'bg-blue-100 border-blue-500 text-blue-900';
      default: return 'bg-gray-100 border-gray-500 text-gray-900';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'emergency': return <AlertTriangle className="w-6 h-6 text-red-600" />;
      case 'warning': return <AlertCircle className="w-6 h-6 text-orange-600" />;
      case 'advisory': return <Bell className="w-6 h-6 text-yellow-600" />;
      case 'info': return <Info className="w-6 h-6 text-blue-600" />;
      default: return <Info className="w-6 h-6 text-gray-600" />;
    }
  };

  const renderAlert = (alert: Alert, isArchived: boolean = false) => (
    <div
      key={alert.id}
      className={`border-l-4 p-6 rounded-lg shadow-md ${getSeverityColor(alert.severity)} ${
        isArchived ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          {getSeverityIcon(alert.severity)}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xl font-bold">{alert.title}</h3>
              <span className="text-xs px-2 py-1 rounded bg-white/50 uppercase font-bold">
                {alert.severity}
              </span>
              {isArchived && (
                <span className="text-xs px-2 py-1 rounded bg-gray-500 text-white uppercase font-bold">
                  Archived
                </span>
              )}
            </div>
            <p className="text-sm mb-3 whitespace-pre-wrap">{alert.message}</p>

            {/* Details */}
            <div className="space-y-1 text-sm">
              {alert.affected_areas && alert.affected_areas.length > 0 && (
                <div>
                  <strong>Affected Areas:</strong> {alert.affected_areas.join(', ')}
                </div>
              )}
              {alert.action_required && (
                <div>
                  <strong>Action Required:</strong> {alert.action_required}
                </div>
              )}
              {alert.contact_info && (
                <div>
                  <strong>Contact:</strong> {alert.contact_info}
                </div>
              )}
              <div className="text-xs opacity-75 mt-2">
                Issued by {alert.issuer_name}
                {alert.issuer_organization && ` (${alert.issuer_organization})`} on{' '}
                {new Date(alert.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Actions - only if user can edit this alert */}
        {canEditAlert(alert) && (
          <div className="flex gap-2">
            {!isArchived ? (
              <>
                <button
                  onClick={() => openEditForm(alert)}
                  className="p-2 hover:bg-white/50 rounded-lg transition"
                  title="Edit alert"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => archiveAlert(alert.id)}
                  className="p-2 hover:bg-white/50 rounded-lg transition"
                  title="Archive alert (deactivate)"
                >
                  <Archive className="w-5 h-5" />
                </button>
              </>
            ) : (
              // Archived alerts can be reactivated by super admin
              user?.is_super_admin && (
                <button
                  onClick={() => reactivateAlert(alert.id)}
                  className="p-2 hover:bg-green-200 rounded-lg transition"
                  title="Reactivate this alert"
                >
                  <Bell className="w-5 h-5 text-green-600" />
                </button>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-2xl text-gray-600">Loading alerts...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gabriola-green mb-2">Community Alerts</h1>
              <p className="text-gray-600">Stay informed about important island updates</p>
            </div>
            {canManageAlerts && (
              <button
                onClick={openNewForm}
                className="bg-gabriola-green text-white px-6 py-3 rounded-lg font-bold hover:bg-gabriola-green-dark transition flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Create Alert
              </button>
            )}
          </div>

          {/* Toggle archived view */}
          <div className="flex gap-4 mt-4">
            <button
              onClick={() => setShowArchived(false)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                !showArchived
                  ? 'bg-gabriola-green text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Active Alerts ({alerts.length})
            </button>
            <button
              onClick={() => setShowArchived(true)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                showArchived
                  ? 'bg-gabriola-green text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Archived ({archivedAlerts.length})
            </button>
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-4">
          {!showArchived ? (
            // Active alerts
            alerts.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-12 text-center">
                <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-xl text-gray-600">No active alerts at this time</p>
                <p className="text-gray-500 mt-2">Check back later for updates</p>
              </div>
            ) : (
              alerts.map(alert => renderAlert(alert, false))
            )
          ) : (
            // Archived alerts
            archivedAlerts.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-12 text-center">
                <Archive className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-xl text-gray-600">No archived alerts</p>
              </div>
            ) : (
              archivedAlerts.map(alert => renderAlert(alert, true))
            )
          )}
        </div>

        {/* Create/Edit Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-gabriola-green">
                  {editingAlert ? 'Edit Alert' : 'Create New Alert'}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingAlert(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={createOrUpdate} className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium mb-2">Alert Title *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-gabriola-green"
                    placeholder="e.g., Ferry Service Disruption"
                    required
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium mb-2">Message *</label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-gabriola-green"
                    rows={4}
                    placeholder="Detailed information about the alert..."
                    required
                  />
                </div>

                {/* Severity */}
                <div>
                  <label className="block text-sm font-medium mb-2">Severity Level *</label>
                  <select
                    value={form.severity}
                    onChange={(e) => setForm({ ...form, severity: e.target.value as AlertSeverity })}
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-gabriola-green"
                  >
                    <option value="info">Info (Blue) - General information</option>
                    <option value="advisory">Advisory (Yellow) - Be aware</option>
                    <option value="warning">Warning (Orange) - Take action</option>
                    <option value="emergency">Emergency (Red) - Immediate action required</option>
                  </select>
                </div>

                {/* Two column layout */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Issuer name */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Your Name</label>
                    <input
                      type="text"
                      value={form.issuer_name}
                      onChange={(e) => setForm({ ...form, issuer_name: e.target.value })}
                      className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-gabriola-green"
                      placeholder="Your name"
                    />
                  </div>

                  {/* Organization */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Organization (Optional)</label>
                    <input
                      type="text"
                      value={form.issuer_organization}
                      onChange={(e) => setForm({ ...form, issuer_organization: e.target.value })}
                      className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-gabriola-green"
                      placeholder="e.g., Fire Department"
                    />
                  </div>
                </div>

                {/* Affected areas */}
                <div>
                  <label className="block text-sm font-medium mb-2">Affected Areas (Optional)</label>
                  <input
                    type="text"
                    value={form.affected_areas}
                    onChange={(e) => setForm({ ...form, affected_areas: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-gabriola-green"
                    placeholder="e.g., North End, South End (comma separated)"
                  />
                </div>

                {/* Action required */}
                <div>
                  <label className="block text-sm font-medium mb-2">Action Required (Optional)</label>
                  <input
                    type="text"
                    value={form.action_required}
                    onChange={(e) => setForm({ ...form, action_required: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-gabriola-green"
                    placeholder="What should people do?"
                  />
                </div>

                {/* Contact info */}
                <div>
                  <label className="block text-sm font-medium mb-2">Contact Info (Optional)</label>
                  <input
                    type="text"
                    value={form.contact_info}
                    onChange={(e) => setForm({ ...form, contact_info: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-gabriola-green"
                    placeholder="Phone or email for more information"
                  />
                </div>

                {/* Expires in */}
                <div>
                  <label className="block text-sm font-medium mb-2">Expires In</label>
                  <select
                    value={form.expiresInHours}
                    onChange={(e) => setForm({ ...form, expiresInHours: Number(e.target.value) })}
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-gabriola-green"
                  >
                    <option value={6}>6 hours</option>
                    <option value={12}>12 hours</option>
                    <option value={24}>24 hours</option>
                    <option value={48}>2 days</option>
                    <option value={72}>3 days</option>
                    <option value={168}>1 week</option>
                  </select>
                </div>

                {/* Buttons */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-gabriola-green text-white py-3 rounded-lg font-bold hover:bg-gabriola-green-dark transition"
                  >
                    {editingAlert ? 'Update Alert' : 'Create Alert'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingAlert(null);
                    }}
                    className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
