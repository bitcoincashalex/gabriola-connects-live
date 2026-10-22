// components/MarketplaceForm.tsx
// The form for posting or editing a Buy, Sell & Free listing
// Version: 1.3.0 - "Post without my name" tick box
// Previous: 1.2.0 - "Allow public questions & comments" tick box (on by default)
// Earlier: 1.1.0 - Rentals: "For rent" (type, rent per month, available from, furnished / pets /
//                  utilities) and "Looking for a rental" under Wanted (Housing & rentals)
// Previous: 1.0.0 (2026-10-20)
// Date: 2026-10-22
'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import {
  LISTING_CATEGORIES, LISTING_KINDS, ListingKind, MAX_PHOTOS, uploadListingPhoto,
  HOUSING_CATEGORY, RENTAL_TYPES, isRental,
} from '@/lib/marketplace';

export interface MarketplaceFormValues {
  kind: ListingKind;
  title: string;
  description: string;
  price: string;          // kept as text while typing
  category: string;
  photos: string[];       // photos already uploaded (when editing)
  // Rentals
  rental_type: string;
  available_from: string; // YYYY-MM-DD, '' = now
  furnished: boolean;
  pets_ok: boolean;
  utilities_included: boolean;
  comments_enabled: boolean;
  is_anonymous: boolean;
}

export function emptyMarketplaceForm(): MarketplaceFormValues {
  return {
    kind: 'sale', title: '', description: '', price: '', category: 'other', photos: [],
    rental_type: 'room', available_from: '', furnished: false, pets_ok: false, utilities_included: false,
    comments_enabled: true,
    is_anonymous: false,
  };
}

export function marketplaceFormFromListing(l: any): MarketplaceFormValues {
  return {
    kind: l.kind,
    title: l.title || '',
    description: l.description || '',
    price: l.price === null || l.price === undefined ? '' : String(Number(l.price)),
    category: l.category || 'other',
    photos: l.photos || [],
    rental_type: l.rental_type || 'room',
    available_from: l.available_from ? String(l.available_from).slice(0, 10) : '',
    furnished: !!l.furnished,
    pets_ok: !!l.pets_ok,
    utilities_included: !!l.utilities_included,
    comments_enabled: l.comments_enabled !== false,
    is_anonymous: !!l.is_anonymous,
  };
}

// What gets saved (photos are added by the caller after uploading)
export function marketplaceFormToRow(v: MarketplaceFormValues) {
  const price = parseFloat(v.price.replace(/[$,\s]/g, ''));
  const category = v.kind === 'rent' ? HOUSING_CATEGORY : v.category;
  const rental = isRental({ kind: v.kind, category });
  return {
    kind: v.kind,
    title: v.title.trim(),
    description: v.description.trim() || null,
    price: v.kind === 'free' || !Number.isFinite(price) ? null : Math.round(price * 100) / 100,
    category,
    rental_type: rental ? v.rental_type : null,
    available_from: v.kind === 'rent' && v.available_from ? v.available_from : null,
    furnished: v.kind === 'rent' ? v.furnished : null,
    pets_ok: v.kind === 'rent' ? v.pets_ok : null,
    utilities_included: v.kind === 'rent' ? v.utilities_included : null,
    comments_enabled: v.comments_enabled,
    is_anonymous: v.is_anonymous,
  };
}

interface NewPhoto { id: string; file: File; preview: string }

interface Props {
  initial: MarketplaceFormValues;
  userId: string;
  submitLabel: string;
  // Called with the final list of photo links (old ones kept + new ones uploaded)
  onSubmit: (values: MarketplaceFormValues, photos: string[], removed: string[]) => Promise<string | null>;
  onCancel: () => void;
}

const input = 'w-full min-h-[44px] px-3 py-2 rounded-lg border border-[#CFC6B4] bg-white text-base focus:outline-none focus:ring-2 focus:ring-gabriola-green focus:border-transparent';
const label = 'block text-sm font-semibold text-[#1F2A24] mb-1';
const hint = 'text-xs text-[#5B6660] mt-1';

