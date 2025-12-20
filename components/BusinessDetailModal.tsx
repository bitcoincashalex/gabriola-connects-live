// components/BusinessDetailModal.tsx
// Reusable business detail modal for directory listings
// Version: 1.0.0
// Date: 2025-12-20

'use client';

import { X, MapPin, Phone, Mail, Globe, Clock, DollarSign, Facebook, Instagram } from 'lucide-react';

interface DirectoryBusiness {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  tagline?: string;
  description?: string;
  
  // Contact
  phone?: string;
  email?: string;
  contact_phone?: string;
  contact_email?: string;
  website?: string;
  facebook_url?: string;
  instagram_url?: string;
  
  // Location
  address?: string;
  address_line2?: string;
  postal_code?: string;
  map_url?: string;
  location_notes?: string;
  
  // Owner
  owner_name?: string;
  
  // Hours
  hours_monday?: string;
  hours_tuesday?: string;
  hours_wednesday?: string;
  hours_thursday?: string;
  hours_friday?: string;
  hours_saturday?: string;
  hours_sunday?: string;
  hours_notes?: string;
  is_year_round?: boolean;
  seasonal_closure_notes?: string;
  
  // Services & Features
  services?: string;
  specialties?: string;
  price_range?: string;
  established_year?: number;
  
  // Payment
  accepts_cash?: boolean;
  accepts_credit?: boolean;
  accepts_debit?: boolean;
  accepts_etransfer?: boolean;
  
  // Amenities
  wheelchair_accessible?: boolean;
  parking_available?: boolean;
  wifi_available?: boolean;
  pet_friendly?: boolean;
  family_friendly?: boolean;
  outdoor_seating?: boolean;
  
  // Business Options
  offers_delivery?: boolean;
  offers_pickup?: boolean;
  offers_shipping?: boolean;
  offers_online_booking?: boolean;
  
  // Credentials
  licensed?: boolean;
  insured?: boolean;
  organic_certified?: boolean;
  
  // Community
  local_business?: boolean;
  islander_owned?: boolean;
  chamber_member?: boolean;
  
  // Media
  image?: string;
  logo_url?: string;
  cover_image_url?: string;
  gallery_images?: string[];
  
  [key: string]: any;
}

interface BusinessDetailModalProps {
  business: DirectoryBusiness | null;
  onClose: () => void;
}

