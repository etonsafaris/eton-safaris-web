import { NextResponse } from 'next/server';
import { generateBookingCode } from '@/lib/booking-code';
import { deliverIncomingAlert } from '@/lib/deliver-alert';
import { createAdminClient } from '@/lib/supabase/admin';
import { saveWithColumnFallback } from '@/lib/supabase-save';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { id?: string };
    const id = String(body.id || '').trim();
    if (!id) {
      return NextResponse.json({ error: 'Quotation id is required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: quote, error } = await supabase.from('quotations_inquiries').select('*').eq('id', id).maybeSingle();
    if (error || !quote) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    if (/accepted/i.test(String(quote.status || ''))) {
      return NextResponse.json({ ok: true, alreadyAccepted: true, tour: quote.tour });
    }

    await saveWithColumnFallback(
      'quotations_inquiries',
      { status: 'Accepted', accepted_by: 'guest' },
      { id, client: supabase }
    );

    const bookingResult = await saveWithColumnFallback(
      'bookings',
      {
        guest_name: quote.name || quote.guest_name || 'Guest',
        email: quote.email,
        tour: quote.tour,
        phone: quote.phone,
        travel_date: quote.travel_date,
        guests: quote.guests,
        status: 'Pending',
        payment_status: 'Pending Booking',
        booking_code: generateBookingCode(),
        final_tour_price: quote.agreed_price || quote.total_price || quote.base_price || null,
      },
      { client: supabase }
    );
    const booking = bookingResult.data?.[0];

    await deliverIncomingAlert({
      title: 'Quotation accepted',
      message: `${quote.name || 'Guest'} accepted the quotation for ${quote.tour || 'a safari'}.`,
      category: 'booking',
      guestEmail: String(quote.email || ''),
      sendToGuest: String(quote.email || '').includes('@'),
    });

    return NextResponse.json({
      ok: true,
      bookingId: booking?.id || null,
      tour: quote.tour || '',
    });
  } catch (error) {
    console.error('[Quote] Accept failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not accept quotation' },
      { status: 500 }
    );
  }
}
