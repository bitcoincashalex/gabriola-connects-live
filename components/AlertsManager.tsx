// components/AlertsManager.tsx
// v5.0.0 - ENHANCED: Added image upload, external links, and URL support for alerts
// Date: 2025-01-11
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { AlertTriangle, Plus, X, Bell, AlertCircle, Info, Edit2, Archive, Clock, Building2, FileText, ExternalLink, Image, Upload } from 'lucide-react';
import { AlertSeverity } from '@/lib/types';

interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  issued_by?: string | null;
  on_behalf_of_name?: string | null;
  on_behalf_of_organization?: string | null;
  created_at: string;
  expires_at?: string | null;
  active: boolean;
  affected_areas?: string[] | null;
  category?: string | null;
  contact_info?: string | null;
  action_required?: string | null;
  creator_name?: string;
  creator_email?: string;
  image_url?: string | null;
  link_url?: string | null;
  link_text?: string | null;
}

interface Organization {
  id: string;
  name: string;
  display_name: string;
  max_severity: string;
  description?: string;
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

export default function AlertsManager() {
  const { user } = useUser();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [expiredAlerts, setExpiredAlerts] = useState<Alert[]>([]);
  const [archivedAlerts, setArchivedAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
  const [viewMode, setViewMode] = useState<'active' | 'expired' | 'archived'>('active');
  
  // Organization and template data
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [userOrganization, setUserOrganization] = useState<Organization | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [availableTemplates, setAvailableTemplates] = useState<Template[]>([]);

  const [form, setForm] = useState({
    title: '',
    message: '',
    severity: 'info' as AlertSeverity,
    on_behalf_of_name: '',
    on_behalf_of_organization: '',
    affected_areas: '',
    category: '',
    contact_info: '',
    action_required: '',
    expiresInHours: 24,
    image_url: null as string | null,
    link_url: '',
    link_text: 'More Information',
  });

  // Image upload state
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    fetchOrganizationsAndTemplates();
    fetchAlerts();
  }, []);

  // Fetch organizations and templates
  const fetchOrganizationsAndTemplates = async () => {
    // Fetch organizations
    const { data: orgsData } = await supabase
      .from('alert_organizations')
      .select('*')
      .eq('is_active', true)
      .order('display_name');
    
    if (orgsData) {
      setOrganizations(orgsData);
    }

    // Fetch templates
    const { data: templatesData } = await supabase
      .from('alert_templates')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (templatesData) {
      setTemplates(templatesData);
    }

    // Check if user is assigned to an organization
    if ((user as any)?.alert_organization) {
      const userOrg = orgsData?.find(o => o.id === (user as any).alert_organization);
      if (userOrg) {
        setUserOrganization(userOrg);
        setSelectedOrgId(userOrg.id);
        // Filter templates for user's org
        const orgTemplates = templatesData?.filter(t => t.organization_id === userOrg.id) || [];
        setAvailableTemplates(orgTemplates);
      }
    } else {
      // User not assigned, show all templates
      setAvailableTemplates(templatesData || []);
    }
  };

  const fetchAlerts = async () => {
    setLoading(true);

    // Fetch ACTIVE alerts (not expired)
    const { data: activeData } = await supabase
      .from('alerts')
      .select(`
        *,
        creator:users!issued_by(full_name, email)
      `)
      .eq('active', true)
      .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)
      .order('created_at', { ascending: false });

    if (activeData) {
      const formattedActive = activeData.map(alert => ({
        ...alert,
        creator_name: alert.creator?.full_name,
        creator_email: alert.creator?.email,
      }));
      
      const sorted = formattedActive.sort((a, b) => {
        const priority = { emergency: 1, warning: 2, advisory: 3, info: 4 };
        return priority[a.severity as AlertSeverity] - priority[b.severity as AlertSeverity];
      });
      setAlerts(sorted);
    }

