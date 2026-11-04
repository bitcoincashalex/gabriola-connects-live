// Path: components/EventFormModal.tsx
// Version: 3.1.0 - Events go on the calendar straight away for every member (no approval step).
//                  Editing keeps the original owner (the database enforces it too) and records who
//                  edited. Repeats: every week / every 2 weeks / monthly, up to 6 months, each date
//                  saved as its own event linked by series_id; edits can apply to one date or this
//                  and all later dates. Editing no longer moves the date back a day on phones and
//                  computers set behind UTC.
// Previous: 3.0.2 - Fixed timestamp fields (registration_deadline empty string → null)
// Date: 2026-11-03

'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/AuthProvider';
import { format } from 'date-fns';
import { X, Upload, AlertCircle } from 'lucide-react';
import { compressImage } from '@/lib/imageCompression';
import ImageUploadManager from './ImageUploadManager';
import FileUploader from './FileUploader';
import { REPEAT_OPTIONS, Repeat, seriesDates, repeatLabel, latestUntil, prettyDate, addDays, daysBetween } from '@/lib/eventSeries';

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
  
  // NEW - Multiple images and documents
  const [eventImages, setEventImages] = useState<Array<{id: string; url: string; file?: File}>>([]);
  const [eventFiles, setEventFiles] = useState<string[]>([]);

  // Repeating events
  const [repeat, setRepeat] = useState<Repeat>('none');
  const [repeatUntil, setRepeatUntil] = useState('');
  const [scope, setScope] = useState<'one' | 'later'>('one');
  const [saving, setSaving] = useState(false);

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
    setRepeat('none');
    setRepeatUntil('');
    setScope('one');
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
        // Dates are plain 'YYYY-MM-DD'. new Date() read them as UTC midnight, which is the day
        // before on Gabriola, so every edit used to move the event back a day.
        start_date: String(event.start_date).slice(0, 10),
        end_date: event.end_date ? String(event.end_date).slice(0, 10) : '',
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
      
      // Load gallery images if editing existing event
      if (event.gallery_images && Array.isArray(event.gallery_images)) {
        setEventImages(event.gallery_images.map((url: string, idx: number) => ({
          id: `existing-${idx}`,
          url: url
        })));
      } else {
        setEventImages([]);
      }
      
      // Load attachments if editing existing event
      if (event.attachments && Array.isArray(event.attachments)) {
        setEventFiles(event.attachments);
      } else {
        setEventFiles([]);
      }
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
    setEventImages([]);
    setEventFiles([]);
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

  const seriesId: string | null = event?.series_id || null;
  const plannedDates = !seriesId && repeat !== 'none' && repeatUntil
    ? seriesDates(form.start_date, repeat, repeatUntil)
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || saving) return;

    const makingSeries = !seriesId && repeat !== 'none';
    if (makingSeries) {
      if (!repeatUntil) {
        alert('Please choose the date it repeats until.');
        return;
      }
      if (repeatUntil < form.start_date) {
        alert('The "Until" date is before the start date.');
        return;
      }
    }

    setSaving(true);
    try {
      // Upload event images to Supabase Storage
      const uploadedImageUrls: string[] = [];
      for (const imageData of eventImages) {
        if (imageData.file) {
          const fileExt = imageData.file.name.split('.').pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const filePath = `event-images/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('events')
            .upload(filePath, imageData.file);

          if (!uploadError) {
            const { data } = supabase.storage
              .from('events')
              .getPublicUrl(filePath);
            uploadedImageUrls.push(data.publicUrl);
          }
        } else if (imageData.url) {
          // Existing image from editing
          uploadedImageUrls.push(imageData.url);
        }
      }

      // Build payload. No owner and no approval here: the database keeps the owner on edits,
      // and new events go straight on the calendar.
      const payload: any = {
        ...form,
        start_date: form.start_date,
        end_date: form.end_date || null,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        registration_deadline: form.registration_deadline || null,  // Fix: empty string → null
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        gallery_images: uploadedImageUrls.length > 0 ? uploadedImageUrls : null,
        attachments: eventFiles.length > 0 ? eventFiles : null,
      };

      // Convert number fields - empty strings become null, valid numbers get parsed
      payload.max_attendees = form.max_attendees ? parseInt(form.max_attendees) : null;
      payload.min_attendees = form.min_attendees ? parseInt(form.min_attendees) : null;

      // Multi-day events keep the same length on every date
      const span = form.end_date ? daysBetween(form.start_date, form.end_date) : null;
      const datesFor = (d: string) => ({ start_date: d, end_date: span === null ? null : addDays(d, span) });

      const dates = makingSeries ? seriesDates(form.start_date, repeat, repeatUntil) : [form.start_date];
      const pattern = makingSeries
        ? `${repeatLabel(form.start_date, repeat)} until ${prettyDate(dates[dates.length - 1])}`
        : null;

      if (event && seriesId && scope === 'later') {
        // This date and all later dates in the series. A changed date moves them all by the same
        // number of days (e.g. moving one Tuesday to Wednesday moves every later Tuesday too).
        const shift = daysBetween(String(event.start_date).slice(0, 10), form.start_date);
        const { data: rows, error } = await supabase
          .from('events')
          .select('id, start_date')
          .eq('series_id', seriesId)
          .gte('start_date', String(event.start_date).slice(0, 10));
        if (error) throw error;
        const { start_date: _s, end_date: _e, ...shared } = payload;
        const results = await Promise.all((rows || []).map((r: any) =>
          supabase.from('events')
            .update({ ...shared, ...datesFor(addDays(String(r.start_date).slice(0, 10), shift)) })
            .eq('id', r.id)
        ));
        const failed = results.find(r => r.error);
        if (failed?.error) throw failed.error;
      } else if (event && makingSeries) {
        // An existing one-off event becomes the first date of a new series
        const { error } = await supabase
          .from('events')
          .update({ ...payload, series_id: event.id, is_recurring: true, recurrence_pattern: pattern })
          .eq('id', event.id);
        if (error) throw error;
        if (dates.length > 1) {
          const { error: addError } = await supabase.from('events').insert(
            dates.slice(1).map(d => ({
              ...payload, ...datesFor(d), series_id: event.id, is_recurring: true,
              recurrence_pattern: pattern, created_by: event.created_by, is_approved: true,
            }))
          );
          if (addError) throw addError;
        }
      } else if (event) {
        // Update existing event (just this one)
        const { error } = await supabase
          .from('events')
          .update(payload)
          .eq('id', event.id);
        if (error) throw error;
      } else if (makingSeries) {
        // New repeating event: one event per date, all linked to the first
        const firstId = crypto.randomUUID();
        const { error } = await supabase.from('events').insert(
          dates.map((d, i) => ({
            ...payload, ...datesFor(d), id: i === 0 ? firstId : crypto.randomUUID(),
            series_id: firstId, is_recurring: true, recurrence_pattern: pattern,
            created_by: user.id, is_approved: true,
          }))
        );
        if (error) throw error;
      } else {
        // Create new event
        const { error } = await supabase
          .from('events')
          .insert([{ ...payload, created_by: user.id, is_approved: true }]);
        if (error) throw error;
      }

      onSave();
      onClose();
    } catch (error: any) {
      alert('Error saving event: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 rounded-t-2xl flex justify-between items-center">
          <h2 className="text-3xl font-bold text-gabriola-green">
            {event ? 'Edit Event' : 'Add New Event'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

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

              {/* Event Photos (Multiple) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Event Photos (Optional)</label>
                <ImageUploadManager
                  images={eventImages}
                  onImagesChange={setEventImages}
                  maxImages={10}
                  showCaptions={false}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Add photos of the event, venue, activities, etc. Max 10 images, 10MB each.
                </p>
              </div>

              {/* Event Documents (Schedules, Forms, etc.) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Event Documents (Optional)</label>
                <FileUploader onUpload={setEventFiles} />
                <p className="text-sm text-gray-500 mt-1">
                  Upload schedules, registration forms, maps, brochures (PDF, DOCX). Max 10MB per file.
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

              {/* Repeats */}
              <div className="border-t border-gray-200 pt-4">
                {seriesId ? (
                  <fieldset>
                    <legend className="block text-sm font-medium text-gray-700 mb-2">
                      This event repeats{event?.recurrence_pattern ? ` (${event.recurrence_pattern})` : ''}. Save my changes to:
                    </legend>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm text-gray-800">
                        <input type="radio" name="scope" value="one" checked={scope === 'one'}
                          onChange={() => setScope('one')} className="w-4 h-4 text-gabriola-green focus:ring-gabriola-green" />
                        Only this date
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-800">
                        <input type="radio" name="scope" value="later" checked={scope === 'later'}
                          onChange={() => setScope('later')} className="w-4 h-4 text-gabriola-green focus:ring-gabriola-green" />
                        This date and all later dates
                      </label>
                    </div>
                  </fieldset>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="repeat" className="block text-sm font-medium text-gray-700 mb-2">Repeats</label>
                        <select
                          id="repeat"
                          value={repeat}
                          onChange={e => setRepeat(e.target.value as Repeat)}
                          className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-gabriola-green bg-white"
                        >
                          {REPEAT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      {repeat !== 'none' && (
                        <div>
                          <label htmlFor="repeat_until" className="block text-sm font-medium text-gray-700 mb-2">Until *</label>
                          <input
                            id="repeat_until"
                            type="date"
                            value={repeatUntil}
                            min={form.start_date || undefined}
                            max={form.start_date ? latestUntil(form.start_date) : undefined}
                            onChange={e => setRepeatUntil(e.target.value)}
                            required
                            className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-gabriola-green"
                          />
                        </div>
                      )}
                    </div>
                    {repeat !== 'none' && (
                      <p className="text-sm text-gray-600 mt-2">
                        {!form.start_date
                          ? 'Choose the start date first.'
                          : plannedDates.length > 0
                            ? `${repeatLabel(form.start_date, repeat)}: ${plannedDates.length} date${plannedDates.length === 1 ? '' : 's'}, ${prettyDate(plannedDates[0])} to ${prettyDate(plannedDates[plannedDates.length - 1])}.`
                            : `${repeatLabel(form.start_date, repeat)}. Up to 6 months at a time; you can add more later.`}
                      </p>
                    )}
                  </>
                )}
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
              disabled={saving}
              className="flex-1 px-6 py-3 bg-gabriola-green text-white rounded-lg font-medium hover:bg-gabriola-green-dark transition disabled:opacity-60"
            >
              {saving ? 'Saving...' : event ? 'Update Event' : 'Publish Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
