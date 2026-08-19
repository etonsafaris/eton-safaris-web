import { SITE } from '@/lib/collections';

type CalendarEvent = {
  title: string;
  details: string;
  location?: string;
  start: Date;
  end?: Date;
};

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function toGoogleStamp(date: Date) {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

export function googleCalendarUrl(event: CalendarEvent) {
  const end = event.end || new Date(event.start.getTime() + 2 * 60 * 60 * 1000);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    details: event.details,
    location: event.location || SITE.address,
    dates: `${toGoogleStamp(event.start)}/${toGoogleStamp(end)}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function icsContent(event: CalendarEvent) {
  const end = event.end || new Date(event.start.getTime() + 2 * 60 * 60 * 1000);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Eton Safaris//Bookings//EN',
    'BEGIN:VEVENT',
    `DTSTAMP:${toGoogleStamp(new Date())}`,
    `DTSTART:${toGoogleStamp(event.start)}`,
    `DTEND:${toGoogleStamp(end)}`,
    `SUMMARY:${event.title.replace(/\n/g, ' ')}`,
    `DESCRIPTION:${event.details.replace(/\n/g, ' ')}`,
    `LOCATION:${(event.location || SITE.address).replace(/\n/g, ' ')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function bookingCalendarEvent(input: {
  guestName: string;
  tour?: string;
  destination?: string;
  travelDate?: string;
  email?: string;
}) {
  const start = input.travelDate ? new Date(input.travelDate) : new Date();
  const safeStart = Number.isNaN(start.getTime()) ? new Date() : start;
  return {
    title: `Safari booking: ${input.tour || input.destination || 'Eton Safaris'}`,
    details: `${input.guestName}${input.email ? ` (${input.email})` : ''} booked ${input.tour || 'a safari'}${input.destination ? ` in ${input.destination}` : ''}.`,
    location: input.destination || SITE.address,
    start: safeStart,
  };
}
