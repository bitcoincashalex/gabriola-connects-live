import { Event, DirectoryListing, FerryStatus, BBSPost, EmergencyAlert } from './types';
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

// Mock BBS posts storage (in-memory for demo)
let mockPosts: BBSPost[] = [
  {
    id: 'post-1',
    name: 'Sarah M.',
    title: 'Lost Cat - Orange Tabby',
    message: 'Our cat Marmalade has been missing since yesterday evening around South Road. Orange tabby with white paws, very friendly. Please call if you spot him!',
    category: 'Lost & Found',
    createdAt: new Date(2024, 10, 28),
    replies: [
      {
        id: 'reply-1-1',
        name: 'Tom',
        message: 'I think I saw an orange cat near the Commons this morning. Hope you find him!',
        createdAt: new Date(2024, 10, 28, 14, 30),
        replies: []
      }
    ]
  },
  {
    id: 'post-2',
    name: 'Island Health Update',
    title: 'Flu Shot Clinic - December 5th',
    message: 'Walk-in flu shot clinic at the Medical Centre from 1-4pm. All ages welcome, no appointment needed.',
    category: 'Health',
    createdAt: new Date(2024, 10, 29),
    replies: []
  },
  {
    id: 'post-3',
    name: 'Ferry Rider',
    title: 'Ferry Delays This Morning',
    message: 'Multiple sailings delayed due to mechanical issues. Check BC Ferries site before heading to terminal.',
    category: 'Ferry',
    createdAt: new Date(2024, 11, 1, 8, 15),
    replies: [
      {
        id: 'reply-3-1',
        name: 'Anonymous',
        message: 'Thanks for the heads up! Just checked and 9am sailing is 30 min late.',
        createdAt: new Date(2024, 11, 1, 8, 45),
        replies: [
          {
            id: 'reply-3-1-1',
            name: 'CommuteCrew',
            message: 'Appreciate you both sharing this. Working from car now!',
            createdAt: new Date(2024, 11, 1, 9, 10),
            replies: []
          }
        ]
      }
    ]
  }
];

export function getMockPosts(): BBSPost[] {
  return mockPosts;
}

export function addMockPost(post: Omit<BBSPost, 'id' | 'createdAt' | 'replies'>): BBSPost {
  const newPost: BBSPost = {
    ...post,
    id: `post-${Date.now()}`,
    createdAt: new Date(),
    replies: []
  };
  mockPosts.unshift(newPost);
  return newPost;
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
