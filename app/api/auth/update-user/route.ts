export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { allowAdminRequest } from '@/lib/admin-request-auth';
import { isOwnerAdminEmail } from '@/lib/inbox';
import { createAdminClient } from '@/lib/supabase/admin';
import { decodeJwtPayload, emailFromJwtPayload } from '@/lib/supabase/jwt-payload';

function encodeSegment(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function mintSession(user: { id: string; email: string; user_metadata: Record<string, unknown> }) {
  const access_token = `${encodeSegment({ alg: 'none', typ: 'JWT' })}.${encodeSegment({
    ...user,
    sub: user.id,
    iat: Math.floor(Date.now() / 1000),
  })}.aiven`;
  return { access_token, user };
}

function bearerToken(request: Request) {
  const header = request.headers.get('authorization') || '';
  return header.replace(/^Bearer\s+/i, '').trim();
}

export async function POST(request: Request) {
  if (!(await allowAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = bearerToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Missing access token' }, { status: 401 });
  }

  const payload = decodeJwtPayload(token);
  const currentEmail = emailFromJwtPayload(payload);
  const id = String(payload?.sub || payload?.id || '').trim();
  if (!currentEmail || !id) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
    data?: Record<string, unknown>;
  };

  const nextEmail = String(body.email || currentEmail).trim().toLowerCase();
  const nextPassword = String(body.password || '').trim();
  if (nextPassword && nextPassword.length < 8) {
    return NextResponse.json({ error: 'Use at least 8 characters.' }, { status: 400 });
  }

  const priorMeta =
    payload?.user_metadata && typeof payload.user_metadata === 'object' && !Array.isArray(payload.user_metadata)
      ? (payload.user_metadata as Record<string, unknown>)
      : {};
  const user_metadata: Record<string, unknown> = {
    ...priorMeta,
    ...(body.data && typeof body.data === 'object' ? body.data : {}),
  };

  const client = createAdminClient();
  const isOwnerSession = isOwnerAdminEmail(currentEmail) && id.startsWith('owner-');

  if (!isOwnerSession) {
    try {
      const lookup = await client.from('registered_agents').select('*').ilike('email', currentEmail).limit(1);
      const row = lookup.data?.[0] as Record<string, unknown> | undefined;
      if (row?.id != null) {
        const patch: Record<string, unknown> = {};
        if (nextPassword) {
          patch.password = nextPassword;
          patch.must_change_password = false;
          user_metadata.must_change_password = false;
        }
        if (nextEmail !== currentEmail) patch.email = nextEmail;
        if (Object.keys(patch).length) {
          await client.from('registered_agents').update(patch).eq('id', row.id);
        }
      }
    } catch (error) {
      console.error('[Auth] update-user agent row failed:', error);
      return NextResponse.json({ error: 'Could not update account in the database.' }, { status: 503 });
    }

    try {
      const profilePatch: Record<string, unknown> = {
        email: nextEmail,
        ...(user_metadata.full_name != null ? { full_name: user_metadata.full_name } : {}),
        ...(user_metadata.phone != null ? { phone: user_metadata.phone } : {}),
      };
      if (user_metadata.must_change_password === false) {
        profilePatch.must_change_password = false;
      }
      await client.from('profiles').update(profilePatch).eq('id', id);
    } catch {
      /* profiles table is optional */
    }
  } else if (nextPassword) {
    user_metadata.must_change_password = false;
  }

  const user = { id, email: nextEmail, user_metadata };
  const session = mintSession(user);
  return NextResponse.json({ user, session });
}
