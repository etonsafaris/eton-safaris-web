export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createPrivilegedClient } from '@/lib/supabase/admin';
import { isOwnerAdminEmail } from '@/lib/inbox';

function encode(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const configuredEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const configuredPassword = process.env.ADMIN_PASSWORD || '';
    let row: Record<string, unknown> | undefined;

    // Keep the owner login available during an Aiven outage. Store this only in
    // Vercel encrypted environment variables, never in the repository.
    if (
      isOwnerAdminEmail(email) &&
      email === configuredEmail &&
      configuredPassword.length >= 8 &&
      password === configuredPassword
    ) {
      row = { id: `owner-${email}`, email, role: 'Admin', is_active: true };
    } else {
      const client = createPrivilegedClient();
      const result = await client.from('registered_agents').select('*').ilike('email', email).limit(1);
      if (result.error) throw new Error(result.error.message);
      row = result.data?.[0] as Record<string, unknown> | undefined;
      const storedPassword = String(row?.password || row?.password_hash || '');
      if (!row || !storedPassword || storedPassword !== password) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }
    }

    const user = {
      id: String(row.id || email),
      email,
      user_metadata: {
        role: row.role || '',
        must_change_password: Boolean(row.must_change_password),
      },
    };
    const token = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ ...user, sub: user.id, iat: Math.floor(Date.now() / 1000) })}.aiven`;
    return NextResponse.json({ session: { access_token: token, user } });
  } catch (error) {
    console.error('[Auth] Aiven sign-in failed:', error);
    return NextResponse.json({ error: 'Sign-in service is temporarily unavailable' }, { status: 503 });
  }
}