    // Fetch EXPIRED alerts (active=true but past expiry)
    const { data: expiredData } = await supabase
      .from('alerts')
      .select(`
        *,
        creator:users!issued_by(full_name, email)
      `)
      .eq('active', true)
      .lt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false });

    if (expiredData) {
      const formattedExpired = expiredData.map(alert => ({
        ...alert,
        creator_name: alert.creator?.full_name,
        creator_email: alert.creator?.email,
      }));
      setExpiredAlerts(formattedExpired);
    }

    // Fetch ARCHIVED alerts
    const { data: archivedData } = await supabase
      .from('alerts')
      .select(`
        *,
        creator:users!issued_by(full_name, email)
      `)
      .eq('active', false)
      .order('created_at', { ascending: false })
      .limit(50);

    if (archivedData) {
      const formattedArchived = archivedData.map(alert => ({
        ...alert,
        creator_name: alert.creator?.full_name,
        creator_email: alert.creator?.email,
      }));
      setArchivedAlerts(formattedArchived);
    }

    setLoading(false);
  };

  const canManageAlerts = user?.can_issue_alerts || user?.is_super_admin || false;

  const canEditAlert = (alert: Alert) => {
    if (!user) return false;
    return user.is_super_admin || alert.issued_by === user.id;
  };

  // Get max severity based on user assignment
  const getMaxSeverity = () => {
    if (userOrganization) {
      return userOrganization.max_severity;
    }
    return (user as any)?.alert_level_permission || 'info';
  };

  // Get allowed severities based on max
  const getAllowedSeverities = () => {
    const maxSeverity = getMaxSeverity();
    const severityLevels: { [key: string]: number } = {
      'info': 1,
      'advisory': 2,
      'warning': 3,
      'important': 3,
      'emergency': 4,
      'critical': 4,
    };
    
    const maxLevel = severityLevels[maxSeverity] || 1;
    return Object.keys(severityLevels)
      .filter(sev => severityLevels[sev] <= maxLevel)
      .filter((sev, index, arr) => {
        // Remove duplicates (warning/important, emergency/critical)
        if (sev === 'important') return !arr.includes('warning');
        if (sev === 'critical') return !arr.includes('emergency');
        return true;
      });
  };

  // Handle organization selection (for non-assigned users)
  const handleOrgSelection = (orgId: string) => {
    setSelectedOrgId(orgId);
    
    if (orgId) {
      const org = organizations.find(o => o.id === orgId);
      const orgTemplates = templates.filter(t => t.organization_id === orgId);
      setAvailableTemplates(orgTemplates);
      setForm({
        ...form,
        on_behalf_of_organization: org?.display_name || '',
      });
    } else {
      setAvailableTemplates(templates);
      setForm({
        ...form,
        on_behalf_of_organization: '',
      });
    }
    
    // Reset template selection
    setSelectedTemplateId('');
  };

  // Handle template selection
  const handleTemplateSelection = async (templateId: string) => {
    setSelectedTemplateId(templateId);
    
    if (templateId) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setForm({
          ...form,
          title: template.title_template,
          message: template.message_template,
          severity: template.default_severity as AlertSeverity,
          affected_areas: template.default_affected_area || '',
        });
        
        // Increment usage count
        await supabase
          .from('alert_templates')
          .update({ usage_count: template.usage_count + 1 })
          .eq('id', templateId);
      }
    }
  };

  const openEditForm = (alert: Alert) => {
    setEditingAlert(alert);
    setForm({
      title: alert.title,
      message: alert.message,
      severity: alert.severity,
      on_behalf_of_name: alert.on_behalf_of_name || '',
      on_behalf_of_organization: alert.on_behalf_of_organization || '',
      affected_areas: alert.affected_areas?.join(', ') || '',
      category: alert.category || '',
      contact_info: alert.contact_info || '',
      action_required: alert.action_required || '',
      expiresInHours: 24,
      image_url: alert.image_url || null,
      link_url: alert.link_url || '',
      link_text: alert.link_text || 'More Information',
    });
    setShowForm(true);
  };

  const openNewForm = () => {
    setEditingAlert(null);
    
    // If user is assigned to org, pre-fill organization
    if (userOrganization) {
      setForm({
        title: '',
        message: '',
        severity: 'info' as AlertSeverity,
        on_behalf_of_name: '',
        on_behalf_of_organization: userOrganization.display_name,
        affected_areas: '',
        category: '',
        contact_info: '',
        action_required: '',
        expiresInHours: 24,
        image_url: null,
        link_url: '',
        link_text: 'More Information',
      });
    } else {
      setForm({
        title: '',
        message: '',
        severity: 'info' as AlertSeverity,
        on_behalf_of_name: '',
        on_behalf_of_organization: '',
        affected_areas: '',
        category: '',
        contact_info: '',
        action_required: '',
        expiresInHours: 24,
        image_url: null,
        link_url: '',
        link_text: 'More Information',
      });
      setSelectedOrgId('');
    }
    
    setSelectedTemplateId('');
    setShowForm(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    setIsUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `alert-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('public-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('public-assets')
        .getPublicUrl(filePath);

      setForm({ ...form, image_url: publicUrl });
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Make sure the public-assets bucket exists.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const removeImage = () => {
    setForm({ ...form, image_url: null });
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
      on_behalf_of_name: form.on_behalf_of_name.trim() || null,
      on_behalf_of_organization: form.on_behalf_of_organization.trim() || null,
      affected_areas: areasArray.length > 0 ? areasArray : null,
      category: form.category.trim() || null,
      contact_info: form.contact_info.trim() || null,
      action_required: form.action_required.trim() || null,
      expires_at: new Date(Date.now() + form.expiresInHours * 60 * 60 * 1000).toISOString(),
      active: true,
      image_url: form.image_url || null,
      link_url: form.link_url.trim() || null,
      link_text: form.link_text.trim() || 'More Information',
    };

    if (editingAlert) {
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
    if (!confirm('Archive this alert? It will be viewable in the archive tab.')) return;

    // Use API route with service role to bypass RLS
    const response = await fetch(`/api/admin/alerts/${alertId}/archive`, {
      method: 'POST',
    });

    if (response.ok) {
      fetchAlerts();
    } else {
      alert('Error archiving alert');
    }
  };

  const restoreAlert = async (alertId: string) => {
    if (!confirm('Restore this alert to active status?')) return;

    const { error } = await supabase
      .from('alerts')
      .update({ active: true })
      .eq('id', alertId);

    if (error) {
      alert('Error restoring: ' + error.message);
    } else {
      fetchAlerts();
    }
  };

  const renderAlert = (alert: Alert, isArchived: boolean, isExpired: boolean) => {
    const severityColors = {
      emergency: 'bg-red-50 border-red-300',
      warning: 'bg-orange-50 border-orange-300',
      advisory: 'bg-yellow-50 border-yellow-300',
      info: 'bg-blue-50 border-blue-300',
    };

    const severityIcons = {
      emergency: AlertTriangle,
      warning: AlertCircle,
      advisory: Bell,
      info: Info,
    };

    const Icon = severityIcons[alert.severity as AlertSeverity] || Info;

    return (
      <div
        key={alert.id}
        className={`border-2 rounded-lg p-4 ${severityColors[alert.severity as AlertSeverity]}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Icon className="w-6 h-6 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg mb-1">{alert.title}</h3>
              <p className="text-gray-700 whitespace-pre-wrap mb-3">{alert.message}</p>
              
              {/* Alert Image */}
              {alert.image_url && (
                <div className="mb-3">
                  <img 
                    src={alert.image_url} 
                    alt={alert.title}
                    className="w-full max-h-96 object-cover rounded-lg border-2 border-gray-300"
                  />
                </div>
              )}

              {/* External Link */}
              {alert.link_url && (
                <div className="mb-3">
                  <a
                    href={alert.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold text-sm transition-colors"
                  >
                    {alert.link_text || 'More Information'}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}
              
              <div className="text-sm text-gray-600 space-y-1">
                {alert.on_behalf_of_name || alert.on_behalf_of_organization ? (
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" />
                    <span>
                      {alert.on_behalf_of_name}
                      {alert.on_behalf_of_organization && ` (${alert.on_behalf_of_organization})`}
                    </span>
                  </div>
                ) : null}
                
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>
                    Created: {new Date(alert.created_at).toLocaleString()}
                    {alert.expires_at && (
                      <> • Expires: {new Date(alert.expires_at).toLocaleString()}</>
                    )}
                  </span>
                </div>

                {alert.category && (
                  <div className="inline-block px-2 py-0.5 bg-gray-200 rounded text-xs">
                    {alert.category}
                  </div>
                )}
              </div>
            </div>
          </div>

          {canEditAlert(alert) && (
            <div className="flex gap-2 flex-shrink-0">
              {!isArchived && !isExpired && (
                <button
                  onClick={() => openEditForm(alert)}
                  className="p-2 hover:bg-white rounded-lg transition-colors"
                  title="Edit"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
              )}
              {!isArchived ? (
                <button
                  onClick={() => archiveAlert(alert.id)}
                  className="p-2 hover:bg-white rounded-lg transition-colors"
                  title="Archive"
                >
                  <Archive className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={() => restoreAlert(alert.id)}
                  className="p-2 hover:bg-white rounded-lg transition-colors text-green-600"
                  title="Restore"
                >
                  <Archive className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!canManageAlerts) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-yellow-600" />
          <p className="text-gray-700">
            You don't have permission to manage alerts.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gabriola-green mb-2">
            Manage Alerts
          </h1>
          {userOrganization && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Building2 className="w-4 h-4" />
              <span>Authorized for: <strong>{userOrganization.display_name}</strong></span>
              <span className="px-2 py-0.5 bg-gabriola-green text-white rounded text-xs">
                {userOrganization.max_severity} level
              </span>
            </div>
          )}
        </div>
        <button
          onClick={openNewForm}
          className="bg-gabriola-green text-white px-6 py-3 rounded-lg hover:bg-gabriola-green-dark transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create Alert
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b">
        <button
          onClick={() => setViewMode('active')}
          className={`px-4 py-2 font-medium transition-colors ${
            viewMode === 'active'
              ? 'text-gabriola-green border-b-2 border-gabriola-green'
              : 'text-gray-600 hover:text-gabriola-green'
          }`}
        >
          Active ({alerts.length})
        </button>
        <button
          onClick={() => setViewMode('expired')}
          className={`px-4 py-2 font-medium transition-colors ${
            viewMode === 'expired'
              ? 'text-gabriola-green border-b-2 border-gabriola-green'
              : 'text-gray-600 hover:text-gabriola-green'
          }`}
        >
          Expired ({expiredAlerts.length})
        </button>
        <button
          onClick={() => setViewMode('archived')}
          className={`px-4 py-2 font-medium transition-colors ${
            viewMode === 'archived'
              ? 'text-gabriola-green border-b-2 border-gabriola-green'
              : 'text-gray-600 hover:text-gabriola-green'
          }`}
        >
          Archived ({archivedAlerts.length})
        </button>
      </div>

      {/* Alerts List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gabriola-green mx-auto"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {viewMode === 'active' && alerts.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No active alerts
            </div>
          )}
          {viewMode === 'active' && alerts.map(alert => renderAlert(alert, false, false))}

          {viewMode === 'expired' && expiredAlerts.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No expired alerts
            </div>
          )}
          {viewMode === 'expired' && expiredAlerts.map(alert => renderAlert(alert, false, true))}

          {viewMode === 'archived' && archivedAlerts.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No archived alerts
            </div>
          )}
          {viewMode === 'archived' && archivedAlerts.map(alert => renderAlert(alert, true, false))}
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                {editingAlert ? 'Edit Alert' : 'Create Alert'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={createOrUpdate} className="p-6 space-y-4">
              {/* Organization Selection */}
              {userOrganization ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-blue-900 mb-1">
                    <Building2 className="w-4 h-4" />
                    Representing Organization (Locked)
                  </div>
                  <div className="text-lg font-bold text-blue-900">
                    {userOrganization.display_name}
                  </div>
                  <div className="text-xs text-blue-700 mt-1">
                    You are authorized to issue alerts up to <strong>{userOrganization.max_severity}</strong> level
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    On behalf of (optional)
                  </label>
                  <select
                    value={selectedOrgId}
                    onChange={(e) => handleOrgSelection(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
                  >
                    <option value="">Personal alert / Custom organization</option>
                    {organizations.map(org => (
                      <option key={org.id} value={org.id}>
                        {org.display_name}
                      </option>
                    ))}
                  </select>
                  
                  {!selectedOrgId && (
                    <input
                      type="text"
                      placeholder="Or type custom organization name"
                      value={form.on_behalf_of_organization}
                      onChange={(e) => setForm({ ...form, on_behalf_of_organization: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent mt-2"
                    />
                  )}
                </div>
              )}

              {/* Template Selection */}
              {availableTemplates.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Use Template (optional)
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleTemplateSelection(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
                  >
                    <option value="">Start from blank</option>
                    {availableTemplates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name} ({template.default_severity})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alert Title *
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
                  placeholder="Brief, clear title"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message *
                </label>
                <textarea
                  required
                  rows={4}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
                  placeholder="Detailed information about the alert"
                />
              </div>

              {/* Severity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Severity Level *
                </label>
                <select
                  value={form.severity}
                  onChange={(e) => setForm({ ...form, severity: e.target.value as AlertSeverity })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
                >
                  {getAllowedSeverities().map(sev => (
                    <option key={sev} value={sev}>
                      {sev.charAt(0).toUpperCase() + sev.slice(1)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Your maximum severity: {getMaxSeverity()}
                </p>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
                >
                  <option value="">General</option>
                  <option value="fire">Fire</option>
                  <option value="power">Power/Utilities</option>
                  <option value="water">Water</option>
                  <option value="roads">Roads/Transportation</option>
                  <option value="ferry">Ferry</option>
                  <option value="wildlife">Wildlife</option>
                  <option value="weather">Weather</option>
                  <option value="medical">Medical/Emergency</option>
                  <option value="community">Community Event</option>
                </select>
              </div>

              {/* Affected Areas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Affected Areas (comma separated)
                </label>
                <input
                  type="text"
                  value={form.affected_areas}
                  onChange={(e) => setForm({ ...form, affected_areas: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
                  placeholder="e.g., North End, Taylor Bay Road"
                />
              </div>

              {/* Contact Info */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Information
                </label>
                <input
                  type="text"
                  value={form.contact_info}
                  onChange={(e) => setForm({ ...form, contact_info: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
                  placeholder="Phone number or email for inquiries"
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  Alert Image (optional)
                </label>
                {form.image_url ? (
                  <div className="relative">
                    <img 
                      src={form.image_url} 
                      alt="Alert" 
                      className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full hover:bg-red-700 shadow-lg"
                      title="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gabriola-green hover:bg-gray-50 transition-colors">
                      <Upload className="w-5 h-5 mr-2 text-gray-500" />
                      <span className="text-gray-600">
                        {isUploadingImage ? 'Uploading...' : 'Click to upload image'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={isUploadingImage}
                        className="hidden"
                      />
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Max 5MB • JPEG, PNG, GIF, WebP
                    </p>
                  </div>
                )}
              </div>

              {/* External Link URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  External Link (optional)
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/more-info"
                  value={form.link_url}
                  onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Link to external page with more details
                </p>
              </div>

              {/* Link Button Text */}
              {form.link_url && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Link Button Text
                  </label>
                  <input
                    type="text"
                    placeholder="More Information"
                    value={form.link_text}
                    onChange={(e) => setForm({ ...form, link_text: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Text displayed on the link button
                  </p>
                </div>
              )}

              {/* Expires In */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expires in (hours)
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.expiresInHours}
                  onChange={(e) => setForm({ ...form, expiresInHours: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
                />
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gabriola-green text-white py-3 rounded-lg hover:bg-gabriola-green-dark transition-colors font-medium"
                >
                  {editingAlert ? 'Update Alert' : 'Create Alert'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
