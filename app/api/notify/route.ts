import { NextResponse } from 'next/server';
import { adminInbox, sendEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      title?: string;
      message?: string;
      guestEmail?: string;
      category?: string;
      honeypot?: string;
    };
    if (body.honeypot?.trim()) {
      return NextResponse.json({ ok: true, emailed: false });
    }
    const title = body.title?.trim() || 'Eton Safaris notification';
    const message = body.message?.trim() || '';
    const recipients = [adminInbox(), body.guestEmail].filter(Boolean) as string[];

    const result = await sendEmail({
      title,
      message,
      to: recipients.length ? recipients : undefined,
      category: body.category,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, emailed: false, error: result.error }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      emailed: result.emailed,
      reason: 'reason' in result ? result.reason : undefined,
      id: 'id' in result ? result.id : undefined,
      from: 'from' in result ? result.from : undefined,
      to: 'to' in result ? result.to : undefined,
    });
  } catch (error) {
    console.error('[Notify API] Failed:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
