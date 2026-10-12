export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE } from '@/lib/admin-session-cookie';
import { inviteStaffUser } from '@/lib/invite-staff';
import { requireAdminUser } from '@/lib/require-admin';

async function allowAdmin(request: Request) {
  const cookie = request.headers.get('cookie') || '';
  if (cookie.split(';').some((part) => part.trim() === `${ADMIN_SESSION_COOKIE}=1`)) {
    return true;
  }
  const auth = await requireAdminUser(request);
  return auth.ok;
}

export async function POST(request: Request) {
  if (!(await allowAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized. Sign in to the dashboard first.' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { email?: string; role?: string; name?: string };
    const email = String(body.email || '').trim().toLowerCase();
    const role = String(body.role || 'Limited Access (User)').trim();
    if (!email.includes('@')) {
      return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
    }

    const origin = (process.env.NEXT_PUBLIC_SITE_URL || request.headers.get('origin') || '').replace(/\/$/, '');
    const result = await inviteStaffUser({
      email,
      role,
      name: body.name,
      origin,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      emailed: result.emailed,
      alreadyExists: Boolean(result.alreadyExists),
      table: result.table,
      inviteUrl: result.inviteUrl,
    });
  } catch (error) {
    console.error('[Staff invite] Failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not send the invite.' },
      { status: 500 }
    );
  }
}
