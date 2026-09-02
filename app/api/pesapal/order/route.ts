export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { SITE } from '@/lib/collections';
import { getPesapalIpnId, isPesapalLive, normalizePhone, pesapalPublicSiteUrl, pesapalRequest } from '@/lib/pesapal';
import { createAdminClient } from '@/lib/supabase/admin';
import { saveWithColumnFallback } from '@/lib/supabase-save';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      amount?: number | string;
      email?: string;
      phone?: string;
      name?: string;
      currency?: string;
      description?: string;
      reference?: string;
      bookingId?: string;
    };

    const email = String(body.email || '').trim();
    const phone = normalizePhone(String(body.phone || '').trim());
    const currency = String(body.currency || 'USD').toUpperCase();
    const allowed = new Set(['USD', 'UGX', 'KES', 'EUR', 'GBP', 'TZS']);
    let amount = Number(body.amount);
    const bookingId = String(body.bookingId || '').trim();

    if (!email.includes('@')) {
      return NextResponse.json({ error: 'Guest email is required' }, { status: 400 });
    }
    if (!phone) {
      return NextResponse.json({ error: 'Guest phone is required' }, { status: 400 });
    }
    if (!allowed.has(currency)) {
      return NextResponse.json({ error: `Unsupported currency ${currency}` }, { status: 400 });
    }

    if (bookingId) {
      const supabase = createAdminClient();
      const { data: booking } = await supabase.from('bookings').select('*').eq('id', bookingId).maybeSingle();
      if (!booking) {
        return NextResponse.json({ error: 'Booking not found for this payment.' }, { status: 400 });
      }
      const remaining = Number(booking.remaining_balance);
      const total = Number(booking.final_tour_price || booking.total_price);
      const due =
        Number.isFinite(remaining) && remaining > 0
          ? remaining
          : Number.isFinite(total) && total > 0
            ? total
            : 0;
      if (due > 0) {
        amount = Number.isFinite(amount) && amount > 0 && amount <= due + 0.01 ? amount : due;
      }
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
    }

    const siteUrl = pesapalPublicSiteUrl();
    const callbackUrl = `${siteUrl}/payment?status=complete`;
    const publicIpn = process.env.PESAPAL_IPN_URL || `${siteUrl}/api/pesapal/ipn`;

    const ipnId = await getPesapalIpnId(publicIpn);
    if (!ipnId) {
      return NextResponse.json(
        { error: 'Pesapal IPN registration failed. Register an HTTPS IPN URL in the Pesapal live dashboard, then set PESAPAL_IPN_ID.' },
        { status: 500 }
      );
    }

    const reference = body.reference || `ETON-${Date.now()}`;
    const names = String(body.name || 'Guest').trim().split(/\s+/);
    const order = await pesapalRequest('/Transactions/SubmitOrderRequest', {
      method: 'POST',
      body: JSON.stringify({
        id: reference,
        currency,
        amount,
        description: (body.description || 'Eton Safaris safari payment').slice(0, 100),
        callback_url: callbackUrl,
        notification_id: ipnId,
        billing_address: {
          email_address: email,
          phone_number: phone,
          country_code: 'UG',
          first_name: names[0] || 'Guest',
          last_name: names.slice(1).join(' ') || 'Safari',
        },
      }),
    });

    const trackingId = String(order.order_tracking_id || order.orderTrackingId || '');
    if (trackingId || bookingId) {
      try {
        const supabase = createAdminClient();
        await saveWithColumnFallback(
          'pesapal_payments',
          {
            order_tracking_id: trackingId || null,
            booking_id: bookingId || null,
          },
          { eq: { column: 'reference', value: reference }, client: supabase }
        );
      } catch (error) {
        console.error('[Pesapal] Could not store tracking id on payment:', error);
      }
    }

    return NextResponse.json({
      ok: true,
      reference,
      amount,
      booking_id: bookingId || null,
      redirect_url: order.redirect_url || order.redirectUrl,
      order_tracking_id: trackingId,
      merchant_email: SITE.email,
      sandbox: !isPesapalLive(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pesapal order failed';
    console.error('[Pesapal] Order error:', error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
