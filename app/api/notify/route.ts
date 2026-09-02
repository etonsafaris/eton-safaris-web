export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { deliverIncomingAlert } from '@/lib/deliver-alert';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      title?: string;
      message?: string;
      guestEmail?: string;
      category?: string;
      honeypot?: string;
      sendToGuest?: boolean;
      guestTitle?: string;
      guestMessage?: string;
      recordDashboard?: boolean;
      emailAdmin?: boolean;
      html?: string;
    };
    if (body.honeypot?.trim()) {
      return NextResponse.json({ ok: true, emailed: false, recorded: false });
    }

    const result = await deliverIncomingAlert({
      title: body.title?.trim() || 'Eton Safaris notification',
      message: body.message?.trim() || '',
      category: body.category || 'system',
      guestEmail: body.guestEmail?.trim(),
      sendToGuest: Boolean(body.sendToGuest),
      guestTitle: body.guestTitle,
      guestMessage: body.guestMessage,
      // Default true so website inquiries/bookings always create an unread dashboard notice.
      recordDashboard: body.recordDashboard !== false,
      emailAdmin: body.emailAdmin,
      html: body.html,
    });

    return NextResponse.json({
      ...result,
      recorded: Boolean(result.recorded),
      recordError: result.recordError,
    });
  } catch (error) {
    console.error('[Notify API] Failed:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
