import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE } from '@/lib/admin-session-cookie';
import { adminInbox, EMAIL_FROM, sendEmail } from '@/lib/email';

export async function POST(request: Request) {
  const cookie = request.headers.get('cookie') || '';
  const hasAdmin = cookie.split(';').some((part) => part.trim() === `${ADMIN_SESSION_COOKIE}=1`);
  if (process.env.NODE_ENV === 'production' && !hasAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const to = adminInbox();
  const result = await sendEmail({
    title: 'Eton Safaris inquiry demo',
    message:
      'This is a demo inquiry email from the website pipeline. If you received this, Resend accepted the message for delivery.',
    to: [to],
    category: 'inquiry',
    html: `<p>Demo inquiry from the Eton Safaris website.</p><p>Guest: Demo Guest</p><p>Email: ${to}</p><p>Message: Please confirm this test inquiry arrived.</p>`,
  });

  return NextResponse.json({
    ok: result.ok,
    emailed: result.emailed,
    from: 'from' in result ? result.from : EMAIL_FROM,
    to: 'to' in result ? result.to : [to],
    id: 'id' in result ? result.id : undefined,
    reason: 'reason' in result ? result.reason : undefined,
    error: 'error' in result ? result.error : undefined,
    status: 'status' in result ? result.status : undefined,
    provider: 'Resend',
    note: result.emailed
      ? 'Resend accepted the message. Check the inbox and spam folder.'
      : 'No provider delivery was attempted or Resend rejected it.',
  });
}
