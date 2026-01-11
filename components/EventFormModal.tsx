// Path: components/EventFormModal.tsx
// Version: 2.0.0 - Added accessibility checkboxes, image compression, demo message
// Date: 2024-12-24

'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { format } from 'date-fns';
import { X, Upload, AlertCircle } from 'lucide-react';
import { compressImage } from '@/lib/imageCompression';

interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  event?: any | null;
  venues?: any[];
  categories?: any[];
  canPublishInstantly?: boolean;
}

export default function EventFormModal({
  isOpen,
  onClose,
  onSave,
  event = null,
  venues = [],
  categories = [],
  canPublishInstantly = false
}: EventFormModalProps) {
  const { user } = useUser();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedVenueId, setSelectedVenueId] = useState<string>('');
  const [customLocation, setCustomLocation] = useState('');

  const [form, setForm] = useState({
    // Basic Info
    title: '',
    description: '',
    category: '',
    image_url: '',
    
    // Date & Time
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    is_all_day: false,
    is_recurring: false,
    recurrence_pattern: '',
    
    // Location
    location: '',
    venue_name: '',
    venue_address: '',
    venue_city: 'Gabriola Island',
    venue_postal_code: '',
    venue_map_url: '',
    parking_info: '',
    
    // Contact & Organizer
    contact_email: '',
    contact_phone: '',
    organizer_name: '',
    organizer_organization: '',
    organizer_website: '',
    
    // Registration & Fees
    fees: '',
    registration_required: false,
    registration_url: '',
    registration_deadline: '',
    max_attendees: '',
    min_attendees: '',
    waitlist_enabled: false,
    
    // Event Details
    age_restrictions: '',
    accessibility_info: '',
    parking_info: '',
    what_to_bring: '',
    dress_code: '',
    additional_info: '',
    weather_dependent: false,
    
    // Accessibility & Amenities (NEW - checkboxes)
    wheelchair_accessible: false,
    parking_available: false,
    pet_friendly: false,
    family_friendly: true,
    
    // Tags (will be comma-separated string, converted to array on save)
    tags: '',
    keywords: '',
  });

  // Load event data when editing
  useEffect(() => {
    if (event) {
      // Editing mode
      const eventVenueName = event.venue_name || '';
      const matchingVenue = venues.find(v => v.name === eventVenueName);
      
      setForm({
        // Basic Info
        title: event.title,
        description: event.description,
        category: event.category || '',
        image_url: event.image_url || '',
        
        // Date & Time
        start_date: format(new Date(event.start_date), 'yyyy-MM-dd'),
        end_date: event.end_date ? format(new Date(event.end_date), 'yyyy-MM-dd') : '',
        start_time: event.start_time || '',
        end_time: event.end_time || '',
        is_all_day: event.is_all_day || false,
        is_recurring: event.is_recurring || false,
        recurrence_pattern: event.recurrence_pattern || '',
        
        // Location
        location: event.location || '',
        venue_name: event.venue_name || '',
        venue_address: event.venue_address || '',
        venue_city: event.venue_city || 'Gabriola Island',
        venue_postal_code: event.venue_postal_code || '',
        venue_map_url: event.venue_map_url || '',
        parking_info: event.parking_info || '',
        
        // Contact & Organizer
        contact_email: event.contact_email || '',
        contact_phone: event.contact_phone || '',
        organizer_name: event.organizer_name || '',
        organizer_organization: event.organizer_organization || '',
        organizer_website: event.organizer_website || '',
        
        // Registration & Fees
        fees: event.fees || '',
        registration_required: event.registration_required || false,
        registration_url: event.registration_url || '',
        registration_deadline: event.registration_deadline || '',
        max_attendees: event.max_attendees ? String(event.max_attendees) : '',
        min_attendees: event.min_attendees ? String(event.min_attendees) : '',
        waitlist_enabled: event.waitlist_enabled || false,
        
        // Event Details
        age_restrictions: event.age_restrictions || '',
        accessibility_info: event.accessibility_info || '',
        what_to_bring: event.what_to_bring || '',
        dress_code: event.dress_code || '',
        additional_info: event.additional_info || '',
        weather_dependent: event.weather_dependent || false,
        parking_info: event.parking_info || '',
        
        // Accessibility & Amenities (NEW - load from database)
        wheelchair_accessible: event.wheelchair_accessible || false,
        parking_available: event.parking_available || false,
        pet_friendly: event.pet_friendly || false,
        family_friendly: event.family_friendly ?? true,
        
        // Tags & Keywords
        tags: event.tags ? event.tags.join(', ') : '',
        keywords: event.keywords || '',
      });
      
      // Set venue dropdown state
      if (matchingVenue) {
        setSelectedVenueId(matchingVenue.id);
        setCustomLocation('');
      } else if (event.location) {
        setSelectedVenueId('other');
        setCustomLocation(event.location);
      } else {
        setSelectedVenueId('');
        setCustomLocation('');
      }
      
      setImagePreview(event.image_url || null);
    } else {
      // Creating mode - reset form
      resetForm();
    }
  }, [event, venues]);

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      category: '',
      image_url: '',
      start_date: '',
      end_date: '',
      start_time: '',
      end_time: '',
      is_all_day: false,
      is_recurring: false,
      recurrence_pattern: '',
      location: '',
      venue_name: '',
      venue_address: '',
      venue_city: 'Gabriola Island',
      venue_postal_code: '',
      venue_map_url: '',
      parking_info: '',
      contact_email: '',
      contact_phone: '',
      organizer_name: '',
      organizer_organization: '',
      organizer_website: '',
      fees: '',
      registration_required: false,
      registration_url: '',
      registration_deadline: '',
      max_attendees: '',
      min_attendees: '',
      waitlist_enabled: false,
      age_restrictions: '',
      accessibility_info: '',
      what_to_bring: '',
      dress_code: '',
      additional_info: '',
      weather_dependent: false,
      
      // Accessibility & Amenities (NEW - reset to defaults)
      wheelchair_accessible: false,
      parking_available: false,
      pet_friendly: false,
      family_friendly: true,
      
      tags: '',
      keywords: '',
    });
    setImagePreview(null);
    setSelectedVenueId('');
    setCustomLocation('');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Compress image before upload
    const compressionResult = await compressImage(file, {
      maxWidth: 1920,
      maxHeight: 1920,
      quality: 0.85,
      maxSizeMB: 10,
    });

    if (!compressionResult.success) {
      alert(compressionResult.error);
      return;
    }

    const compressedFile = compressionResult.file;
    const fileExt = compressedFile.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `event-images/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('events')
      .upload(filePath, compressedFile);

    if (uploadError) {
      alert('Error uploading image');
      return;
    }

    const { data } = supabase.storage
      .from('events')
      .getPublicUrl(filePath);

    setForm({ ...form, image_url: data.publicUrl });
    setImagePreview(data.publicUrl);
  };

  const handleVenueChange = (venueId: string) => {
    setSelectedVenueId(venueId);
    
    if (venueId === 'other') {
      setForm({
        ...form,
        location: customLocation,
        venue_name: '',
        venue_address: '',
        venue_city: 'Gabriola Island',
        venue_postal_code: '',
        venue_map_url: '',
      });
    } else if (venueId) {
      const venue = venues.find(v => v.id === venueId);
      if (venue) {
        setForm({
          ...form,
          location: venue.name,
          venue_name: venue.name,
          venue_address: venue.address,
          venue_city: venue.city,
          venue_postal_code: venue.postal_code || '',
          venue_map_url: venue.map_url || '',
        });
        setCustomLocation('');
      }
    } else {
      setForm({
        ...form,
        location: '',
        venue_name: '',
        venue_address: '',
        venue_city: 'Gabriola Island',
        venue_postal_code: '',
        venue_map_url: '',
      });
      setCustomLocation('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Build payload
    const payload: any = {
      ...form,
      created_by: user.id,
      start_date: form.start_date,
      end_date: form.end_date || null,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      is_approved: canPublishInstantly,
    };

    // Convert number fields
    if (form.max_attendees) payload.max_attendees = parseInt(form.max_attendees);
    if (form.min_attendees) payload.min_attendees = parseInt(form.min_attendees);

    try {
      if (event) {
        // Update existing event
        const { error } = await supabase
          .from('events')
          .update(payload)
          .eq('id', event.id);

        if (error) throw error;
      } else {
        // Create new event
        const { error } = await supabase
          .from('events')
          .insert([payload]);

        if (error) throw error;
      }

      onSave();
      onClose();
    } catch (error: any) {
      alert('Error saving event: ' + error.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 rounded-t-2xl flex justify-between items-center">
          <h2 className="text-3xl font-bold text-gabriola-green">
            {event ? 'Edit Event' : canPublishInstantly ? 'Add New Event' : 'Submit Event for Approval'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        {!canPublishInstantly && !event && (
          <div className="mx-8 mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800">
              For demo purposes, your event will appear immediately on the calendar!
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          
          {/* SECTION 1: Basic Information */}
          <div className="bg-white border-2 border-gabriola-green/20 rounded-xl p-6">
            <h4 className="text-xl font-bold text-gabriola-green-dark mb-4">📝 Basic Information</h4>
            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Event Title *</label>
                <input 
                  type="text" 
                  value={form.title} 
                  onChange={e => setForm({ ...form, title: e.target.value })} 
                  required 
                  className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-gabriola-green" 
                  placeholder="Annual Salmon BBQ"
                />
              </div>

              {/* Category */}
              {categories.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select 
                    value={form.category} 
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
                  >
                    <option value="">Select a category...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                <textarea 
                  value={form.description} 
                  onChange={e => setForm({ ...form, description: e.target.value })} 
                  required 
                  rows={5}
                  className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
                  placeholder="Describe your event..."
                />
              </div>

              {/* Event Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Event Image</label>
                {imagePreview && (
                  <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded-lg mb-2" />
                )}
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full p-3 border rounded-lg"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Maximum file size: 10 MB per image
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 2: Date & Time */}
          <div className="bg-white border-2 border-gabriola-green/20 rounded-xl p-6">
            <h4 className="text-xl font-bold text-gabriola-green-dark mb-4">📅 Date & Time</h4>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                  <input 
                    type="date" 
                    value={form.start_date} 
                    onChange={e => setForm({ ...form, start_date: e.target.value })} 
                    required 
                    className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                  <input 
                    type="time" 
                    value={form.start_time} 
                    onChange={e => setForm({ ...form, start_time: e.target.value })} 
                    className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input 
                    type="date" 
                    value={form.end_date} 
                    onChange={e => setForm({ ...form, end_date: e.target.value })} 
                    className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                  <input 
                    type="time" 
                    value={form.end_time} 
                    onChange={e => setForm({ ...form, end_time: e.target.value })} 
                    className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  id="is_all_day"
                  checked={form.is_all_day}
                  onChange={e => setForm({ ...form, is_all_day: e.target.checked })}
                  className="w-4 h-4 text-gabriola-green focus:ring-gabriola-green"
                />
                <label htmlFor="is_all_day" className="text-sm font-medium text-gray-700">
                  All-day event
                </label>
              </div>
            </div>
          </div>

          {/* SECTION 3: Location */}
          <div className="bg-white border-2 border-gabriola-green/20 rounded-xl p-6">
            <h4 className="text-xl font-bold text-gabriola-green-dark mb-4">📍 Location</h4>
            <div className="space-y-4">
              {venues.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Venue</label>
                  <select
                    value={selectedVenueId}
                    onChange={e => handleVenueChange(e.target.value)}
                    className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
                  >
                    <option value="">Choose a venue...</option>
                    {venues.map(venue => (
                      <option key={venue.id} value={venue.id}>
                        {venue.name}
                      </option>
                    ))}
                    <option value="other">Other (specify below)</option>
                  </select>
                </div>
              )}

              {(selectedVenueId === 'other' || selectedVenueId === '') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location *</label>
                  <input
                    type="text"
                    value={customLocation || form.location}
                    onChange={e => {
                      setCustomLocation(e.target.value);
                      setForm({ ...form, location: e.target.value });
                    }}
                    required
                    className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
                    placeholder="Enter location..."
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Additional Parking Notes (Optional)</label>
                <textarea
                  value={form.parking_info}
                  onChange={e => setForm({ ...form, parking_info: e.target.value })}
                  rows={2}
                  className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
                  placeholder="E.g., Limited street parking, use municipal lot across street"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: Contact & Organizer */}
          <div className="bg-white border-2 border-gabriola-green/20 rounded-xl p-6">
            <h4 className="text-xl font-bold text-gabriola-green-dark mb-4">👤 Contact & Organizer</h4>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
                  <input
                    type="email"
                    value={form.contact_email}
                    onChange={e => setForm({ ...form, contact_email: e.target.value })}
                    className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone</label>
                  <input
                    type="tel"
                    value={form.contact_phone}
                    onChange={e => setForm({ ...form, contact_phone: e.target.value })}
                    className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Organizer Name</label>
                  <input
                    type="text"
                    value={form.organizer_name}
                    onChange={e => setForm({ ...form, organizer_name: e.target.value })}
                    className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Organization</label>
                  <input
                    type="text"
                    value={form.organizer_organization}
                    onChange={e => setForm({ ...form, organizer_organization: e.target.value })}
                    className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                <input
                  type="url"
                  value={form.organizer_website}
                  onChange={e => setForm({ ...form, organizer_website: e.target.value })}
                  className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          {/* SECTION 5: Registration & Fees */}
          <div className="bg-white border-2 border-gabriola-green/20 rounded-xl p-6">
            <h4 className="text-xl font-bold text-gabriola-green-dark mb-4">💳 Registration & Fees</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fees</label>
                <input
                  type="text"
                  value={form.fees}
                  onChange={e => setForm({ ...form, fees: e.target.value })}
                  className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
                  placeholder="Free, $10, By donation, etc."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="registration_required"
                  checked={form.registration_required}
                  onChange={e => setForm({ ...form, registration_required: e.target.checked })}
                  className="w-4 h-4 text-gabriola-green focus:ring-gabriola-green"
                />
                <label htmlFor="registration_required" className="text-sm font-medium text-gray-700">
                  Registration required
                </label>
              </div>

              {form.registration_required && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Registration URL</label>
                    <input
                      type="url"
                      value={form.registration_url}
                      onChange={e => setForm({ ...form, registration_url: e.target.value })}
                      className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
                      placeholder="https://..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Max Attendees</label>
                      <input
                        type="number"
                        value={form.max_attendees}
                        onChange={e => setForm({ ...form, max_attendees: e.target.value })}
                        className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Min Attendees</label>
                      <input
                        type="number"
                        value={form.min_attendees}
                        onChange={e => setForm({ ...form, min_attendees: e.target.value })}
                        className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* SECTION 6: Additional Details */}
          <div className="bg-white border-2 border-gabriola-green/20 rounded-xl p-6">
            <h4 className="text-xl font-bold text-gabriola-green-dark mb-4">ℹ️ Additional Details</h4>
            <div className="space-y-4">
              
              {/* NEW - Accessibility & Amenities Checkboxes */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Accessibility & Amenities
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.wheelchair_accessible}
                      onChange={(e) => setForm({ ...form, wheelchair_accessible: e.target.checked })}
                      className="w-4 h-4 text-gabriola-green border-gray-300 rounded focus:ring-gabriola-green"
                    />
                    <span className="text-sm text-gray-700">♿ Wheelchair accessible</span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.parking_available}
                      onChange={(e) => setForm({ ...form, parking_available: e.target.checked })}
                      className="w-4 h-4 text-gabriola-green border-gray-300 rounded focus:ring-gabriola-green"
                    />
                    <span className="text-sm text-gray-700">🅿️ Parking available</span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.pet_friendly}
                      onChange={(e) => setForm({ ...form, pet_friendly: e.target.checked })}
                      className="w-4 h-4 text-gabriola-green border-gray-300 rounded focus:ring-gabriola-green"
                    />
                    <span className="text-sm text-gray-700">🐕 Pet friendly</span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.family_friendly}
                      onChange={(e) => setForm({ ...form, family_friendly: e.target.checked })}
                      className="w-4 h-4 text-gabriola-green border-gray-300 rounded focus:ring-gabriola-green"
                    />
                    <span className="text-sm text-gray-700">👨‍👩‍👧‍👦 Family friendly</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Additional Accessibility Notes (Optional)</label>
                <textarea
                  value={form.accessibility_info}
                  onChange={e => setForm({ ...form, accessibility_info: e.target.value })}
                  rows={2}
                  className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
                  placeholder="E.g., Ramp at side entrance, accessible washrooms on main floor"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Age Restrictions</label>
                <input
                  type="text"
                  value={form.age_restrictions}
                  onChange={e => setForm({ ...form, age_restrictions: e.target.value })}
                  className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
                  placeholder="All ages, 19+, Family friendly, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">What to Bring</label>
                <textarea
                  value={form.what_to_bring}
                  onChange={e => setForm({ ...form, what_to_bring: e.target.value })}
                  rows={2}
                  className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
                  placeholder="What participants should bring..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Additional Information</label>
                <textarea
                  value={form.additional_info}
                  onChange={e => setForm({ ...form, additional_info: e.target.value })}
                  rows={3}
                  className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
                  placeholder="Any other relevant information..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={e => setForm({ ...form, tags: e.target.value })}
                  className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
                  placeholder="music, outdoor, family, workshop"
                />
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gabriola-green text-white rounded-lg font-medium hover:bg-gabriola-green-dark transition"
            >
              {event ? 'Update Event' : canPublishInstantly ? 'Publish Event' : 'Submit for Approval'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
