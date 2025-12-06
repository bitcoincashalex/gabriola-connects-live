// components/AlertsManager.tsx — FINAL, FULLY WORKING VERSION
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { AlertTriangle, Plus, Clock, Edit3, Archive, Bell } from 'lucide-react';

interface Alert {
  id: string;
  title: string;
  message: string;
  severity: 'critical' | 'important' | 'advisory' | 'info';
  issuer: string;
  organization: string;
  created_at: string;
  expires_at?: string | null;
  active: boolean;
  user_id?: string | null;
  archived_at?: string | null;
}

export default function AlertsManager() {
  const { user } = useUser() as any;
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [archived, setArchived] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const [form, setForm] = useState({
    title: '',
    message: '',
    severity: 'important' as Alert['severity'],
    issuer: user?.full_name || '',
    organization: '',
    expiresInHours: 24,
  });

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);

    const { data: active } = await supabase
      .from('alerts')
      .select('*')
      .eq('active', true)
      .is('archived_at', null)
      .order('severity_order', { ascending: true })
      .order('created_at', { ascending: false });

    // Auto-expire
    const now = new Date().toISOString();
    if (active) {
      const expired = active.filter(a => a.expires_at && a.expires_at < now);
      if (expired.length) {
        await supabase.from('alerts').update({ active: false }).in('id', expired.map(a => a.id));
      }
    }

    const { data: arch } = await supabase.from('alerts_archive').select('*').order('archived_at', { ascending: false });

    setAlerts(active || []);
    setArchived(arch || []);
    setLoading(false);
  };

  const canManage = (alert: Alert) => {
    if (!user) return false;
    const owns = user.id === alert.user_id;
    const orgAuthorized = user.authorized_orgs?.includes(alert.organization);
    return owns || orgAuthorized;
  };

  const createOrUpdate = async () => {
    if (!form.title.trim() || !form.message.trim()) return alert('Title and message required');

    const payload: Partial<Alert> = {
      title: form.title.trim(),
      message: form.message.trim(),
      severity: form.severity,
      issuer: form.issuer.trim() || 'Anonymous',
      organization: form.organization.trim() || 'Gabriola Connects',
      expires_at: form.expiresInHours > 0 ? new Date(Date.now() + form.expiresInHours * 3600000).toISOString() : null,
      active: true,
      user_id: user?.id || null,
    };

    if (editingId) {
      await supabase.from('alerts').update(payload).eq('id', editingId);
    } else {
      await supabase.from('alerts').insert(payload);
    }

    setForm({ ...form, title: '', message: '' });
    setEditingId(null);
    setShowForm(false);
    fetchAlerts();
  };

  const archiveAlert = async (id: string) => {
    if (!confirm('Archive this alert? It will be hidden from public view.')) return;
    await supabase.rpc('soft_delete_alert', { alert_id: id });
    fetchAlerts();
  };

  const startEdit = (a: Alert) => {
    if (!canManage(a)) return alert('Not authorized');
    setEditingId(a.id);
    setForm({
      title: a.title,
      message: a.message,
      severity: a.severity,
      issuer: a.issuer,
      organization: a.organization,
      expiresInHours: a.expires_at ? Math.max(1, Math.round((new Date(a.expires_at).getTime() - Date.now()) / 3600000)) : 24,
    });
    setShowForm(true);
  };

  const severityColor = (s: Alert['severity']) => {
    const map = {
      critical: 'from-red-600 to-red-700 border-red-800',
      important: 'from-orange-500 to-orange-600 border-orange-700',
      advisory: 'from-yellow-500 to-yellow-600 border-yellow-700',
      info: 'from-blue-600 to-blue-700 border-blue-800',
    };
    return map[s];
  };

  if (loading) return <div className="text-center py-32 text-2xl">Loading alerts...</div>;

  const list = showArchived ? archived : alerts;
  const hasCritical = alerts.some(a => a.severity === 'critical');

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white border-b-4 border-red-600 shadow-xl">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              {hasCritical ? (
                <AlertTriangle className="w-14 h-14 text-red-600" />
              ) : (
                <Bell className="w-14 h-14 text-green-700" />
              )}
              <div>
                <h1 className="text-5xl font-bold text-red-600">Community Alerts</h1>
                {list.length > 0 && (
                  <p className="text-2xl text-gray-700 mt-2">
                    {list.length} {showArchived ? 'archived' : 'active'} alert{list.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              {user && (
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-xl font-bold flex items-center gap-2 transition"
                >
                  <Archive className="w-5 h-5" />
                  {showArchived ? 'Active' : 'Archive'}
                </button>
              )}

              {user?.can_post_alerts && (
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="px-8 py-4 bg-red-600 text-white rounded-xl font-bold flex items-center gap-3 shadow-lg hover:bg-red-700 transition text-xl"
                >
                  <Plus className="w-7 h-7" />
                  {showForm ? 'Cancel' : editingId ? 'Editing…' : 'New Alert'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && user?.can_post_alerts && (
        <div className="max-w-4xl mx-auto p-10 bg-white shadow-2xl -mt-8 relative z-10 border-b-8 border-red-600">
          <h2 className="text-4xl font-bold text-red-600 mb-8">
            {editingId ? 'Edit Alert' : 'Create New Alert'}
          </h2>
          <div className="space-y-6">
            <input placeholder="Title (required)" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full p-5 border-2 rounded-xl text-xl" />
            <textarea placeholder="Message (required)" rows={6} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} className="w-full p-5 border-2 rounded-xl text-lg resize-none" />
            <div className="grid md:grid-cols-3 gap-6">
              <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value as any })} className="p-5 border-2 rounded-xl">
                {(['critical','important','advisory','info'] as const).map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
              <input placeholder="Your Name" value={form.issuer} onChange={e => setForm({ ...form, issuer: e.target.value })} className="p-5 border-2 rounded-xl" />
              <input type="number" placeholder="Expires in hours (0 = never)" value={form.expiresInHours} onChange={e => setForm({ ...form, expiresInHours: +e.target.value || 0 })} className="p-5 border-2 rounded-xl" />
            </div>
            <input placeholder="Organization (optional)" value={form.organization} onChange={e => setForm({ ...form, organization: e.target.value })} className="w-full p-5 border-2 rounded-xl" />
            <button onClick={createOrUpdate} className="w-full py-6 bg-red-600 hover:bg-red-700 text-white text-2xl font-bold rounded-xl transition shadow-xl">
              {editingId ? 'Update Alert' : 'Publish Alert'}
            </button>
          </div>
        </div>
      )}

      {/* Alerts List */}
      <div className="max-w-4xl mx-auto p-10 space-y-10">
        {list.length === 0 ? (
          <div className="text-center py-32">
            {hasCritical || showArchived ? null : <Bell className="w-32 h-32 text-gray-300 mx-auto mb-8" />}
            <p className="text-4xl font-bold text-gray-500">
              {showArchived ? 'No archived alerts' : 'Nothing to report right now'}
            </p>
            <p className="text-2xl text-gray-400 mt-4">All is calm on Gabriola Island</p>
          </div>
        ) : (
          list.map(alert => (
            <div key={alert.id} className={`bg-gradient-to-br ${severityColor(alert.severity)} border-4 rounded-2xl shadow-2xl text-white overflow-hidden ${showArchived ? 'opacity-75' : ''}`}>
              <div className="p-10">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <div className="flex items-center gap-6 mb-6">
                      <span className="px-8 py-3 bg-white/30 rounded-full font-bold text-2xl uppercase">{alert.severity}</span>
                      {alert.organization && <span className="text-xl opacity-90">{alert.organization}</span>}
                    </div>
                    <h3 className="text-5xl font-bold mb-4">{alert.title}</h3>
                    <p className="text-2xl opacity-95">Issued by: {alert.issuer}</p>
                  </div>

                  {!showArchived && canManage(alert) && (
                    <div className="flex gap-3">
                      <button onClick={() => startEdit(alert)} className="p-3 bg-white/20 hover:bg-white/30 rounded-full transition" title="Edit">
                        <Edit3 className="w-6 h-6" />
                      </button>

                      {user?.role === 'admin' && (
                        <button onClick={() => archiveAlert(alert.id)} className="p-3 bg-white/20 hover:bg-white/30 rounded-full transition" title="Archive">
                          <Archive className="w-6 h-6" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-2xl leading-relaxed mb-10 whitespace-pre-wrap">{alert.message}</p>

                <div className="flex justify-between text-lg opacity-90 pt-6 border-t border-white/30">
                  <div className="flex items-center gap-3">
                    <Clock className="w-6 h-6" />
                    <span>Posted {new Date(alert.created_at).toLocaleString()}</span>
                  </div>
                  {alert.expires_at && <span>Expires {new Date(alert.expires_at).toLocaleString()}</span>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}