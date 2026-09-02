export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { adminInbox } from '@/lib/email';
import { requireAdminUser } from '@/lib/require-admin';

export async function GET(request: Request) {
  const auth = await requireAdminUser(request);
  if (!auth.ok) return auth.response;
  return NextResponse.json({
    pesapal: Boolean(process.env.PESAPAL_CONSUMER_KEY && process.env.PESAPAL_CONSUMER_SECRET),
    resend: Boolean(process.env.RESEND_API_KEY),
    pesapalEnv: process.env.PESAPAL_ENV || 'sandbox',
    adminEmail: adminInbox(),
  });
}
