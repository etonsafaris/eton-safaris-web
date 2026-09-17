export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE } from '@/lib/admin-session-cookie';
import { decodeJwtPayload, emailFromJwtPayload } from '@/lib/supabase/jwt-payload';

function sessionCookieOptions(maxAge = 60 * 60 * 12) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}

export async function POST(request: Request) {
  try {
    const auth = request.headers.get('authorization') || '';
    const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
    if (!token) {
      return NextResponse.json({ error: 'Missing access token' }, { status: 401 });
    }

    const payload = decodeJwtPayload(token);
    const email = emailFromJwtPayload(payload);
    if (!email) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_SESSION_COOKIE, '1', sessionCookieOptions());
    return response;
  } catch (error) {
    console.error('[Admin session] Failed:', error);
    return NextResponse.json({ error: 'Session sync failed' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, '', { ...sessionCookieOptions(0), maxAge: 0 });
  return response;
}
