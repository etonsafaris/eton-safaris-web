export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE } from '@/lib/admin-session-cookie';
import { deliverIncomingAlert } from '@/lib/deliver-alert';
import { adminInbox, EMAIL_FROM } from '@/lib/email';

async function sendDemo() {
  return deliverIncomingAlert({
    title: 'Eton Safaris demo inquiry',
    message:
      'This is a demo inquiry from the Eton Safaris website. If you received this, website notifications are reaching etonsafaris@gmail.com and the Notifications module.',
    category: 'inquiry',
    replyTo: 'demo.guest@example.com',
    html: `<div style="font-family:Georgia,serif;line-height:1.5;color:#222">
      <p><strong>Demo inquiry from the Eton Safaris website</strong></p>
      <p>Guest: Demo Guest</p>
      <p>Email: demo.guest@example.com</p>
      <p>Message: Please confirm this test arrived in <strong>etonsafaris@gmail.com</strong> and in the dashboard Notifications module.</p>
    </div>`,
  });
}

function payload(result: Awaited<ReturnType<typeof deliverIncomingAlert>>) {
  return {
    ok: result.ok,
    recorded: result.recorded,
    emailed: result.emailed,
    from: result.from || EMAIL_FROM,
    to: result.to || [adminInbox()],
    id: result.id,
    reason: result.reason,
    error: result.emailError || result.recordError,
    provider: 'Resend',
    inbox: adminInbox(),
    note: result.emailed
      ? 'Email accepted. Also check the Notifications module and the spam folder.'
      : result.recorded
        ? 'Saved in Notifications. Email was not delivered — check RESEND_API_KEY and spam.'
        : 'No dashboard row and no email were delivered.',
  };
}

async function handle(request: Request) {
  const cookie = request.headers.get('cookie') || '';
  const hasAdmin = cookie.split(';').some((part) => part.trim() === `${ADMIN_SESSION_COOKIE}=1`);
  if (process.env.NODE_ENV === 'production' && !hasAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await sendDemo();
  return NextResponse.json(payload(result));
}

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  return handle(request);
}
