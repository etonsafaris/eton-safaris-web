import { NextResponse } from 'next/server';
import { deliverIncomingAlert } from '@/lib/deliver-alert';
import { createPrivilegedClient } from '@/lib/supabase/admin';
import { saveWithColumnFallback } from '@/lib/supabase-save';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      author?: string;
      email?: string;
      title?: string;
      rating?: number | string;
      content?: string;
      country?: string;
      honeypot?: string;
    };
    if (body.honeypot?.trim()) {
      return NextResponse.json({ ok: true });
    }

    const author = body.author?.trim() || '';
    const content = body.content?.trim() || '';
    const email = body.email?.trim() || '';
    const rating = Number(body.rating) || 5;
    if (!author || !content) {
      return NextResponse.json({ error: 'Name and review text are required' }, { status: 400 });
    }

    const client = createPrivilegedClient();
    const saved = await saveWithColumnFallback(
      'reviews',
      {
        author,
        email,
        title: body.title?.trim() || 'Website review',
        rating,
        source: 'Website',
        content,
        country: body.country?.trim() || null,
      },
      { client }
    );
    if (saved.error) {
      return NextResponse.json({ error: saved.error.message }, { status: 400 });
    }

    const title = 'New Tour Review';
    const message = `${author} (${email || 'no email'}) rated ${body.title || 'a tour'} ${rating}/5: ${content}`;
    await deliverIncomingAlert({
      title,
      message,
      category: 'review',
      guestEmail: email,
      replyTo: email || undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not save review' },
      { status: 500 }
    );
  }
}
