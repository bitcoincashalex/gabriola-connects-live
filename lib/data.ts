// lib/data.ts
// Version: 2.0.0 - Removed outdated BBS mock data (using real database now)
// Date: 2025-12-11

import { Event, DirectoryListing, FerryStatus, EmergencyAlert } from './types';
import { gabriolaBusinesses } from './gabriola-businesses';

// Mock events data - simulating scraped data from gabriolaevents.ca and other sources
export function getMockEvents(): Event[] {
  const events: Event[] = [];
  const today = new Date(); // Use current date
  today.setHours(0, 0, 0, 0); // Reset to start of day

  const eventTemplates = [
    { title: 'Yoga at the Commons', time: '9:00 AM', location: 'Gabriola Commons', description: 'Gentle morning yoga flow for all levels. Bring your own mat.', source: 'gabriolaevents.ca' },
    { title: 'Farmers Market', time: '10:00 AM - 2:00 PM', location: 'Agricultural Hall', description: 'Fresh local produce, baked goods, crafts, and more from island vendors.', source: 'hellogabriola.com' },
    { title: 'Pottery Workshop', time: '1:00 PM', location: 'Arts Council Gallery', description: 'Learn hand-building techniques with local potter Sarah Chen.', source: 'artsgabriola.com' },
    { title: 'Community Choir Practice', time: '7:00 PM', location: 'United Church', description: 'All voices welcome! Rehearsing for winter concert.', source: 'gabriolaevents.ca' },
    { title: 'Island Hikers Group', time: '10:30 AM', location: 'Cox Community Centre', description: 'Moderate 2-hour hike through Elder Cedar Trail. Meet at parking lot.', source: 'hellogabriola.com' },
    { title: 'Open Mic Night', time: '7:30 PM', location: "Surf Lodge", description: 'Bring your instruments, poetry, or just come listen! Sign-up at 7pm.', source: 'soundernews.com' },
    { title: 'Pickleball Drop-in', time: '2:00 PM', location: 'Community Courts', description: 'All skill levels welcome. Paddles available to borrow.', source: 'gabriolaevents.ca' },
    { title: 'Knitting Circle', time: '1:00 PM', location: 'Library', description: 'Bring your project and chat with fellow fiber artists.', source: 'hellogabriola.com' },
    { title: 'Beach Cleanup', time: '9:00 AM', location: 'Drumbeg Park', description: 'Help keep our shores beautiful. Gloves and bags provided.', source: 'gabriolaevents.ca' },
    { title: 'Live Music: Folk Trio', time: '8:00 PM', location: 'Haven Bistro', description: 'The Salish Strings perform maritime folk songs. No cover.', source: 'artsgabriola.com' },
    { title: 'School Board Meeting', time: '6:00 PM', location: 'School Board Office', description: 'Public welcome to attend monthly board meeting.', source: 'soundernews.com' },
    { title: 'Meditation Session', time: '7:00 AM', location: 'Lighthouse Studio', description: 'Guided mindfulness meditation. Donation-based.', source: 'hellogabriola.com' },
  ];

  // Generate events across 60 days
  for (let day = 0; day < 60; day++) {
    const eventDate = new Date(today);
    eventDate.setDate(today.getDate() + day);
    
    // 1-3 events per day randomly
    const numEvents = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < numEvents; i++) {
      const template = eventTemplates[Math.floor(Math.random() * eventTemplates.length)];
      events.push({
        id: `event-${day}-${i}`,
        title: template.title,
        start_date: eventDate,
        start_time: template.time,
        location: template.location,
        description: template.description,
        source_name: template.source,
        image_url: Math.random() > 0.7 ? `https://picsum.photos/seed/${day}${i}/600/400` : undefined,
        created_at: new Date().toISOString(),
      });
    }
  }

  return events.sort((a, b) => a.start_date.getTime() - b.start_date.getTime());
}

export function getMockDirectory(): DirectoryListing[] {
  // Now using comprehensive Gabriola businesses data with placeholder images
  return gabriolaBusinesses;
}

export function getMockFerryStatus(): FerryStatus {
  const now = new Date();
  const nextDep = new Date(now);
  nextDep.setMinutes(nextDep.getMinutes() + 25);
  
  const nextArr = new Date(nextDep);
  nextArr.setMinutes(nextArr.getMinutes() + 20);

  const isDelayed = Math.random() > 0.8;

  return {
    nextDeparture: nextDep.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    nextArrival: nextArr.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    status: isDelayed ? 'Delayed' : 'On Time',
    delayMinutes: isDelayed ? 15 : undefined,
    lastKnownLocation: 'Approaching Gabriola Terminal',
    lastUpdated: now,
  };
}

// ========================================
// BBS MOCK DATA REMOVED
// ========================================
// These functions are no longer needed since the forum
// now uses the real Supabase database.
// Kept as empty functions for backward compatibility.

export function getMockPosts(): any[] {
  // Deprecated - forum now uses Supabase database
  return [];
}

export function addMockPost(post: any): any {
  // Deprecated - forum now uses Supabase database
  console.warn('addMockPost is deprecated - use Supabase database instead');
  return null;
}

// Mock emergency alerts
let currentAlert: EmergencyAlert | null = null;

export function getEmergencyAlert(): EmergencyAlert | null {
  return currentAlert;
}

export function setEmergencyAlert(message: string, issuer: string): EmergencyAlert {
  currentAlert = {
    id: `alert-${Date.now()}`,
    message,
    issuer,
    timestamp: new Date(),
    active: true
  };
  return currentAlert;
}

export function dismissEmergencyAlert(): void {
  if (currentAlert) {
    currentAlert.active = false;
  }
}
