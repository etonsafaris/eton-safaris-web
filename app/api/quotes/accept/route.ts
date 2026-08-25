import { NextResponse } from 'next/server';
import { generateBookingCode } from '@/lib/booking-code';
import { quoteFinalTourFee } from '@/lib/booking-status';
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

    const finalTourFee = quoteFinalTourFee(quote as Record<string, unknown>);
    if (finalTourFee <= 0) {
      return NextResponse.json(
        { error: 'This quotation has no tour fee. Ask the office to resend the quotation with a Final Tour Fee.' },
        { status: 400 }
      );
    }

    await saveWithColumnFallback(
      'quotations_inquiries',
      { status: 'Accepted', accepted_by: 'guest' },
      { id, client: supabase }
    );

    const bookingCode = generateBookingCode();
    const bookingResult = await saveWithColumnFallback(
      'bookings',
      {
        guest_name: quote.name || quote.guest_name || 'Guest',
        email: quote.email,
        tour: quote.tour,
        phone: quote.phone,
        travel_date: quote.travel_date,
        guests: quote.guests,
        destination: quote.destination || quote.country || '',
        country: quote.country || quote.destination || '',
        message: `Accepted quotation ${id}. Quoted fee: ${quote.agreed_price || finalTourFee}.`,
        status: 'Pending',
        payment_status: 'Pending Booking',
        booking_code: bookingCode,
        // Final tour fee always comes from the quotation sent to the guest.
        final_tour_price: finalTourFee,
        amount_paid: 0,
        remaining_balance: finalTourFee,
      },
      { client: supabase }
    );
    const booking = bookingResult.data?.[0];

    await deliverIncomingAlert({
      title: 'Quotation accepted',
      message: `${quote.name || 'Guest'} accepted the quotation for ${quote.tour || 'a safari'}. Final tour fee: USD ${finalTourFee.toFixed(2)}. Booking code: ${bookingCode}.`,
      category: 'booking',
      guestEmail: String(quote.email || ''),
      sendToGuest: String(quote.email || '').includes('@'),
      guestTitle: 'Quotation accepted — next step: payment',
      guestMessage: `Dear ${quote.name || 'Guest'},\n\nThank you for accepting your safari quotation for ${quote.tour || 'your tour'}.\n\nFinal tour fee: USD ${finalTourFee.toFixed(2)}\nRemaining balance: USD ${finalTourFee.toFixed(2)}\nBooking code: ${bookingCode}\n\nYou can pay securely online from the next screen.\n\nEton Safaris`,
    });

    return NextResponse.json({
      ok: true,
      bookingId: booking?.id || null,
      tour: quote.tour || '',
      finalTourFee,
      bookingCode,
    });
  } catch (error) {
    console.error('[Quote] Accept failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not accept quotation' },
      { status: 500 }
    );
  }
}
