export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { deliverIncomingAlert } from '@/lib/deliver-alert';
import { findAgentRecord } from '@/lib/find-agent';
import { isOwnerAdminEmail } from '@/lib/inbox';
import { SITE } from '@/lib/collections';
import { createPasswordResetToken } from '@/lib/password-reset';
import { createAdminClient } from '@/lib/supabase/admin';

function resetPageOrigin(request: Request) {
  const requestOrigin = String(request.headers.get('origin') || '').replace(/\/$/, '');
  if (/localhost|127\.0\.0\.1/i.test(requestOrigin)) return requestOrigin;
  try {
    const host = new URL(requestOrigin || 'https://admin.etonsafaris.com').host.toLowerCase();
    if (host.startsWith('admin.') || /\.vercel\.app$/i.test(host)) return `https://${host}`;
  } catch {
    /* use the admin host below */
  }
  return 'https://admin.etonsafaris.com';
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = String(body.email || '').trim().toLowerCase();
    if (!email.includes('@')) {
      return NextResponse.json({ error: 'Enter the email address on your account.' }, { status: 400 });
    }

    const origin = resetPageOrigin(request);
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
    const html = `<p>Use the button below within 1 hour to choose a new password.</p><p><a href="${link}" style="display:inline-block;background:#00A651;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700;">Set a new password</a></p><p>If the button does not open, copy this address into your browser:<br/><a href="${link}">${link}</a></p>`;
    const delivered = await deliverIncomingAlert({
      title: `Reset your ${SITE.name} password`,
      message: `A password reset was requested for ${email}.`,
      html,
      category: 'system',
      guestEmail: email,
      sendToGuest: true,
      emailAdmin: false,
      recordDashboard: false,
      guestTitle: `Reset your ${SITE.name} password`,
      guestMessage: `Hello,\n\nSet a new password here (this link lasts 1 hour):\n${link}\n\nIf you did not ask for this, you can ignore the email.`,
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
