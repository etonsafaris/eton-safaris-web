export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { isPesapalLive, pesapalToken } from '@/lib/pesapal';
import { requireAdminUser } from '@/lib/require-admin';

export async function GET(request: Request) {
  const auth = await requireAdminUser(request);
  if (!auth.ok) return auth.response;
  try {
    const token = await pesapalToken();
    const live = isPesapalLive();
    return NextResponse.json({
      ok: true,
      sandbox: !live,
      authenticated: Boolean(token),
      message: live
        ? 'Pesapal live token received. Checkout is using the production merchant account.'
        : 'Pesapal sandbox token received. Checkout is ready to test.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pesapal auth failed';
    console.error('[Pesapal] Test failed:', error);
    return NextResponse.json({ ok: false, authenticated: false, error: message }, { status: 500 });
  }
}
