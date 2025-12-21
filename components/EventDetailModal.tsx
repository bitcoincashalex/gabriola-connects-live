// components/EventDetailModal.tsx
// Reusable event detail modal - extracted from Calendar.tsx
// Version: 1.1.0 - Added clickable image to view full size poster
// Date: 2025-12-20

'use client';

import { useState } from 'react';
import { Event } from '@/lib/types';
import { X, Clock, MapPin, Mail, Phone, ZoomIn } from 'lucide-react';
import { format } from 'date-fns';

interface EventDetailModalProps {
  event: Event | null;
  onClose: () => void;
}

// CRITICAL: Parse dates in local timezone to prevent day-shift
const ensureDate = (dateValue: Date | string | undefined | null): Date => {
  if (!dateValue) return new Date();
  if (dateValue instanceof Date) return dateValue;
  
  const [year, month, day] = dateValue.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export default function EventDetailModal({ event, onClose }: EventDetailModalProps) {
  if (!event) return null;

  const [showFullImage, setShowFullImage] = useState(false);

  const handleRSVP = (selectedEvent: Event) => {
    if (selectedEvent.contact_email) {
      const subject = encodeURIComponent(`RSVP: ${selectedEvent.title}`);
      const body = encodeURIComponent(
        `Hi,\n\nI would like to RSVP for the following event:\n\n` +
        `Event: ${selectedEvent.title}\n` +
        `Date: ${format(ensureDate(selectedEvent.start_date), 'MMMM d, yyyy')}\n` +
        `Time: ${selectedEvent.start_time}\n` +
        `Location: ${selectedEvent.location}\n\n` +
        `Please confirm my attendance.\n\nThank you!`
      );
      window.location.href = `mailto:${selectedEvent.contact_email}?subject=${subject}&body=${body}`;
    }
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const getFullAddress = (location: string) => {
    if (!location) return 'Gabriola Island, BC';
    
    const locationMap: Record<string, string> = {
      'rollo': 'Rollo Centre, 575 North Rd, Gabriola Island, BC',
      'commons': 'Commons, 476 South Rd, Gabriola Island, BC',
      'library': 'Gabriola Library, 573 South Rd, Gabriola Island, BC',
      'twin beaches': 'Twin Beaches, Gabriola Island, BC',
      'haven': 'Haven By The Sea, Gabriola Island, BC',
      'golf': 'Gabriola Golf Club, Gabriola Island, BC',
      'pageac': 'PAGEAC Art Gallery, Gabriola Island, BC',
    };

    const locationLower = location.toLowerCase();
    for (const [key, fullAddress] of Object.entries(locationMap)) {
      if (locationLower.includes(key)) {
        return fullAddress;
      }
    }

    return `${location}, Gabriola Island, BC`;
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 fade-in" 
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl slide-up" 
        onClick={e => e.stopPropagation()}
      >
        {event.image_url && (
          <div className="relative group cursor-pointer" onClick={() => setShowFullImage(true)}>
            <img src={event.image_url} alt={event.title} className="w-full h-48 object-cover rounded-t-2xl" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all rounded-t-2xl flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 px-4 py-2 rounded-lg flex items-center gap-2">
                <ZoomIn className="w-5 h-5 text-gray-800" />
                <span className="text-sm font-medium text-gray-800">Click to view full size</span>
              </div>
            </div>
          </div>
        )}
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-display font-bold text-gabriola-green-dark pr-8">
              {event.title}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-2 text-gray-700">
              <Clock className="w-5 h-5 text-gabriola-green flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-medium">{event.start_time}</span>
                  {event.end_time && <span className="text-gray-500">- {event.end_time}</span>}
                  <span className="text-gray-500">
                    on {format(ensureDate(event.start_date), 'MMMM d, yyyy')}
                    {event.end_date && ensureDate(event.end_date).getTime() !== ensureDate(event.start_date).getTime() && 
                      ` - ${format(ensureDate(event.end_date), 'MMMM d, yyyy')}`
                    }
                  </span>
                  <button
                    onClick={() => {
                      const eventTitle = encodeURIComponent(event.title);
                      const eventDetails = encodeURIComponent(event.description);
                      const eventLocation = encodeURIComponent(event.location);
                      const eventDate = format(ensureDate(event.start_date), 'yyyyMMdd');
                      const googleCalUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${eventDate}/${eventDate}&details=${eventDetails}&location=${eventLocation}`;
                      window.open(googleCalUrl, '_blank');
                    }}
                    className="text-xs bg-gabriola-green/10 text-gabriola-green px-3 py-1 rounded-full hover:bg-gabriola-green/20 transition-colors"
                  >
                    Add to Calendar
                  </button>
                </div>
                {event.is_recurring && event.recurrence_pattern && (
                  <div className="text-sm text-gabriola-green-dark mt-1">
                    📅 Repeats {event.recurrence_pattern}
                  </div>
                )}
              </div>
            </div>

            {/* Fees */}
            {event.fees && (
              <div className="flex items-center gap-2 text-gray-700 mt-4">
                <span className="text-gabriola-green text-xl">💵</span>
                <span className="font-medium">{event.fees}</span>
              </div>
            )}

            {/* Registration */}
            {event.registration_url && (
              <a 
                href={event.registration_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 mt-4 bg-gabriola-green text-white rounded-lg hover:bg-gabriola-green-dark transition-colors"
              >
                🎟️ Register Now →
              </a>
            )}

            {/* Venue Name */}
            {event.venue_name && (
              <div className="flex items-center gap-2 text-gray-700 mt-4">
                <span className="text-gabriola-green">🏢</span>
                <span className="font-medium">{event.venue_name}</span>
              </div>
            )}

            {/* Age Restrictions */}
            {event.age_restrictions && (
              <div className="flex items-center gap-2 text-gray-700 mt-2">
                <span className="text-gabriola-green">👶</span>
                <span className="text-sm">{event.age_restrictions}</span>
              </div>
            )}

            {/* Accessibility */}
            {event.accessibility_info && (
              <div className="flex items-center gap-2 text-gray-700 mt-2">
                <span className="text-gabriola-green">♿</span>
                <span className="text-sm">{event.accessibility_info}</span>
              </div>
            )}

            {/* Weather Dependent */}
            {event.weather_dependent && (
              <div className="flex items-center gap-2 text-blue-600 mt-2">
                <span>🌧️</span>
                <span className="text-sm">Weather permitting</span>
              </div>
            )}

            {/* Cancelled Badge */}
            {event.status === 'cancelled' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                <div className="text-red-800 font-semibold">❌ Event Cancelled</div>
                {event.cancellation_reason && (
                  <div className="text-sm text-red-700 mt-1">{event.cancellation_reason}</div>
                )}
              </div>
            )}
            
            <button
              onClick={() => {
                const fullAddress = getFullAddress(event.location);
                const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
                window.open(mapsUrl, '_blank');
              }}
              className="flex items-start gap-2 text-gray-700 hover:text-gabriola-green transition-colors w-full text-left group"
            >
              <MapPin className="w-5 h-5 text-gabriola-green flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
              <div>
                <span className="underline decoration-dotted">{event.location}</span>
                <div className="text-xs text-gabriola-green mt-1">Click to open in Google Maps →</div>
              </div>
            </button>

            {event.contact_email && (
              <div className="flex items-center gap-2 text-gray-700">
                <Mail className="w-5 h-5 text-gabriola-green" />
                <a href={`mailto:${event.contact_email}`} className="text-sm text-blue-600 hover:text-blue-800 hover:underline">
                  {event.contact_email}
                </a>
              </div>
            )}

            {event.contact_phone && (
              <div className="flex items-center gap-2 text-gray-700">
                <Phone className="w-5 h-5 text-gabriola-green" />
                <a href={`tel:${event.contact_phone}`} className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium">
                  {event.contact_phone}
                </a>
              </div>
            )}
          </div>

          <div className="prose prose-sm max-w-none mb-6">
            <p className="text-gray-700 leading-relaxed">{event.description}</p>
          </div>

          {/* Additional Information */}
          {event.additional_info && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                ℹ️ Additional Information
              </h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{event.additional_info}</p>
            </div>
          )}

          {/* Organizer Information */}
          {(event.organizer_name || event.organizer_organization) && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-800 mb-2">👤 Organized By</h4>
              {event.organizer_name && (
                <div className="text-sm text-gray-700">{event.organizer_name}</div>
              )}
              {event.organizer_organization && (
                <div className="text-sm text-gray-600">{event.organizer_organization}</div>
              )}
              {event.organizer_website && (
                <a href={event.organizer_website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline mt-1 inline-block">
                  🌐 Visit Website →
                </a>
              )}
            </div>
          )}

          {(event.contact_email || event.contact_phone) && (
            <div className="mb-6 p-4 bg-gabriola-sand/30 rounded-lg border border-gabriola-green/20">
              <h3 className="font-semibold text-gabriola-green-dark mb-3 flex items-center gap-2">
                📞 Contact Organizer
              </h3>
              <div className="space-y-2">
                {event.contact_email && (
                  <a href={`mailto:${event.contact_email}`} className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline transition-colors">
                    <Mail className="w-4 h-4" />
                    <span className="text-sm">{event.contact_email}</span>
                  </a>
                )}
                {event.contact_phone && (
                  <a href={`tel:${event.contact_phone}`} className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline transition-colors font-medium">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">{event.contact_phone}</span>
                  </a>
                )}
              </div>
              <p className="text-xs text-gray-600 mt-3">
                Have questions about this event? Contact the organizer directly!
              </p>
            </div>
          )}

          <div className="flex gap-3">
            {event.contact_email ? (
              <button onClick={() => handleRSVP(event)} className="flex-1 bg-gabriola-green text-white py-3 px-6 rounded-lg font-semibold hover:bg-gabriola-green-dark transition-colors flex items-center justify-center gap-2">
                <Mail className="w-4 h-4" />
                RSVP via Email
              </button>
            ) : event.contact_phone ? (
              <button onClick={() => handleCall(event.contact_phone!)} className="flex-1 bg-gabriola-green text-white py-3 px-6 rounded-lg font-semibold hover:bg-gabriola-green-dark transition-colors flex items-center justify-center gap-2">
                <Phone className="w-4 h-4" />
                Call to RSVP
              </button>
            ) : (
              <button className="flex-1 bg-gray-400 text-white py-3 px-6 rounded-lg font-semibold cursor-not-allowed" disabled>
                No Contact Info
              </button>
            )}
            <button className="px-6 py-3 border-2 border-gabriola-green text-gabriola-green rounded-lg font-semibold hover:bg-gabriola-green/5 transition-colors">
              Share
            </button>
          </div>

          {!event.contact_email && !event.contact_phone && (
            <p className="text-xs text-amber-600 mt-2 text-center">
              No organizer contact info available - check event source for RSVP details
            </p>
          )}

          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Source: {event.source_url ? (<a href={event.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{event.source_name}</a>) : event.source_name}
            </p>
          </div>
        </div>
      </div>

      {/* Full Size Image Modal */}
      {showFullImage && event.image_url && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[60]" 
          onClick={() => setShowFullImage(false)}
        >
          <div className="relative max-w-7xl max-h-[95vh] w-full h-full flex items-center justify-center">
            <button 
              onClick={() => setShowFullImage(false)}
              className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            <img 
              src={event.image_url} 
              alt={event.title}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <p className="absolute bottom-4 left-0 right-0 text-center text-white text-sm bg-black/50 py-2">
              Click outside image to close
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
