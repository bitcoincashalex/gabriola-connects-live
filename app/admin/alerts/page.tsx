// app/admin/alerts/page.tsx
// Version: 1.2.0 - Added timezone conversion (UTC to local) for all dates
// Date: 2025-12-20
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { 
  AlertTriangle, Search, Filter, Edit2, Trash2, Archive, 
  RotateCcw, Plus, X, Save, Building2, FileText, Users,
  AlertCircle, Info, Bell, Clock, MapPin
} from 'lucide-react';

interface Alert {
  id: string;
  severity: string;
  title: string;
  message: string;
  issued_by?: string;
  on_behalf_of_organization?: string;
  created_at: string;
  expires_at?: string | null;
  active: boolean;
  category?: string;
  creator_name?: string;
}

interface Organization {
  id: string;
  name: string;
  display_name: string;
  max_severity: string;
  description?: string;
  contact_email?: string;
  contact_phone?: string;
  is_active: boolean;
}

interface Template {
  id: string;
  organization_id: string;
  name: string;
  title_template: string;
  message_template: string;
  default_severity: string;
  default_affected_area?: string;
  is_active: boolean;
  usage_count: number;
}

type TabType = 'alerts' | 'templates' | 'organizations' | 'authorizations';

// Helper function to convert UTC to local datetime-local format
function utcToLocal(utcString: string): string {
  const date = new Date(utcString);
  // Format: YYYY-MM-DDTHH:mm for datetime-local input
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Helper function to convert local datetime-local to UTC
function localToUtc(localString: string): string {
  const date = new Date(localString);
  return date.toISOString();
}

export default function AdminAlertsPage() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();

  // Helper to get auth headers for API calls
  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    
    if (!token) {
      console.error('❌ No access token found');
      throw new Error('Not authenticated - please log in again');
    }
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // State
  const [activeTab, setActiveTab] = useState<TabType>('alerts');
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [userAuths, setUserAuths] = useState<any[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'archived'>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Auth check
  useEffect(() => {
    if (!authLoading) {
      if (!user?.is_super_admin) {
        router.push('/');
        alert('Access denied: Super Admin only');
      } else {
        fetchAllData();
      }
    }
  }, [user, authLoading, router]);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchAlerts(),
      fetchOrganizations(),
      fetchTemplates(),
      fetchUserAuthorizations()
    ]);
    setLoading(false);
  };

  const fetchAlerts = async () => {
    const { data } = await supabase
      .from('alerts')
      .select(`
        *,
        creator:users!issued_by(full_name)
      `)
      .order('created_at', { ascending: false });

    if (data) {
      const formatted = data.map(alert => ({
        ...alert,
        creator_name: alert.creator?.full_name
      }));
      setAlerts(formatted);
    }
  };

  const fetchOrganizations = async () => {
    const { data } = await supabase
      .from('alert_organizations')
      .select('*')
      .order('display_name');

    if (data) {
      setOrganizations(data);
    }
  };

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from('alert_templates')
      .select('*')
      .order('name');

    if (data) {
      setTemplates(data);
    }
  };

  const fetchUserAuthorizations = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, full_name, email, alert_organization, alert_level_permission')
      .not('alert_organization', 'is', null);

    if (data) {
      setUserAuths(data);
    }
  };

  // Alert operations
  const openEditAlert = (alert: Alert) => {
    setEditingAlert(alert);
    setShowAlertModal(true);
  };

  const saveAlert = async (alertData: any) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/alerts/${editingAlert?.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(alertData)
      });

      if (response.ok) {
        alert('Alert updated successfully!');
        setShowAlertModal(false);
        fetchAlerts();
      } else {
        const error = await response.json();
        console.error('Error updating alert:', error);
        alert(`Error updating alert: ${error.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error in saveAlert:', error);
      alert(`Error: ${error.message || 'Not authenticated'}`);
    }
  };

  const deleteAlert = async (alertId: string) => {
    if (!confirm('Permanently delete this alert?')) return;

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/alerts/${alertId}`, {
        method: 'DELETE',
        headers
      });

      if (response.ok) {
        alert('Alert deleted');
        fetchAlerts();
      } else {
        const error = await response.json();
        console.error('Error deleting alert:', error);
        alert(`Error deleting alert: ${error.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error in deleteAlert:', error);
      alert(`Error: ${error.message || 'Not authenticated'}`);
    }
  };

  const archiveAlert = async (alertId: string) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/alerts/${alertId}/archive`, {
        method: 'POST',
        headers
      });

      if (response.ok) {
        fetchAlerts();
      } else {
        const error = await response.json();
        console.error('Error archiving alert:', error);
        alert(`Error archiving alert: ${error.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error in archiveAlert:', error);
      alert(`Error: ${error.message || 'Not authenticated'}`);
    }
  };

  const restoreAlert = async (alertId: string) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/alerts/${alertId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ active: true })
      });

      if (response.ok) {
        fetchAlerts();
      } else {
        const error = await response.json();
        console.error('Error restoring alert:', error);
      }
    } catch (error: any) {
      console.error('Error in restoreAlert:', error);
    }
  };

  const bulkArchiveExpired = async () => {
    if (!confirm('Archive all expired alerts?')) return;

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/admin/alerts/bulk', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'archive' })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Archived ${result.count} expired alerts`);
        fetchAlerts();
      } else {
        const error = await response.json();
        console.error('Error bulk archiving:', error);
        alert(`Error archiving alerts: ${error.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error in bulkArchiveExpired:', error);
      alert(`Error: ${error.message || 'Not authenticated'}`);
    }
  };

  // Organization operations
  const saveOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg) return;

    const { data, error } = editingOrg.id
      ? await supabase
          .from('alert_organizations')
          .update({
            name: editingOrg.name,
            display_name: editingOrg.display_name,
            max_severity: editingOrg.max_severity,
            description: editingOrg.description,
            contact_email: editingOrg.contact_email,
            contact_phone: editingOrg.contact_phone,
            is_active: editingOrg.is_active
          })
          .eq('id', editingOrg.id)
      : await supabase
          .from('alert_organizations')
          .insert({
            name: editingOrg.name,
            display_name: editingOrg.display_name,
            max_severity: editingOrg.max_severity,
            description: editingOrg.description,
            contact_email: editingOrg.contact_email,
            contact_phone: editingOrg.contact_phone,
            is_active: editingOrg.is_active
          });

    if (!error) {
      alert('Organization saved!');
      setShowOrgModal(false);
      fetchOrganizations();
    }
  };

  // Template operations
  const saveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;

    const { error } = editingTemplate.id
      ? await supabase
          .from('alert_templates')
          .update({
            organization_id: editingTemplate.organization_id,
            name: editingTemplate.name,
            title_template: editingTemplate.title_template,
            message_template: editingTemplate.message_template,
            default_severity: editingTemplate.default_severity,
            default_affected_area: editingTemplate.default_affected_area,
            is_active: editingTemplate.is_active
          })
          .eq('id', editingTemplate.id)
      : await supabase
          .from('alert_templates')
          .insert({
            organization_id: editingTemplate.organization_id,
            name: editingTemplate.name,
            title_template: editingTemplate.title_template,
            message_template: editingTemplate.message_template,
            default_severity: editingTemplate.default_severity,
            default_affected_area: editingTemplate.default_affected_area,
            is_active: editingTemplate.is_active
          });

    if (!error) {
      alert('Template saved!');
      setShowTemplateModal(false);
      fetchTemplates();
    }
  };

  // Filter alerts
  const filteredAlerts = alerts.filter(alert => {
    // Status filter
    if (statusFilter === 'active') {
      const notExpired = !alert.expires_at || new Date(alert.expires_at) >= new Date();
      if (!alert.active || !notExpired) return false;
    } else if (statusFilter === 'expired') {
      if (!alert.active || !alert.expires_at || new Date(alert.expires_at) >= new Date()) return false;
    } else if (statusFilter === 'archived') {
      if (alert.active) return false;
    }

    // Severity filter
    if (severityFilter !== 'all' && alert.severity !== severityFilter) return false;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!alert.title.toLowerCase().includes(query) &&
          !alert.message.toLowerCase().includes(query)) {
        return false;
      }
    }

    return true;
  });

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gabriola-green"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gabriola-green mb-2">
                🔐 Alert System Administration
              </h1>
              <p className="text-gray-600">Manage all alerts, templates, and organizations</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mt-6 border-b">
            <button
              onClick={() => setActiveTab('alerts')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'alerts'
                  ? 'text-gabriola-green border-b-2 border-gabriola-green'
                  : 'text-gray-600 hover:text-gabriola-green'
              }`}
            >
              All Alerts ({alerts.length})
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'templates'
                  ? 'text-gabriola-green border-b-2 border-gabriola-green'
                  : 'text-gray-600 hover:text-gabriola-green'
              }`}
            >
              Templates ({templates.length})
            </button>
            <button
              onClick={() => setActiveTab('organizations')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'organizations'
                  ? 'text-gabriola-green border-b-2 border-gabriola-green'
                  : 'text-gray-600 hover:text-gabriola-green'
              }`}
            >
              Organizations ({organizations.length})
            </button>
            <button
              onClick={() => setActiveTab('authorizations')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'authorizations'
                  ? 'text-gabriola-green border-b-2 border-gabriola-green'
                  : 'text-gray-600 hover:text-gabriola-green'
              }`}
            >
              User Authorizations ({userAuths.length})
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* ALERTS TAB */}
        {activeTab === 'alerts' && (
          <div>
            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="all">All ({alerts.length})</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Severity</label>
                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="all">All</option>
                    <option value="emergency">Emergency</option>
                    <option value="warning">Warning</option>
                    <option value="advisory">Advisory</option>
                    <option value="info">Info</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Search</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search title or message..."
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={bulkArchiveExpired}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm"
                >
                  Archive All Expired
                </button>
              </div>
            </div>

            {/* Alerts Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organization</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Creator</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredAlerts.map(alert => {
                      const isExpired = alert.expires_at && new Date(alert.expires_at) < new Date();
                      const isArchived = !alert.active;

                      return (
                        <tr key={alert.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              isArchived ? 'bg-gray-600 text-white' :
                              isExpired ? 'bg-orange-600 text-white' :
                              'bg-green-600 text-white'
                            }`}>
                              {isArchived ? 'Archived' : isExpired ? 'Expired' : 'Active'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              alert.severity === 'emergency' ? 'bg-red-600 text-white' :
                              alert.severity === 'warning' ? 'bg-orange-600 text-white' :
                              alert.severity === 'advisory' ? 'bg-yellow-600 text-white' :
                              'bg-blue-600 text-white'
                            }`}>
                              {alert.severity}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium max-w-xs truncate">
                            {alert.title}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {alert.on_behalf_of_organization || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {alert.creator_name || 'Unknown'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(alert.created_at).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {alert.expires_at ? new Date(alert.expires_at).toLocaleString() : 'Never'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex gap-1 justify-end">
                              <button
                                onClick={() => openEditAlert(alert)}
                                className="p-1 hover:bg-gray-200 rounded"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              {!isArchived && (
                                <button
                                  onClick={() => archiveAlert(alert.id)}
                                  className="p-1 hover:bg-gray-200 rounded"
                                  title="Archive"
                                >
                                  <Archive className="w-4 h-4" />
                                </button>
                              )}
                              {isArchived && (
                                <button
                                  onClick={() => restoreAlert(alert.id)}
                                  className="p-1 hover:bg-gray-200 rounded text-green-600"
                                  title="Restore"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => deleteAlert(alert.id)}
                                className="p-1 hover:bg-gray-200 rounded text-red-600"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filteredAlerts.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No alerts found
                </div>
              )}
            </div>
          </div>
        )}

        {/* TEMPLATES TAB */}
        {activeTab === 'templates' && (
          <div>
            <div className="mb-4">
              <button
                onClick={() => {
                  setEditingTemplate({
                    id: '',
                    organization_id: '',
                    name: '',
                    title_template: '',
                    message_template: '',
                    default_severity: 'info',
                    default_affected_area: '',
                    is_active: true,
                    usage_count: 0
                  });
                  setShowTemplateModal(true);
                }}
                className="bg-gabriola-green text-white px-4 py-2 rounded-lg hover:bg-gabriola-green-dark flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                New Template
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map(template => {
                const org = organizations.find(o => o.id === template.organization_id);
                return (
                  <div key={template.id} className="bg-white rounded-lg shadow-sm p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-lg">{template.name}</h3>
                        <p className="text-sm text-gray-600">{org?.display_name}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setEditingTemplate(template);
                            setShowTemplateModal(true);
                          }}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="text-sm text-gray-700 space-y-1">
                      <p><strong>Title:</strong> {template.title_template}</p>
                      <p><strong>Severity:</strong> {template.default_severity}</p>
                      <p><strong>Used:</strong> {template.usage_count} times</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ORGANIZATIONS TAB */}
        {activeTab === 'organizations' && (
          <div>
            <div className="mb-4">
              <button
                onClick={() => {
                  setEditingOrg({
                    id: '',
                    name: '',
                    display_name: '',
                    max_severity: 'info',
                    description: '',
                    contact_email: '',
                    contact_phone: '',
                    is_active: true
                  });
                  setShowOrgModal(true);
                }}
                className="bg-gabriola-green text-white px-4 py-2 rounded-lg hover:bg-gabriola-green-dark flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                New Organization
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {organizations.map(org => (
                <div key={org.id} className="bg-white rounded-lg shadow-sm p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-lg">{org.display_name}</h3>
                      <p className="text-sm text-gray-600">{org.name}</p>
                    </div>
                    <button
                      onClick={() => {
                        setEditingOrg(org);
                        setShowOrgModal(true);
                      }}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-sm space-y-1">
                    <p><strong>Max Severity:</strong> {org.max_severity}</p>
                    {org.description && <p className="text-gray-600">{org.description}</p>}
                    {org.contact_email && <p className="text-gray-600">📧 {org.contact_email}</p>}
                    {org.contact_phone && <p className="text-gray-600">📞 {org.contact_phone}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AUTHORIZATIONS TAB */}
        {activeTab === 'authorizations' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4">Users Assigned to Organizations</h2>
            <div className="space-y-3">
              {userAuths.map(auth => {
                const org = organizations.find(o => o.id === auth.alert_organization);
                return (
                  <div key={auth.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{auth.full_name}</p>
                      <p className="text-sm text-gray-600">{auth.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gabriola-green">
                        {org?.display_name || 'Unknown Org'}
                      </p>
                      <p className="text-sm text-gray-600">
                        Max: {auth.alert_level_permission}
                      </p>
                    </div>
                  </div>
                );
              })}
              {userAuths.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  No users assigned to organizations yet
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit Alert Modal */}
      {showAlertModal && editingAlert && (
        <EditAlertModal
          alert={editingAlert}
          organizations={organizations}
          onSave={saveAlert}
          onClose={() => setShowAlertModal(false)}
        />
      )}

      {/* Edit Organization Modal */}
      {showOrgModal && editingOrg && (
        <EditOrgModal
          org={editingOrg}
          onChange={setEditingOrg}
          onSave={saveOrganization}
          onClose={() => setShowOrgModal(false)}
        />
      )}

      {/* Edit Template Modal */}
      {showTemplateModal && editingTemplate && (
        <EditTemplateModal
          template={editingTemplate}
          organizations={organizations}
          onChange={setEditingTemplate}
          onSave={saveTemplate}
          onClose={() => setShowTemplateModal(false)}
        />
      )}
    </div>
  );
}

// Edit Alert Modal Component
function EditAlertModal({ alert, organizations, onSave, onClose }: any) {
  const [formData, setFormData] = useState({
    title: alert.title,
    message: alert.message,
    severity: alert.severity,
    on_behalf_of_organization: alert.on_behalf_of_organization || '',
    category: alert.category || '',
    expires_at: alert.expires_at ? utcToLocal(alert.expires_at) : '',
    active: alert.active
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      expires_at: formData.expires_at ? localToUtc(formData.expires_at) : null
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Edit Alert</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Message</label>
            <textarea
              rows={4}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Severity</label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="info">Info</option>
                <option value="advisory">Advisory</option>
                <option value="warning">Warning</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="">General</option>
                <option value="fire">Fire</option>
                <option value="power">Power</option>
                <option value="water">Water</option>
                <option value="roads">Roads</option>
                <option value="ferry">Ferry</option>
                <option value="weather">Weather</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Organization</label>
            <input
              type="text"
              value={formData.on_behalf_of_organization}
              onChange={(e) => setFormData({ ...formData, on_behalf_of_organization: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Expires At (Your Local Time)</label>
            <input
              type="datetime-local"
              value={formData.expires_at}
              onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">
              Times shown in your local timezone. Leave empty for no expiration.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="active"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="w-5 h-5"
            />
            <label htmlFor="active" className="font-medium">Active</label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-gabriola-green text-white py-3 rounded-lg hover:bg-gabriola-green-dark font-medium"
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Organization Modal Component
function EditOrgModal({ org, onChange, onSave, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full">
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">{org.id ? 'Edit' : 'New'} Organization</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={onSave} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name (ID)</label>
              <input
                type="text"
                value={org.name}
                onChange={(e) => onChange({ ...org, name: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Display Name</label>
              <input
                type="text"
                value={org.display_name}
                onChange={(e) => onChange({ ...org, display_name: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Max Severity</label>
            <select
              value={org.max_severity}
              onChange={(e) => onChange({ ...org, max_severity: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="info">Info</option>
              <option value="advisory">Advisory</option>
              <option value="important">Important</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              rows={2}
              value={org.description || ''}
              onChange={(e) => onChange({ ...org, description: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Contact Email</label>
              <input
                type="email"
                value={org.contact_email || ''}
                onChange={(e) => onChange({ ...org, contact_email: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contact Phone</label>
              <input
                type="tel"
                value={org.contact_phone || ''}
                onChange={(e) => onChange({ ...org, contact_phone: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="org-active"
              checked={org.is_active}
              onChange={(e) => onChange({ ...org, is_active: e.target.checked })}
              className="w-5 h-5"
            />
            <label htmlFor="org-active" className="font-medium">Active</label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-gabriola-green text-white py-3 rounded-lg hover:bg-gabriola-green-dark font-medium"
            >
              Save
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Template Modal Component
function EditTemplateModal({ template, organizations, onChange, onSave, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">{template.id ? 'Edit' : 'New'} Template</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={onSave} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Organization</label>
            <select
              value={template.organization_id}
              onChange={(e) => onChange({ ...template, organization_id: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              required
            >
              <option value="">Select organization</option>
              {organizations.map((org: any) => (
                <option key={org.id} value={org.id}>{org.display_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Template Name</label>
            <input
              type="text"
              value={template.name}
              onChange={(e) => onChange({ ...template, name: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Title Template</label>
            <input
              type="text"
              value={template.title_template}
              onChange={(e) => onChange({ ...template, title_template: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Use [placeholders] for dynamic content"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Message Template</label>
            <textarea
              rows={4}
              value={template.message_template}
              onChange={(e) => onChange({ ...template, message_template: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Use [placeholders] for dynamic content"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Default Severity</label>
              <select
                value={template.default_severity}
                onChange={(e) => onChange({ ...template, default_severity: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="info">Info</option>
                <option value="advisory">Advisory</option>
                <option value="warning">Warning</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Default Area</label>
              <input
                type="text"
                value={template.default_affected_area || ''}
                onChange={(e) => onChange({ ...template, default_affected_area: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="template-active"
              checked={template.is_active}
              onChange={(e) => onChange({ ...template, is_active: e.target.checked })}
              className="w-5 h-5"
            />
            <label htmlFor="template-active" className="font-medium">Active</label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-gabriola-green text-white py-3 rounded-lg hover:bg-gabriola-green-dark font-medium"
            >
              Save
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
