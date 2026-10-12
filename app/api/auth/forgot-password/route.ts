export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { deliverIncomingAlert } from '@/lib/deliver-alert';
import { findAgentRecord } from '@/lib/find-agent';
import { isOwnerAdminEmail } from '@/lib/inbox';
import { SITE } from '@/lib/collections';
import { createPasswordResetToken } from '@/lib/password-reset';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = String(body.email || '').trim().toLowerCase();
    if (!email.includes('@')) {
      return NextResponse.json({ error: 'Enter the email address on your account.' }, { status: 400 });
    }

    const origin = (process.env.NEXT_PUBLIC_SITE_URL || request.headers.get('origin') || SITE.url || '').replace(/\/$/, '');
    const configuredEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const client = createAdminClient();
    const found = await findAgentRecord(client, { email });
    const owner = isOwnerAdminEmail(email) && email === configuredEmail;
    if (!found && !owner) {
      return NextResponse.json({
        ok: true,
        emailed: false,
        message: 'If that email has an account, a reset link is on its way.',
      });
    }

    const token = createPasswordResetToken(email);
    const link = `${origin}/login/reset?token=${encodeURIComponent(token)}`;
    const delivered = await deliverIncomingAlert({
      title: `Reset your ${SITE.name} password`,
      message: `A password reset was requested for ${email}.`,
      category: 'system',
      guestEmail: email,
      sendToGuest: true,
      emailAdmin: false,
      recordDashboard: false,
      guestTitle: `Reset your ${SITE.name} password`,
      guestMessage: `Hello,\n\nUse this link within 1 hour to choose a new password:\n${link}\n\nIf you did not ask for this, you can ignore the email.`,
    });

    if (!delivered.guestEmailed) {
      return NextResponse.json(
        { error: 'The reset email could not be sent. Check the email service, then try again.' },
        { status: 503 }
      );
    }

    return NextResponse.json({
      ok: true,
      emailed: true,
      message: 'Password reset email sent. Check your inbox.',
    });
  } catch (error) {
    console.error('[Auth] forgot-password failed:', error);
    return NextResponse.json({ error: 'Could not start a password reset.' }, { status: 503 });
  }
}
