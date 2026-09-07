export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { deliverIncomingAlert } from '@/lib/deliver-alert';
import { createAdminClient } from '@/lib/supabase/admin';
import { saveWithColumnFallback } from '@/lib/supabase-save';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; honeypot?: string };
    if (body.honeypot?.trim()) {
      return NextResponse.json({ ok: true });
    }
    const email = body.email?.trim().toLowerCase() || '';
    if (!email.includes('@')) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
    }

    const client = createAdminClient();
    const saved = await saveWithColumnFallback('subscribers', { email }, { client });
    if (saved.error) {
      return NextResponse.json({ error: saved.error.message }, { status: 400 });
    }

    const title = 'New Subscriber';
    const message = `${email} subscribed to the newsletter.`;
    await deliverIncomingAlert({
      title,
      message,
      category: 'subscriber',
      guestEmail: email,
      replyTo: email,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not subscribe' },
      { status: 500 }
    );
  }
}