export default function BusinessDetailModal({ business, onClose }: BusinessDetailModalProps) {
  if (!business) return null;

  const days = [
    { label: 'Monday', key: 'hours_monday' },
    { label: 'Tuesday', key: 'hours_tuesday' },
    { label: 'Wednesday', key: 'hours_wednesday' },
    { label: 'Thursday', key: 'hours_thursday' },
    { label: 'Friday', key: 'hours_friday' },
    { label: 'Saturday', key: 'hours_saturday' },
    { label: 'Sunday', key: 'hours_sunday' },
  ];

  const hasHours = days.some(day => business[day.key]);

  const paymentMethods = [
    { label: 'Cash', key: 'accepts_cash' },
    { label: 'Credit', key: 'accepts_credit' },
    { label: 'Debit', key: 'accepts_debit' },
    { label: 'E-Transfer', key: 'accepts_etransfer' },
  ].filter(method => business[method.key]);

  const amenities = [
    { label: '♿ Wheelchair Accessible', key: 'wheelchair_accessible' },
    { label: '🅿️ Parking Available', key: 'parking_available' },
    { label: '📶 WiFi', key: 'wifi_available' },
    { label: '🐕 Pet Friendly', key: 'pet_friendly' },
    { label: '👨‍👩‍👧 Family Friendly', key: 'family_friendly' },
    { label: '🌳 Outdoor Seating', key: 'outdoor_seating' },
  ].filter(amenity => business[amenity.key]);

  const services = [
    { label: '🚚 Delivery', key: 'offers_delivery' },
    { label: '🏪 Pickup', key: 'offers_pickup' },
    { label: '📦 Shipping', key: 'offers_shipping' },
    { label: '📅 Online Booking', key: 'offers_online_booking' },
  ].filter(service => business[service.key]);

  const badges = [
    { label: '🏝️ Islander Owned', key: 'islander_owned', color: 'bg-blue-100 text-blue-800' },
    { label: '🏢 Chamber Member', key: 'chamber_member', color: 'bg-green-100 text-green-800' },
    { label: '🌱 Organic Certified', key: 'organic_certified', color: 'bg-emerald-100 text-emerald-800' },
    { label: '✅ Licensed', key: 'licensed', color: 'bg-purple-100 text-purple-800' },
    { label: '🛡️ Insured', key: 'insured', color: 'bg-indigo-100 text-indigo-800' },
  ].filter(badge => business[badge.key]);

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 fade-in" 
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl slide-up" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header Image */}
        {(business.cover_image_url || business.image) && (
          <img 
            src={business.cover_image_url || business.image} 
            alt={business.name} 
            className="w-full h-56 object-cover rounded-t-2xl" 
          />
        )}
        
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1 pr-8">
              {business.logo_url && (
                <img src={business.logo_url} alt={`${business.name} logo`} className="w-20 h-20 object-contain mb-3" />
              )}
              <h2 className="text-3xl font-bold text-gabriola-green-dark">
                {business.name}
              </h2>
              {business.tagline && (
                <p className="text-lg text-gray-600 italic mt-1">{business.tagline}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span className="px-3 py-1 bg-gabriola-green/10 text-gabriola-green rounded-full text-sm font-medium">
                  {business.category}
                </span>
                {business.subcategory && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                    {business.subcategory}
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Badges */}
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {badges.map(badge => (
                <span key={badge.key} className={`px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
                  {badge.label}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          {business.description && (
            <div className="prose prose-sm max-w-none mb-6">
              <p className="text-gray-700 leading-relaxed">{business.description}</p>
            </div>
          )}

          {/* Services & Specialties */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {business.services && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">🔧 Services</h3>
                <p className="text-sm text-gray-700">{business.services}</p>
              </div>
            )}
            {business.specialties && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">⭐ Specialties</h3>
                <p className="text-sm text-gray-700">{business.specialties}</p>
              </div>
            )}
          </div>

          {/* Contact Information */}
          <div className="mb-6 p-4 bg-gabriola-sand/30 rounded-lg border border-gabriola-green/20">
            <h3 className="font-semibold text-gabriola-green-dark mb-3">📞 Contact</h3>
            <div className="space-y-2">
              {(business.phone || business.contact_phone) && (
                <a 
                  href={`tel:${business.phone || business.contact_phone}`} 
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
                >
                  <Phone className="w-4 h-4" />
                  <span>{business.phone || business.contact_phone}</span>
                </a>
              )}
              {(business.email || business.contact_email) && (
                <a 
                  href={`mailto:${business.email || business.contact_email}`} 
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
                >
                  <Mail className="w-4 h-4" />
                  <span>{business.email || business.contact_email}</span>
                </a>
              )}
              {business.website && (
                <a 
                  href={business.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
                >
                  <Globe className="w-4 h-4" />
                  <span>Visit Website</span>
                </a>
              )}
              {business.facebook_url && (
                <a 
                  href={business.facebook_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
                >
                  <Facebook className="w-4 h-4" />
                  <span>Facebook</span>
                </a>
              )}
              {business.instagram_url && (
                <a 
                  href={business.instagram_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
                >
                  <Instagram className="w-4 h-4" />
                  <span>Instagram</span>
                </a>
              )}
            </div>
          </div>

          {/* Location */}
          {business.address && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-2">📍 Location</h3>
              <button
                onClick={() => {
                  const address = `${business.address}${business.address_line2 ? ', ' + business.address_line2 : ''}, Gabriola Island, BC${business.postal_code ? ' ' + business.postal_code : ''}`;
                  const mapsUrl = business.map_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
                  window.open(mapsUrl, '_blank');
                }}
                className="flex items-start gap-2 text-gray-700 hover:text-gabriola-green transition-colors w-full text-left group"
              >
                <MapPin className="w-5 h-5 text-gabriola-green flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <div>
                  <div>{business.address}</div>
                  {business.address_line2 && <div className="text-sm">{business.address_line2}</div>}
                  <div className="text-sm">Gabriola Island, BC {business.postal_code}</div>
                  <div className="text-xs text-gabriola-green mt-1">Click to open in Google Maps →</div>
                </div>
              </button>
              {business.location_notes && (
                <p className="text-sm text-gray-600 mt-2">{business.location_notes}</p>
              )}
            </div>
          )}

          {/* Hours */}
          {hasHours && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Hours
              </h3>
              <div className="space-y-1">
                {days.map(day => business[day.key] && (
                  <div key={day.label} className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700">{day.label}:</span>
                    <span className="text-gray-600">{business[day.key]}</span>
                  </div>
                ))}
              </div>
              {business.hours_notes && (
                <p className="text-xs text-gray-600 mt-3 italic">{business.hours_notes}</p>
              )}
              {business.is_year_round === false && business.seasonal_closure_notes && (
                <p className="text-xs text-amber-700 mt-2">⚠️ {business.seasonal_closure_notes}</p>
              )}
            </div>
          )}

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {/* Payment Methods */}
            {paymentMethods.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Payment
                </h3>
                <div className="flex flex-wrap gap-2">
                  {paymentMethods.map(method => (
                    <span key={method.key} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                      {method.label}
                    </span>
                  ))}
                </div>
                {business.price_range && (
                  <p className="text-sm text-gray-600 mt-2">Range: {business.price_range}</p>
                )}
              </div>
            )}

            {/* Services */}
            {services.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">📦 Options</h3>
                <div className="flex flex-wrap gap-2">
                  {services.map(service => (
                    <span key={service.key} className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                      {service.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Amenities */}
          {amenities.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-3">✨ Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {amenities.map(amenity => (
                  <span key={amenity.key} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                    {amenity.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Additional Info */}
          <div className="flex justify-between items-center text-sm text-gray-500 pt-4 border-t border-gray-200">
            {business.established_year && (
              <span>Established {business.established_year}</span>
            )}
            {business.owner_name && (
              <span>Owner: {business.owner_name}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
