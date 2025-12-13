// Path: lib/calendar.ts
// Version: 1.0.0 - iCalendar (.ics) file generator for event exports
// Date: 2024-12-13

export interface EventData {
  title: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate?: Date;
  url?: string;
  organizer?: {
    name: string;
    email?: string;
  };
}

/**
 * Formats a date to iCalendar format (YYYYMMDDTHHMMSS)
 */
function formatICalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

/**
 * Escapes special characters for iCalendar format
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Generates an iCalendar (.ics) file content for an event
 */
export function generateICS(event: EventData): string {
  const now = new Date();
  const startDate = formatICalDate(event.startDate);
  const endDate = event.endDate 
    ? formatICalDate(event.endDate)
    : formatICalDate(new Date(event.startDate.getTime() + 60 * 60 * 1000)); // Default 1 hour
  const createdDate = formatICalDate(now);
  
  // Generate a unique ID for the event
  const uid = `${startDate}-${Math.random().toString(36).substring(7)}@gabriolaconnects.ca`;
  
  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Gabriola Connects//Event Export//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${createdDate}`,
    `DTSTART:${startDate}`,
    `DTEND:${endDate}`,
    `SUMMARY:${escapeICalText(event.title)}`,
  ];
  
  if (event.description) {
    icsContent.push(`DESCRIPTION:${escapeICalText(event.description)}`);
  }
  
  if (event.location) {
    icsContent.push(`LOCATION:${escapeICalText(event.location)}`);
  }
  
  if (event.url) {
    icsContent.push(`URL:${event.url}`);
  }
  
  if (event.organizer) {
    const organizerLine = event.organizer.email
      ? `ORGANIZER;CN=${escapeICalText(event.organizer.name)}:mailto:${event.organizer.email}`
      : `ORGANIZER;CN=${escapeICalText(event.organizer.name)}:noreply@gabriolaconnects.ca`;
    icsContent.push(organizerLine);
  }
  
  icsContent.push(
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR'
  );
  
  return icsContent.join('\r\n');
}

/**
 * Downloads an .ics file in the browser
 */
export function downloadICS(icsContent: string, filename: string): void {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

/**
 * Generates and downloads an .ics file for an event
 */
export function exportEventToCalendar(event: EventData, filename?: string): void {
  const icsContent = generateICS(event);
  const downloadFilename = filename || `${event.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.ics`;
  downloadICS(icsContent, downloadFilename);
}
