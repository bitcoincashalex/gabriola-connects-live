// components/AlertsManager.tsx
// v2.0 - Dec 8, 2025 - Updated for new alert schema
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { AlertTriangle, Plus, X, Bell, AlertCircle, Info } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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

    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Sort by severity priority
      const sorted = data.sort((a, b) => {
        const priority = { emergency: 1, warning: 2, advisory: 3, info: 4 };
        return priority[a.severity as AlertSeverity] - priority[b.severity as AlertSeverity];
      });
      setAlerts(sorted);
    }
    setLoading(false);
  };

  const canManageAlerts = user?.can_issue_alerts || user?.is_super_admin || false;

  const canEditAlert = (alert: Alert) => {
    if (!user) return false;
    return user.is_super_admin || alert.issued_by === user.id;
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
      expires_at: form.expiresInHours > 0 
        ? new Date(Date.now() + form.expiresInHours * 3600000).toISOString() 
        : null,
      active: true,
      issued_by: user?.id || null,
    };

    const { error } = editingId
      ? await supabase.from('alerts').update(payload).eq('id', editingId)
      : await supabase.from('alerts').insert(payload);

    if (error) {
      alert('Error: ' + error.message);
    } else {
      setForm({
        title: '',
        message: '',
        severity: 'info',
        issuer_name: user?.full_name || '',
        issuer_organization: '',
        affected_areas: '',
        category: '',
        contact_info: '',
        action_required: '',
        expiresInHours: 24,
      });
      setEditingId(null);
      setShowForm(false);
      fetchAlerts();
    }
  };

  const deactivateAlert = async (id: string) => {
    if (!confirm('Deactivate this alert?')) return;
    await supabase.from('alerts').update({ active: false }).eq('id', id);
    fetchAlerts();
  };

  const getSeverityStyle = (severity: AlertSeverity) => {
    const styles = {
      emergency: {
        bg: 'bg-red-50',
        border: 'border-red-600',
        text: 'text-red-900',
        badge: 'bg-red-600 text-white',
        icon: '🆘',
      },
      warning: {
        bg: 'bg-orange-50',
        border: 'border-orange-500',
        text: 'text-orange-900',
        badge: 'bg-orange-500 text-white',
        icon: '🚨',
      },
      advisory: {
        bg: 'bg-yellow-50',
        border: 'border-yellow-500',
        text: 'text-yellow-900',
        badge: 'bg-yellow-500 text-white',
        icon: '⚠️',
      },
      info: {
        bg: 'bg-blue-50',
        border: 'border-blue-500',
        text: 'text-blue-900',
        badge: 'bg-blue-500 text-white',
        icon: '📢',
      },
    };
    return styles[severity];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl text-gray-600">Loading alerts...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-5xl font-bold text-gabriola-green flex items-center gap-3">
            <Bell className="w-12 h-12" />
            Community Alerts
          </h1>
          <p className="text-gray-600 mt-2">
            {alerts.length} active alert{alerts.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canManageAlerts && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-gabriola-green text-white px-6 py-3 rounded-full font-bold hover:bg-gabriola-green-dark flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Issue Alert
          </button>
        )}
      </div>

      {/* Active Alerts */}
      <div className="space-y-4 mb-12">
        {alerts.length === 0 ? (
          <div className="text-center py-20 text-gray-600">
            <Bell className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-2xl">Nothing to report...all is calm on Gabriola Island</p>
          </div>
        ) : (
          alerts.map(alert => {
            const style = getSeverityStyle(alert.severity);
            return (
              <div
                key={alert.id}
                className={`${style.bg} ${style.border} border-l-4 rounded-lg p-6 shadow-md`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`${style.badge} px-3 py-1 rounded-full text-sm font-bold uppercase flex items-center gap-2`}>
                        <span>{style.icon}</span>
                        {alert.severity}
                      </span>
                      {alert.affected_areas && alert.affected_areas.length > 0 && (
                        <span className="text-sm text-gray-600">
                          📍 {alert.affected_areas.join(', ')}
                        </span>
                      )}
                    </div>
                    <h3 className={`text-2xl font-bold ${style.text} mb-2`}>
                      {alert.title}
                    </h3>
                    <p className={`${style.text} text-lg mb-4 whitespace-pre-wrap`}>
                      {alert.message}
                    </p>

                    {alert.action_required && (
                      <div className="bg-white/50 rounded-lg p-4 mb-4">
                        <p className="font-semibold mb-1">⚡ Action Required:</p>
                        <p className="text-sm">{alert.action_required}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-700 mt-4">
                      <span>
                        <strong>Issued by:</strong> {alert.issuer_name}
                        {alert.issuer_organization && ` (${alert.issuer_organization})`}
                      </span>
                      {alert.contact_info && (
                        <span>
                          <strong>Contact:</strong> {alert.contact_info}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-gray-500 mt-2">
                      Posted: {new Date(alert.created_at).toLocaleString()}
                      {alert.expires_at && (
                        <> • Expires: {new Date(alert.expires_at).toLocaleString()}</>
                      )}
                    </div>
                  </div>

                  {canEditAlert(alert) && (
                    <button
                      onClick={() => deactivateAlert(alert.id)}
                      className="ml-4 p-2 text-red-600 hover:bg-red-100 rounded-full"
                      title="Deactivate alert"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">
                {editingId ? 'Edit Alert' : 'Issue New Alert'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={createOrUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Severity *</label>
                <select
                  value={form.severity}
                  onChange={(e) => setForm({ ...form, severity: e.target.value as AlertSeverity })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                >
                  <option value="info">Info (community notices)</option>
                  <option value="advisory">Advisory (awareness)</option>
                  <option value="warning">Warning (take action)</option>
                  <option value="emergency">Emergency (life safety)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Message *</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  rows={5}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Issuer Name</label>
                  <input
                    type="text"
                    value={form.issuer_name}
                    onChange={(e) => setForm({ ...form, issuer_name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Organization</label>
                  <input
                    type="text"
                    value={form.issuer_organization}
                    onChange={(e) => setForm({ ...form, issuer_organization: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Affected Areas (comma-separated)
                </label>
                <input
                  type="text"
                  value={form.affected_areas}
                  onChange={(e) => setForm({ ...form, affected_areas: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="e.g., South End, North End, All Island"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Action Required (if any)</label>
                <textarea
                  value={form.action_required}
                  onChange={(e) => setForm({ ...form, action_required: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="What should people do?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Contact Info</label>
                <input
                  type="text"
                  value={form.contact_info}
                  onChange={(e) => setForm({ ...form, contact_info: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Email or phone"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Expires In (hours)</label>
                <input
                  type="number"
                  value={form.expiresInHours}
                  onChange={(e) => setForm({ ...form, expiresInHours: Number(e.target.value) })}
                  className="w-full px-4 py-2 border rounded-lg"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">0 = never expires</p>
              </div>

              <button
                type="submit"
                className="w-full bg-gabriola-green text-white py-3 rounded-lg font-bold hover:bg-gabriola-green-dark"
              >
                {editingId ? 'Update Alert' : 'Issue Alert'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
