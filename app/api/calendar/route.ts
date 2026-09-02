export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { bookingCalendarEvent, icsContent } from '@/lib/calendar';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const event = bookingCalendarEvent({
    guestName: searchParams.get('guest') || 'Guest',
    tour: searchParams.get('tour') || undefined,
    destination: searchParams.get('destination') || undefined,
    travelDate: searchParams.get('date') || undefined,
    email: searchParams.get('email') || undefined,
  });
  const body = icsContent(event);
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="eton-safari-booking.ics"`,
    },
  });
}
