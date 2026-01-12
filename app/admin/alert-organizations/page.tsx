// app/admin/alert-organizations/page.tsx
// Version: 2.1.1 - Mobile responsive fixes (header, org cards stack properly)
// Date: 2025-01-11
// Purpose: View, edit, and create organizations, authorized users, and alert history

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Shield, 
  Phone, 
  Mail, 
  Users, 
  AlertTriangle,
  AlertCircle,
  Bell,
  Info,
  Search,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Building2,
  Zap,
  Clock,
  TrendingUp,
  Filter,
  X,
  Eye,
  Calendar,
  Edit2,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';

interface AlertOrganization {
  id: string;
  name: string;
  display_name: string;
  max_severity: string;
  description: string;
  contact_email: string | null;
  contact_phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthorizedUser {
  id: string;
  full_name: string;
  email: string;
  username: string;
  alert_level_permission: string;
  alert_organization: string;
  is_super_admin: boolean;
  avatar_url: string | null;
}

interface Alert {
  id: string;
  title: string;
  severity: string;
  created_at: string;
  expires_at: string | null;
  created_by: string;
  organization: string | null;
  on_behalf_of_name: string | null;
  on_behalf_of_organization: string | null;
  is_active: boolean;
  creator?: {
    full_name: string;
    email: string;
  };
}

interface OrgWithData extends AlertOrganization {
  authorized_users: AuthorizedUser[];
  alerts: Alert[];
  user_count: number;
  alert_count: number;
  active_alerts: number;
}

export default function AlertOrganizationsAdminPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<OrgWithData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'users' | 'alerts'>('users');
  const [showOnlyActive, setShowOnlyActive] = useState(false);
  const [editingOrg, setEditingOrg] = useState<AlertOrganization | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchAllData();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/signin');
      return;
    }

    const { data: userData } = await supabase
      .from('users')
      .select('is_super_admin, admin_alerts')
      .eq('id', user.id)
      .single();

    if (!userData?.is_super_admin && !userData?.admin_alerts) {
      router.push('/');
    }
  };

  const fetchAllData = async () => {
    setLoading(true);

    try {
      // Fetch all organizations
      const { data: orgs, error: orgsError } = await supabase
        .from('alert_organizations')
        .select('*')
        .order('display_name');

      if (orgsError) throw orgsError;

      // Fetch all users with alert permissions
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, email, username, alert_level_permission, alert_organization, is_super_admin, avatar_url')
        .not('alert_level_permission', 'is', null)
        .order('full_name');

      if (usersError) throw usersError;

      // Fetch all alerts (both active and archived)
      const { data: activeAlerts, error: activeError } = await supabase
        .from('alerts')
        .select(`
          *,
          creator:users!alerts_created_by_fkey(full_name, email)
        `)
        .order('created_at', { ascending: false });

      const { data: archivedAlerts, error: archiveError } = await supabase
        .from('alerts_archive')
        .select('*, creator:users!alerts_archive_created_by_fkey(full_name, email)')
        .order('created_at', { ascending: false });

      if (activeError) console.error('Active alerts error:', activeError);
      if (archiveError) console.error('Archive alerts error:', archiveError);

      const allAlerts = [
        ...(activeAlerts || []).map(a => ({ ...a, is_active: true })),
        ...(archivedAlerts || []).map(a => ({ ...a, is_active: false }))
      ];

      // Combine data
      const orgsWithData: OrgWithData[] = (orgs || []).map(org => {
        // Find users assigned to this org
        const orgUsers = (users || []).filter(u => u.alert_organization === org.id);
        
        // Find alerts by this org OR by users assigned to this org
        const userIds = orgUsers.map(u => u.id);
        const orgAlerts = allAlerts.filter(alert => 
          alert.organization === org.id || 
          (alert.created_by && userIds.includes(alert.created_by))
        );

        const activeCount = orgAlerts.filter(a => a.is_active).length;

        return {
          ...org,
          authorized_users: orgUsers,
          alerts: orgAlerts,
          user_count: orgUsers.length,
          alert_count: orgAlerts.length,
          active_alerts: activeCount
        };
      });

      // Sort by severity and name
      const sorted = orgsWithData.sort((a, b) => {
        const severityOrder = { emergency: 0, warning: 1, advisory: 2, info: 3 };
        const aVal = severityOrder[a.max_severity as keyof typeof severityOrder] ?? 4;
        const bVal = severityOrder[b.max_severity as keyof typeof severityOrder] ?? 4;
        if (aVal !== bVal) return aVal - bVal;
        return a.display_name.localeCompare(b.display_name);
      });

      setOrganizations(sorted);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveOrganization = async (orgData: Partial<AlertOrganization>) => {
    if (!editingOrg) return;
    
    try {
      const isNewOrg = !editingOrg.id;
      
      if (isNewOrg) {
        // Create new organization
        const { error } = await supabase
          .from('alert_organizations')
          .insert([orgData]);

        if (error) throw error;
        alert('Organization created successfully!');
      } else {
        // Update existing organization
        const { error } = await supabase
          .from('alert_organizations')
          .update(orgData)
          .eq('id', editingOrg.id);

        if (error) throw error;
        alert('Organization updated successfully!');
      }

      setShowEditModal(false);
      setEditingOrg(null);
      fetchAllData();
    } catch (error: any) {
      console.error('Error saving organization:', error);
      alert(`Error saving organization: ${error.message}`);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'emergency':
        return AlertTriangle;
      case 'important':
      case 'warning':
        return AlertCircle;
      case 'advisory':
        return Bell;
      default:
        return Info;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'emergency':
        return 'bg-red-50 border-red-300 text-red-900';
      case 'important':
      case 'warning':
        return 'bg-orange-50 border-orange-300 text-orange-900';
      case 'advisory':
        return 'bg-yellow-50 border-yellow-300 text-yellow-900';
      default:
        return 'bg-blue-50 border-blue-300 text-blue-900';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'emergency':
        return 'bg-red-600 text-white';
      case 'important':
      case 'warning':
        return 'bg-orange-600 text-white';
      case 'advisory':
        return 'bg-yellow-600 text-white';
      default:
        return 'bg-blue-600 text-white';
    }
  };

  const getPermissionBadge = (permission: string) => {
    const colors = {
      emergency: 'bg-red-100 text-red-800 border-red-300',
      critical: 'bg-orange-100 text-orange-800 border-orange-300',
      community: 'bg-blue-100 text-blue-800 border-blue-300',
      info: 'bg-gray-100 text-gray-800 border-gray-300',
    };
    return colors[permission as keyof typeof colors] || colors.info;
  };

  // Filter and search
  const filteredOrgs = organizations.filter(org => {
    // Search filter
    const matchesSearch = searchTerm === '' || 
      org.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.authorized_users.some(u => 
        u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
      );

    // Severity filter
    const matchesSeverity = severityFilter === 'all' || org.max_severity === severityFilter;

    // Active filter
    const matchesActive = !showOnlyActive || org.active_alerts > 0;

    return matchesSearch && matchesSeverity && matchesActive;
  });

  // Calculate stats
  const totalOrgs = organizations.length;
  const totalUsers = organizations.reduce((sum, org) => sum + org.user_count, 0);
  const totalAlerts = organizations.reduce((sum, org) => sum + org.alert_count, 0);
  const activeAlerts = organizations.reduce((sum, org) => sum + org.active_alerts, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gabriola-green mx-auto mb-4"></div>
          <p className="text-gray-600">Loading organizations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <Shield className="w-10 h-10 sm:w-12 sm:h-12 text-gabriola-green flex-shrink-0" />
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800">
                  Alert Organizations
                </h1>
                <p className="text-sm sm:text-base text-gray-600 mt-1">
                  Manage organizations, authorized users, and alert history
                </p>
              </div>
            </div>
            <div className="flex gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
              <button
                onClick={() => {
                  setEditingOrg({
                    id: '',
                    name: '',
                    display_name: '',
                    max_severity: 'info',
                    description: '',
                    contact_phone: '',
                    contact_email: '',
                    is_active: true
                  } as AlertOrganization);
                  setShowEditModal(true);
                }}
                className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2 text-sm sm:text-base flex-1 sm:flex-initial"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="whitespace-nowrap">Create New</span>
              </button>
              <button
                onClick={fetchAllData}
                className="px-3 sm:px-4 py-2 bg-gabriola-green text-white rounded-lg hover:bg-gabriola-green-dark transition-colors text-sm sm:text-base"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Organizations</p>
                  <p className="text-3xl font-bold text-blue-900">{totalOrgs}</p>
                </div>
                <Building2 className="w-10 h-10 text-blue-600 opacity-50" />
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">Authorized Users</p>
                  <p className="text-3xl font-bold text-green-900">{totalUsers}</p>
                </div>
                <UserCheck className="w-10 h-10 text-green-600 opacity-50" />
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">Active Alerts</p>
                  <p className="text-3xl font-bold text-purple-900">{activeAlerts}</p>
                </div>
                <Zap className="w-10 h-10 text-purple-600 opacity-50" />
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600 font-medium">Total Alerts</p>
                  <p className="text-3xl font-bold text-orange-900">{totalAlerts}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-orange-600 opacity-50" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search organizations, users..."
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
            </div>

            {/* Severity Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Severity Level
              </label>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
              >
                <option value="all">All Levels</option>
                <option value="critical">Critical</option>
                <option value="important">Important</option>
                <option value="advisory">Advisory</option>
                <option value="info">Info</option>
              </select>
            </div>

            {/* Active Alerts Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter Options
              </label>
              <button
                onClick={() => setShowOnlyActive(!showOnlyActive)}
                className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                  showOnlyActive
                    ? 'bg-gabriola-green text-white border-gabriola-green'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {showOnlyActive ? 'Showing: Active Alerts Only' : 'Show: All Organizations'}
              </button>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-4 text-sm text-gray-600">
            Showing <span className="font-semibold">{filteredOrgs.length}</span> of{' '}
            <span className="font-semibold">{totalOrgs}</span> organizations
          </div>
        </div>

        {/* Organizations List */}
        <div className="space-y-4">
          {filteredOrgs.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
              <Filter className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-xl text-gray-600 mb-2">No organizations found</p>
              <p className="text-gray-500">Try adjusting your search or filters</p>
            </div>
          ) : (
            filteredOrgs.map((org) => {
              const isExpanded = expandedOrg === org.id;
              const SeverityIcon = getSeverityIcon(org.max_severity);

              return (
                <div
                  key={org.id}
                  className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Organization Header */}
                  <div
                    onClick={() => setExpandedOrg(isExpanded ? null : org.id)}
                    className="cursor-pointer p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        {/* Icon */}
                        <div className={`p-3 rounded-lg ${getSeverityColor(org.max_severity)} flex-shrink-0`}>
                          <SeverityIcon className="w-8 h-8" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h3 className="text-lg sm:text-xl font-bold text-gray-800">
                              {org.display_name}
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase ${getSeverityBadge(org.max_severity)}`}>
                              {org.max_severity}
                            </span>
                            {!org.is_active && (
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
                                INACTIVE
                              </span>
                            )}
                          </div>
                          
                          <p className="text-gray-600 mb-3 text-sm sm:text-base">{org.description}</p>

                          {/* Contact Info */}
                          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                            {org.contact_phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate">{org.contact_phone}</span>
                              </div>
                            )}
                            {org.contact_email && (
                              <div className="flex items-center gap-1">
                                <Mail className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate">{org.contact_email}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Stats, Edit Button, and Expand Icon - horizontal on mobile, vertical on desktop */}
                      <div className="flex items-center justify-between lg:flex-col lg:items-end gap-4">
                        {/* Stats */}
                        <div className="flex gap-4 sm:gap-6">
                          <div className="text-center">
                            <p className="text-xl sm:text-2xl font-bold text-gray-800">{org.user_count}</p>
                            <p className="text-xs text-gray-600">Auth</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xl sm:text-2xl font-bold text-purple-600">{org.active_alerts}</p>
                            <p className="text-xs text-gray-600">Active</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xl sm:text-2xl font-bold text-gray-600">{org.alert_count}</p>
                            <p className="text-xs text-gray-600">Total</p>
                          </div>
                        </div>

                        {/* Edit Button and Expand Icon */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingOrg(org);
                              setShowEditModal(true);
                            }}
                            className="p-2 hover:bg-gabriola-green hover:text-white rounded-lg transition-colors text-gray-600 flex-shrink-0"
                            title="Edit Organization"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>

                          {/* Expand Icon */}
                          <div className="flex-shrink-0">
                            {isExpanded ? (
                              <ChevronUp className="w-6 h-6 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-6 h-6 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t bg-gray-50">
                      {/* Tabs */}
                      <div className="flex gap-4 px-6 pt-4 border-b">
                        <button
                          onClick={() => setActiveTab('users')}
                          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                            activeTab === 'users'
                              ? 'border-gabriola-green text-gabriola-green'
                              : 'border-transparent text-gray-600 hover:text-gray-800'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            <span>Authorized Users ({org.user_count})</span>
                          </div>
                        </button>
                        <button
                          onClick={() => setActiveTab('alerts')}
                          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                            activeTab === 'alerts'
                              ? 'border-gabriola-green text-gabriola-green'
                              : 'border-transparent text-gray-600 hover:text-gray-800'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            <span>Alert History ({org.alert_count})</span>
                          </div>
                        </button>
                      </div>

                      {/* Tab Content */}
                      <div className="p-6">
                        {activeTab === 'users' && (
                          <div>
                            {org.authorized_users.length === 0 ? (
                              <div className="text-center py-8 text-gray-500">
                                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>No authorized users assigned to this organization</p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {org.authorized_users.map((user) => (
                                  <div
                                    key={user.id}
                                    className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow"
                                  >
                                    <div className="flex items-start gap-3">
                                      {/* Avatar */}
                                      <div className="w-12 h-12 rounded-full bg-gabriola-green text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                                        {user.full_name.charAt(0).toUpperCase()}
                                      </div>

                                      {/* User Info */}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <h4 className="font-semibold text-gray-800 truncate">
                                            {user.full_name}
                                          </h4>
                                          {user.is_super_admin && (
                                            <span title="Super Admin">
                                              <Shield className="w-4 h-4 text-yellow-600" />
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-sm text-gray-600 truncate mb-2">{user.email}</p>
                                        <div className="flex items-center gap-2">
                                          <span className={`px-2 py-1 rounded text-xs font-medium border ${getPermissionBadge(user.alert_level_permission)}`}>
                                            {user.alert_level_permission?.toUpperCase()}
                                          </span>
                                          <span className="text-xs text-gray-500">
                                            @{user.username}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {activeTab === 'alerts' && (
                          <div>
                            {org.alerts.length === 0 ? (
                              <div className="text-center py-8 text-gray-500">
                                <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>No alerts issued by this organization yet</p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {org.alerts.slice(0, 10).map((alert) => (
                                  <div
                                    key={alert.id}
                                    className={`border rounded-lg p-4 ${
                                      alert.is_active ? 'bg-white' : 'bg-gray-100 opacity-75'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${getSeverityBadge(alert.severity)}`}>
                                            {alert.severity}
                                          </span>
                                          {alert.is_active ? (
                                            <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                                              ACTIVE
                                            </span>
                                          ) : (
                                            <span className="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-600">
                                              ARCHIVED
                                            </span>
                                          )}
                                        </div>
                                        <h4 className="font-semibold text-gray-800 mb-1">
                                          {alert.title}
                                        </h4>
                                        <div className="flex items-center gap-4 text-sm text-gray-600">
                                          <div className="flex items-center gap-1">
                                            <Calendar className="w-4 h-4" />
                                            <span>{format(new Date(alert.created_at), 'PPp')}</span>
                                          </div>
                                          {alert.creator && (
                                            <div className="flex items-center gap-1">
                                              <UserCheck className="w-4 h-4" />
                                              <span>{alert.creator.full_name}</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                {org.alerts.length > 10 && (
                                  <p className="text-center text-sm text-gray-600 pt-2">
                                    Showing 10 of {org.alerts.length} alerts
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
      
      {/* Edit Organization Modal */}
      {showEditModal && editingOrg && (
        <EditOrgModal
          org={editingOrg}
          onChange={setEditingOrg}
          onSave={() => saveOrganization(editingOrg)}
          onClose={() => {
            setShowEditModal(false);
            setEditingOrg(null);
          }}
        />
      )}
    </div>
  );
}

// Edit Organization Modal Component
function EditOrgModal({ org, onChange, onSave, onClose }: any) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">{org.id ? 'Edit' : 'Create New'} Organization</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
              <option value="warning">Warning</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={org.description || ''}
              onChange={(e) => onChange({ ...org, description: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Contact Phone</label>
              <input
                type="tel"
                value={org.contact_phone || ''}
                onChange={(e) => onChange({ ...org, contact_phone: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contact Email</label>
              <input
                type="email"
                value={org.contact_email || ''}
                onChange={(e) => onChange({ ...org, contact_email: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={org.is_active}
              onChange={(e) => onChange({ ...org, is_active: e.target.checked })}
              className="w-5 h-5"
            />
            <label htmlFor="is_active" className="font-medium">Active</label>
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
