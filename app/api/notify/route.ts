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
      recordDashboard: body.recordDashboard,
      emailAdmin: body.emailAdmin,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Notify API] Failed:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
