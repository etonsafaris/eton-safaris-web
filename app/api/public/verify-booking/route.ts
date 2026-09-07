export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { code?: string };
    const code = String(body.code || '').trim().toUpperCase();
    if (!code) {
      return NextResponse.json({ error: 'Enter your booking or payment code.' }, { status: 400 });
    }

    const client = createAdminClient();
    const { data: byCode } = await client.from('bookings').select('*').ilike('booking_code', code).limit(1);
    let booking = (byCode || [])[0] || null;

    if (!booking) {
      const { data: byRef } = await client.from('pesapal_payments').select('*').ilike('reference', code).limit(1);
      let payment = (byRef || [])[0] as { booking_id?: string } | undefined;
      if (!payment) {
        const { data: byTrack } = await client
          .from('pesapal_payments')
          .select('*')
          .ilike('order_tracking_id', code)
          .limit(1);
        payment = (byTrack || [])[0] as { booking_id?: string } | undefined;
      }
      if (payment?.booking_id) {
        const { data } = await client.from('bookings').select('*').eq('id', payment.booking_id).maybeSingle();
        booking = data;
      }
    }

    if (!booking) {
      return NextResponse.json({ error: 'Invalid booking or payment code. Check the spelling or contact support.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, booking });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not verify this booking' },
      { status: 500 }
    );
  }
}
