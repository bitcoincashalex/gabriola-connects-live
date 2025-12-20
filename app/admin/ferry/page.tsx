// app/admin/ferry/page.tsx
// Ferry Schedule Admin - Manage ferry schedules with day-of-week, seasonal, and route controls
// Version: 1.0.0
// Date: 2025-12-20

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { 
  Ship, Plus, Edit, Trash2, Save, X, Clock, Calendar,
  ArrowRight, AlertCircle, CheckCircle, RefreshCw
} from 'lucide-react';

interface FerrySchedule {
  id: string;
  departure_terminal: string;
  arrival_terminal: string;
  departure_time: string;
  arrival_time: string;
  schedule_name: string | null;
  valid_from: string | null;
  valid_until: string | null;
  operates_monday: boolean;
  operates_tuesday: boolean;
  operates_wednesday: boolean;
  operates_thursday: boolean;
  operates_friday: boolean;
  operates_saturday: boolean;
  operates_sunday: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ScheduleFormData {
  departure_terminal: string;
  arrival_terminal: string;
  departure_time: string;
  arrival_time: string;
  schedule_name: string;
  valid_from: string;
  valid_until: string;
  operates_monday: boolean;
  operates_tuesday: boolean;
  operates_wednesday: boolean;
  operates_thursday: boolean;
  operates_friday: boolean;
  operates_saturday: boolean;
  operates_sunday: boolean;
  sort_order: number;
  is_active: boolean;
}

const TERMINALS = ['Gabriola', 'Nanaimo'];

const DAYS_OF_WEEK = [
  { key: 'operates_monday', label: 'Mon' },
  { key: 'operates_tuesday', label: 'Tue' },
  { key: 'operates_wednesday', label: 'Wed' },
  { key: 'operates_thursday', label: 'Thu' },
  { key: 'operates_friday', label: 'Fri' },
  { key: 'operates_saturday', label: 'Sat' },
  { key: 'operates_sunday', label: 'Sun' },
];

export default function FerryAdminPage() {
  const router = useRouter();
  const { user } = useUser();
  
  const [schedules, setSchedules] = useState<FerrySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<FerrySchedule | null>(null);
  
  const [formData, setFormData] = useState<ScheduleFormData>({
    departure_terminal: 'Gabriola',
    arrival_terminal: 'Nanaimo',
    departure_time: '08:00',
    arrival_time: '08:20',
    schedule_name: '',
    valid_from: '',
    valid_until: '',
    operates_monday: true,
    operates_tuesday: true,
    operates_wednesday: true,
    operates_thursday: true,
    operates_friday: true,
    operates_saturday: true,
    operates_sunday: true,
    sort_order: 0,
    is_active: true,
  });

  // Check permissions
  useEffect(() => {
    if (!user) return;
    
    const hasAccess = user.is_super_admin || (user as any).admin_ferry;
    
    if (!hasAccess) {
      router.push('/');
    }
  }, [user, router]);

  // Fetch schedules
  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('ferry_schedule')
        .select('*')
        .order('departure_terminal', { ascending: true })
        .order('sort_order', { ascending: true })
        .order('departure_time', { ascending: true });

      if (fetchError) throw fetchError;

      setSchedules(data || []);
    } catch (err) {
      console.error('Error fetching schedules:', err);
      setError(err instanceof Error ? err.message : 'Failed to load schedules');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setFormData({
      departure_terminal: 'Gabriola',
      arrival_terminal: 'Nanaimo',
      departure_time: '08:00',
      arrival_time: '08:20',
      schedule_name: '',
      valid_from: '',
      valid_until: '',
      operates_monday: true,
      operates_tuesday: true,
      operates_wednesday: true,
      operates_thursday: true,
      operates_friday: true,
      operates_saturday: true,
      operates_sunday: true,
      sort_order: schedules.length,
      is_active: true,
    });
    setEditingSchedule(null);
    setShowAddModal(true);
  };

  const handleEdit = (schedule: FerrySchedule) => {
    setFormData({
      departure_terminal: schedule.departure_terminal,
      arrival_terminal: schedule.arrival_terminal,
      departure_time: schedule.departure_time,
      arrival_time: schedule.arrival_time,
      schedule_name: schedule.schedule_name || '',
      valid_from: schedule.valid_from || '',
      valid_until: schedule.valid_until || '',
      operates_monday: schedule.operates_monday,
      operates_tuesday: schedule.operates_tuesday,
      operates_wednesday: schedule.operates_wednesday,
      operates_thursday: schedule.operates_thursday,
      operates_friday: schedule.operates_friday,
      operates_saturday: schedule.operates_saturday,
      operates_sunday: schedule.operates_sunday,
      sort_order: schedule.sort_order,
      is_active: schedule.is_active,
    });
    setEditingSchedule(schedule);
    setShowAddModal(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const saveData = {
        ...formData,
        valid_from: formData.valid_from || null,
        valid_until: formData.valid_until || null,
        schedule_name: formData.schedule_name || null,
        updated_at: new Date().toISOString(),
      };

      if (editingSchedule) {
        // Update existing
        const { error: updateError } = await supabase
          .from('ferry_schedule')
          .update(saveData)
          .eq('id', editingSchedule.id);

        if (updateError) throw updateError;
        setSuccess('Schedule updated successfully!');
      } else {
        // Create new
        const { error: insertError } = await supabase
          .from('ferry_schedule')
          .insert([{
            ...saveData,
            created_by: user?.id,
          }]);

        if (insertError) throw insertError;
        setSuccess('Schedule added successfully!');
      }

      setShowAddModal(false);
      fetchSchedules();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving schedule:', err);
      setError(err instanceof Error ? err.message : 'Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (schedule: FerrySchedule) => {
    if (!confirm(`Delete ${schedule.departure_time} ${schedule.departure_terminal} → ${schedule.arrival_terminal}?`)) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('ferry_schedule')
        .delete()
        .eq('id', schedule.id);

      if (deleteError) throw deleteError;

      setSuccess('Schedule deleted successfully!');
      fetchSchedules();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error deleting schedule:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete schedule');
    }
  };

  const getDaysDisplay = (schedule: FerrySchedule) => {
    const days = [];
    if (schedule.operates_monday) days.push('M');
    if (schedule.operates_tuesday) days.push('T');
    if (schedule.operates_wednesday) days.push('W');
    if (schedule.operates_thursday) days.push('Th');
    if (schedule.operates_friday) days.push('F');
    if (schedule.operates_saturday) days.push('Sa');
    if (schedule.operates_sunday) days.push('Su');
    
    if (days.length === 7) return 'Daily';
    if (days.length === 5 && !schedule.operates_saturday && !schedule.operates_sunday) return 'Weekdays';
    if (days.length === 2 && schedule.operates_saturday && schedule.operates_sunday) return 'Weekends';
    
    return days.join(', ');
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gabriola-green"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Ship className="w-8 h-8 text-gabriola-green" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Ferry Schedule Admin</h1>
                <p className="text-gray-600">Manage ferry schedules and seasonal changes</p>
              </div>
            </div>
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 bg-gabriola-green text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
            >
              <Plus className="w-5 h-5" />
              Add Schedule
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-green-700">{success}</span>
          </div>
        )}