export default function MarketplaceForm({ initial, userId, submitLabel, onSubmit, onCancel }: Props) {
  const [v, setV] = useState<MarketplaceFormValues>(initial);
  const [kept, setKept] = useState<string[]>(initial.photos);
  const [added, setAdded] = useState<NewPhoto[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Free the preview images when leaving the page
  useEffect(() => () => added.forEach(p => URL.revokeObjectURL(p.preview)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (field: keyof MarketplaceFormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setV(prev => ({ ...prev, [field]: e.target.value }));

  const photoCount = kept.length + added.length;
  const renting = v.kind === 'rent';
  const lookingToRent = v.kind === 'wanted' && v.category === HOUSING_CATEGORY;
  const check = (field: 'furnished' | 'pets_ok' | 'utilities_included' | 'comments_enabled' | 'is_anonymous') =>
    (e: React.ChangeEvent<HTMLInputElement>) => setV(prev => ({ ...prev, [field]: e.target.checked }));

  const pickPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    const room = MAX_PHOTOS - photoCount;
    if (files.length > room) setError(`You can add up to ${MAX_PHOTOS} photos.`);
    else setError('');
    const next = files.slice(0, Math.max(0, room)).map((file, i) => ({
      id: `${Date.now()}-${i}`, file, preview: URL.createObjectURL(file),
    }));
    setAdded(prev => [...prev, ...next]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeAdded = (id: string) => {
    setAdded(prev => {
      const p = prev.find(x => x.id === id);
      if (p) URL.revokeObjectURL(p.preview);
      return prev.filter(x => x.id !== id);
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (v.title.trim().length < 3) {
      setError('Please give it a title (at least 3 letters).');
      return;
    }
    if (v.kind !== 'free' && v.price.trim() !== '' && !Number.isFinite(parseFloat(v.price.replace(/[$,\s]/g, '')))) {
      setError('The price should be a number, like 40 or 12.50.');
      return;
    }
    if (renting && v.price.trim() === '') {
      setError('Please put the rent per month.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const uploaded: string[] = [];
      for (const p of added) {
        uploaded.push(await uploadListingPhoto(userId, p.file));
      }
      const removed = initial.photos.filter(u => !kept.includes(u));
      const problem = await onSubmit(v, [...kept, ...uploaded], removed);
      if (problem) {
        setError(problem);
        setSaving(false);
      }
    } catch (err: any) {
      console.error('Listing photo upload failed:', err);
      setError('A photo couldn\'t be uploaded. Please try a different photo, or post without it.');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {/* Kind */}
      <fieldset>
        <legend className={label}>What kind of listing?</legend>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {LISTING_KINDS.map(k => (
            <button
              key={k.id}
              type="button"
              onClick={() => setV(prev => ({ ...prev, kind: k.id }))}
              aria-pressed={v.kind === k.id}
              className={`min-h-[44px] rounded-lg border text-sm font-semibold transition-colors ${
                v.kind === k.id ? 'bg-gabriola-green border-gabriola-green text-white' : 'bg-white border-[#CFC6B4] text-[#1F2A24] hover:border-gabriola-green'
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="mk-title" className={label}>Title</label>
        <input id="mk-title" className={input} value={v.title} onChange={set('title')} maxLength={100}
          placeholder={renting ? 'e.g. Bright one-bedroom suite near the Village' : lookingToRent ? 'e.g. Looking for a room or small cabin' : v.kind === 'wanted' ? 'e.g. Looking for a small chest freezer' : 'e.g. Cedar picnic table'} required />
      </div>

      {(renting || lookingToRent) && (
        <div>
          <label htmlFor="mk-rental-type" className={label}>{renting ? 'What are you renting out?' : 'What are you looking for?'}</label>
          <select id="mk-rental-type" className={input} value={v.rental_type} onChange={set('rental_type')}>
            {RENTAL_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <p className={hint}>Monthly rentals and up. For nightly or weekly stays, use Airbnb or similar.</p>
        </div>
      )}

      {v.kind !== 'free' && (
        <div>
          <label htmlFor="mk-price" className={label}>
            {renting ? 'Rent per month' : lookingToRent ? 'Budget per month (optional)' : v.kind === 'wanted' ? 'Budget (optional)' : 'Price (optional)'}
          </label>
          <div className="relative max-w-[200px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6660]" aria-hidden="true">$</span>
            <input id="mk-price" className={`${input} pl-7`} value={v.price} onChange={set('price')} inputMode="decimal" placeholder="0" />
          </div>
          {!renting && !lookingToRent && <p className={hint}>Leave it empty for "make an offer".</p>}
        </div>
      )}

      {renting && (
        <>
          <div>
            <label htmlFor="mk-available" className={label}>Available from</label>
            <input id="mk-available" type="date" className={`${input} max-w-[220px]`} value={v.available_from} onChange={set('available_from')} />
            <p className={hint}>Leave it empty if it's available now.</p>
          </div>
          <fieldset>
            <legend className={label}>Details</legend>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <label className="flex items-center gap-2 min-h-[44px] text-sm">
                <input type="checkbox" checked={v.furnished} onChange={check('furnished')} className="w-5 h-5" /> Furnished
              </label>
              <label className="flex items-center gap-2 min-h-[44px] text-sm">
                <input type="checkbox" checked={v.pets_ok} onChange={check('pets_ok')} className="w-5 h-5" /> Pets OK
              </label>
              <label className="flex items-center gap-2 min-h-[44px] text-sm">
                <input type="checkbox" checked={v.utilities_included} onChange={check('utilities_included')} className="w-5 h-5" /> Utilities included
              </label>
            </div>
          </fieldset>
          <p className="text-xs text-[#5B6660] bg-[#F6F2EA] rounded-lg px-3 py-2">
            Please don't write who you won't rent to. Under BC's Human Rights Code a rental ad can't turn people away
            because of things like children, age, disability or where their income comes from, unless they'd share a
            kitchen or bathroom with you. You're also responsible for following local zoning and rental rules.
          </p>
        </>
      )}

      {!renting && (
        <div>
          <label htmlFor="mk-category" className={label}>Category</label>
          <select id="mk-category" className={input} value={v.category} onChange={set('category')}>
            {LISTING_CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>
                {c.id === HOUSING_CATEGORY && v.kind === 'wanted' ? 'Housing (looking for a rental)' : c.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="mk-description" className={label}>Description</label>
        <textarea id="mk-description" className={`${input} min-h-[120px]`} value={v.description} onChange={set('description')} maxLength={3000}
          placeholder={renting || lookingToRent ? 'Where on the island, size, what\'s included, how long, who you are...' : 'Size, condition, where to pick it up, when you\'re around...'} />
        <p className={hint}>Please don't put your phone number or email here. People can message you on Gabriola Connects.</p>
      </div>

      {/* Photos */}
      <div>
        <span className={label}>Photos (up to {MAX_PHOTOS})</span>
        <div className="grid grid-cols-4 gap-2">
          {kept.map(url => (
            <div key={url} className="relative aspect-square rounded-lg overflow-hidden bg-[#EEE8DD]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button type="button" onClick={() => setKept(prev => prev.filter(u => u !== url))} aria-label="Remove photo"
                className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center">
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          ))}
          {added.map(p => (
            <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden bg-[#EEE8DD]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.preview} alt="" className="w-full h-full object-cover" />
              <button type="button" onClick={() => removeAdded(p.id)} aria-label="Remove photo"
                className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center">
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          ))}
          {photoCount < MAX_PHOTOS && (
            <button type="button" onClick={() => fileRef.current?.click()}
              className="aspect-square rounded-lg border-2 border-dashed border-[#CFC6B4] text-[#5B6660] flex flex-col items-center justify-center gap-1 text-xs font-semibold hover:border-gabriola-green hover:text-gabriola-green">
              <Camera className="w-6 h-6" aria-hidden="true" />
              Add photo
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={pickPhotos} className="hidden" />
        <p className={hint}>The first photo is the one people see in the list.</p>
      </div>

      <div>
        <label className="flex items-start gap-2 min-h-[44px] text-sm">
          <input type="checkbox" checked={v.comments_enabled} onChange={check('comments_enabled')} className="w-5 h-5 mt-0.5" />
          <span>
            <span className="font-semibold">Allow public questions &amp; comments</span>
            <span className="block text-xs text-[#5B6660]">Turn this off and people can still message you privately. You can change it any time on the listing.</span>
          </span>
        </label>
        <label className="flex items-start gap-2 min-h-[44px] text-sm mt-1">
          <input type="checkbox" checked={v.is_anonymous} onChange={check('is_anonymous')} className="w-5 h-5 mt-0.5" />
          <span>
            <span className="font-semibold">Post without my name</span>
            <span className="block text-xs text-[#5B6660]">Shows &quot;Posted by a neighbour&quot;. People can still message you, and they only find out who you are if you reply.</span>
          </span>
        </label>
      </div>

      {error && <p className="text-sm font-semibold text-[#B42318]" role="alert">{error}</p>}

      <div className="flex flex-wrap gap-2 pt-1">
        <button type="submit" disabled={saving}
          className="min-h-[44px] px-5 rounded-lg bg-gabriola-green text-white font-semibold hover:bg-gabriola-green-dark disabled:opacity-60">
          {saving ? (added.length ? 'Uploading photos...' : 'Saving...') : submitLabel}
        </button>
        <button type="button" onClick={onCancel} disabled={saving}
          className="min-h-[44px] px-5 rounded-lg border border-[#CFC6B4] bg-white font-semibold">
          Cancel
        </button>
      </div>
    </form>
  );
}
