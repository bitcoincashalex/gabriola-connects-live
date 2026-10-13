// components/VolunteerForm.tsx
// The form for posting or editing a volunteer opportunity
// Version: 1.0.0
// Date: 2026-10-13
'use client';

import { useState } from 'react';
import { VOLUNTEER_CATEGORIES, categoryId, dateOnly, pacificToday } from '@/lib/volunteer';

export interface VolunteerFormValues {
  title: string;
  organization_name: string;
  category: string;
  description: string;
  location: string;
  start_date: string;          // YYYY-MM-DD, or '' for ongoing
  time_commitment: string;
  volunteers_needed: string;   // kept as text while typing
  coordinator_email: string;
  coordinator_phone: string;
}

export function emptyVolunteerForm(): VolunteerFormValues {
  return {
    title: '', organization_name: '', category: 'community', description: '', location: '',
    start_date: '', time_commitment: '', volunteers_needed: '', coordinator_email: '', coordinator_phone: '',
  };
}

export function volunteerFormFromListing(l: any): VolunteerFormValues {
  return {
    title: l.title || '',
    organization_name: l.organization_name || '',
    category: categoryId(l.category),
    description: l.description || '',
    location: l.location || '',
    start_date: dateOnly(l.start_date) || '',
    time_commitment: l.time_commitment || '',
    volunteers_needed: l.volunteers_needed ? String(l.volunteers_needed) : '',
    coordinator_email: l.coordinator_email || '',
    coordinator_phone: l.coordinator_phone || '',
  };
}

// What gets saved to the database
export function volunteerFormToRow(v: VolunteerFormValues) {
  const needed = parseInt(v.volunteers_needed, 10);
  return {
    title: v.title.trim(),
    organization_name: v.organization_name.trim() || null,
    category: v.category,
    description: v.description.trim(),
    location: v.location.trim() || null,
    start_date: v.start_date || null,
    time_commitment: v.time_commitment.trim() || null,
    volunteers_needed: Number.isFinite(needed) && needed > 0 ? needed : null,
    coordinator_email: v.coordinator_email.trim() || null,
    coordinator_phone: v.coordinator_phone.trim() || null,
  };
}

interface Props {
  initial: VolunteerFormValues;
  submitLabel: string;
  saving: boolean;
  onSubmit: (values: VolunteerFormValues) => void;
  onCancel: () => void;
}

const input = 'w-full min-h-[44px] px-3 py-2 rounded-lg border border-[#CFC6B4] bg-white text-base focus:outline-none focus:ring-2 focus:ring-gabriola-green focus:border-transparent';
const label = 'block text-sm font-semibold text-[#1F2A24] mb-1';
const hint = 'text-xs text-[#5B6660] mt-1';

export default function VolunteerForm({ initial, submitLabel, saving, onSubmit, onCancel }: Props) {
  const [v, setV] = useState<VolunteerFormValues>(initial);
  const [error, setError] = useState('');
  const set = (field: keyof VolunteerFormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setV(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.title.trim()) return setError('Please give it a title.');
    if (!v.description.trim()) return setError('Please describe what volunteers would do.');
    if (v.coordinator_email.trim() && !/^\S+@\S+\.\S+$/.test(v.coordinator_email.trim())) {
      return setError('That contact email doesn\'t look right.');
    }
    setError('');
    onSubmit(v);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="vf-title" className={label}>What do you need help with? *</label>
        <input id="vf-title" className={input} value={v.title} onChange={set('title')} maxLength={120}
          placeholder="e.g. Help set up chairs for the Fall Fair" />
      </div>

      <div>
        <label htmlFor="vf-org" className={label}>Group or organization</label>
        <input id="vf-org" className={input} value={v.organization_name} onChange={set('organization_name')} maxLength={120}
          placeholder="Leave empty if it's just you" />
      </div>

      <div>
        <label htmlFor="vf-cat" className={label}>Category</label>
        <select id="vf-cat" className={input} value={v.category} onChange={set('category')}>
          {VOLUNTEER_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="vf-desc" className={label}>What would volunteers do? *</label>
        <textarea id="vf-desc" className={`${input} min-h-[140px]`} value={v.description} onChange={set('description')}
          placeholder="What the job is, who it's good for, anything people should bring or know." />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="vf-date" className={label}>Date</label>
          <input id="vf-date" type="date" className={input} value={v.start_date} onChange={set('start_date')}
            min={initial.start_date && initial.start_date < pacificToday() ? undefined : pacificToday()} />
          <p className={hint}>Leave empty if it's ongoing. A dated listing comes down by itself after that day.</p>
        </div>
        <div>
          <label htmlFor="vf-time" className={label}>When and how long</label>
          <input id="vf-time" className={input} value={v.time_commitment} onChange={set('time_commitment')} maxLength={80}
            placeholder="e.g. 10am to noon, or 2 hours a week" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="vf-where" className={label}>Where</label>
          <input id="vf-where" className={input} value={v.location} onChange={set('location')} maxLength={120}
            placeholder="e.g. Agi Hall" />
        </div>
        <div>
          <label htmlFor="vf-needed" className={label}>How many volunteers?</label>
          <input id="vf-needed" type="number" min={1} max={999} inputMode="numeric" className={input}
            value={v.volunteers_needed} onChange={set('volunteers_needed')} />
        </div>
      </div>

      <div className="bg-[#F6F2EA] rounded-xl p-3 space-y-3">
        <p className="text-sm text-[#5B6660]">
          People who are interested can always reach you through Gabriola Connects. Add a public email or phone
          only if you want it shown on the listing.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="vf-email" className={label}>Public contact email</label>
            <input id="vf-email" type="email" className={input} value={v.coordinator_email} onChange={set('coordinator_email')} />
          </div>
          <div>
            <label htmlFor="vf-phone" className={label}>Public contact phone</label>
            <input id="vf-phone" type="tel" className={input} value={v.coordinator_phone} onChange={set('coordinator_phone')} />
          </div>
        </div>
      </div>

      {error && <p className="text-sm font-semibold text-[#B42318]" role="alert">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={saving}
          className="min-h-[44px] px-5 rounded-lg bg-gabriola-green text-white font-semibold hover:bg-gabriola-green-dark disabled:opacity-60">
          {saving ? 'Saving...' : submitLabel}
        </button>
        <button type="button" onClick={onCancel}
          className="min-h-[44px] px-5 rounded-lg border border-[#CFC6B4] bg-white font-semibold">
          Cancel
        </button>
      </div>
    </form>
  );
}