        {/* Schedules Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <RefreshCw className="w-8 h-8 text-gabriola-green animate-spin" />
            </div>
          ) : schedules.length === 0 ? (
            <div className="text-center p-12">
              <Ship className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Schedules Yet</h3>
              <p className="text-gray-600 mb-4">Get started by adding your first ferry schedule</p>
              <button
                onClick={handleAdd}
                className="bg-gabriola-green text-white px-6 py-2 rounded-lg hover:bg-green-700"
              >
                Add First Schedule
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Route</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Departure</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Arrival</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Days</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Valid Period</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {schedules.map((schedule) => (
                    <tr key={schedule.id} className={!schedule.is_active ? 'bg-gray-50 opacity-60' : ''}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <span>{schedule.departure_terminal}</span>
                          <ArrowRight className="w-4 h-4 text-gray-400" />
                          <span>{schedule.arrival_terminal}</span>
                        </div>
                        {schedule.schedule_name && (
                          <div className="text-xs text-gray-500 mt-1">{schedule.schedule_name}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-gray-400" />
                          {schedule.departure_time}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-gray-400" />
                          {schedule.arrival_time}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700">{getDaysDisplay(schedule)}</span>
                      </td>
                      <td className="px-4 py-3">
                        {schedule.valid_from || schedule.valid_until ? (
                          <div className="text-xs text-gray-600">
                            {schedule.valid_from && <div>From: {schedule.valid_from}</div>}
                            {schedule.valid_until && <div>Until: {schedule.valid_until}</div>}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Year-round</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          schedule.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {schedule.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(schedule)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(schedule)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add/Edit Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingSchedule ? 'Edit Schedule' : 'Add New Schedule'}
                  </h2>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Route */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Departure Terminal
                      </label>
                      <select
                        value={formData.departure_terminal}
                        onChange={(e) => updateField('departure_terminal', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
                      >
                        {TERMINALS.map(terminal => (
                          <option key={terminal} value={terminal}>{terminal}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Arrival Terminal
                      </label>
                      <select
                        value={formData.arrival_terminal}
                        onChange={(e) => updateField('arrival_terminal', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
                      >
                        {TERMINALS.map(terminal => (
                          <option key={terminal} value={terminal}>{terminal}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Times */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Departure Time
                      </label>
                      <input
                        type="time"
                        value={formData.departure_time}
                        onChange={(e) => updateField('departure_time', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Arrival Time
                      </label>
                      <input
                        type="time"
                        value={formData.arrival_time}
                        onChange={(e) => updateField('arrival_time', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Days of Week */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Operating Days
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map(day => (
                        <label key={day.key} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData[day.key as keyof ScheduleFormData] as boolean}
                            onChange={(e) => updateField(day.key, e.target.checked)}
                            className="mr-2 w-4 h-4 text-gabriola-green border-gray-300 rounded focus:ring-gabriola-green"
                          />
                          <span className="text-sm">{day.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Seasonal Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Valid From (Optional)
                      </label>
                      <input
                        type="date"
                        value={formData.valid_from}
                        onChange={(e) => updateField('valid_from', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Valid Until (Optional)
                      </label>
                      <input
                        type="date"
                        value={formData.valid_until}
                        onChange={(e) => updateField('valid_until', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Schedule Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Schedule Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.schedule_name}
                      onChange={(e) => updateField('schedule_name', e.target.value)}
                      placeholder="e.g., Winter Schedule, Holiday Service"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
                    />
                  </div>

                  {/* Sort Order & Active */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sort Order
                      </label>
                      <input
                        type="number"
                        value={formData.sort_order}
                        onChange={(e) => updateField('sort_order', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent"
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.is_active}
                          onChange={(e) => updateField('is_active', e.target.checked)}
                          className="mr-2 w-4 h-4 text-gabriola-green border-gray-300 rounded focus:ring-gabriola-green"
                        />
                        <span className="text-sm font-medium">Active</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-gabriola-green text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Schedule
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
