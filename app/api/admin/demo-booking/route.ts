import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE } from '@/lib/admin-session-cookie';
import { DEMO_BOOKING_CODE } from '@/lib/ensure-demo-booking';
import { requireAdminUser } from '@/lib/require-admin';
import { buildSavePayload } from '@/lib/supabase-payload';
import { saveWithColumnFallback } from '@/lib/supabase-save';
import { bearerTokenFromRequest, createWriteClient } from '@/lib/supabase/request-client';

async function allowAdmin(request: Request) {
  const cookie = request.headers.get('cookie') || '';
  if (cookie.split(';').some((part) => part.trim() === `${ADMIN_SESSION_COOKIE}=1`)) {
    return true;
  }
  const auth = await requireAdminUser(request);
  return auth.ok;
}

export async function POST(request: Request) {
  if (!(await allowAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const client = createWriteClient(bearerTokenFromRequest(request));
    const existing = await client
      .from('bookings')
      .select('id,booking_code')
      .ilike('booking_code', DEMO_BOOKING_CODE)
      .limit(1);
    if (!existing.error && existing.data?.length) {
      return NextResponse.json({ ok: true, created: false, id: existing.data[0].id });
    }

    const travelDate = new Date();
    travelDate.setMonth(travelDate.getMonth() + 3);
    const payload = buildSavePayload('bookings', {
      guest_name: 'Alexandra Bennett',
      email: 'alexandra.bennett@example.com',
      phone: '+1 415 555 0198',
      gender: 'Female',
      tour: '8-Day Uganda Gorilla & Wildlife Safari',
      destination: 'Uganda',
      country: 'United States',
      guests: 2,
      travel_date: travelDate.toISOString().slice(0, 10),
      travel_plans:
        'Couple travel · mid-range lodges · Bwindi gorilla trek + Queen Elizabeth game drives. Prefer morning gorilla briefing.',
      message:
        'DEMO BOOKING — sample complete record for admin preview. Includes deposit paid and remaining balance before travel.',
      status: 'Confirmed',
      payment_status: 'Down Payment Received',
      booking_code: DEMO_BOOKING_CODE,
      final_tour_price: 4850,
      amount_paid: 1455,
      remaining_balance: 3395,
    });

    const saved = await saveWithColumnFallback('bookings', payload, { client });
    if (saved.error) {
      return NextResponse.json({ error: saved.error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, created: true, id: saved.data?.[0]?.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not create demo booking' },
      { status: 500 }
    );
  }
}
