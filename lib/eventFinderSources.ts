// lib/eventFinderSources.ts
// The calendars the event finder checks, and the title key used to "always ignore" a title.
// Kept apart from lib/eventFinder.ts so the admin page can use it without the calendar parser.
// Version: 1.0.0
// Date: 2026-11-08

export interface FinderSource {
  name: string;            // shown to Alex
  feedUrl: string;         // iCalendar (.ics) feed
  pageUrl: string;         // the page people see (saved on events added from it)
  venueName: string;       // venue for events added from it
  venueMatch: RegExp;      // our events at this venue (for the "not on their calendar" check)
}

export const SOURCES: FinderSource[] = [
  {
    name: 'Gabriola Community Hall calendar',
    feedUrl: 'https://calendar.google.com/calendar/ical/rentalcommunityhall%40gmail.com/public/basic.ics',
    pageUrl: 'https://gabriolacommunityhall.com/event-calendar/',
    venueName: 'Gabriola Community Hall',
    venueMatch: /community\s*hall/i,
  },
];

/** Key used to "always ignore" a title (case and punctuation don't matter). */
export const titleKey = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
