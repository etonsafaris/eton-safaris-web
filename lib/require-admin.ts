import { NextResponse } from 'next/server';
import { decodeJwtPayload, emailFromJwtPayload } from '@/lib/supabase/jwt-payload';

type User = { id: string; email: string; user_metadata: Record<string, unknown> };

export async function requireAdminUser(request: Request): Promise<
  { ok: true; user: User } | { ok: false; response: NextResponse }
> {
  const header = request.headers.get('authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const payload = decodeJwtPayload(token);
  const email = emailFromJwtPayload(payload);
  if (email) {
    return {
      ok: true,
      user: {
        id: String(payload?.sub || ''),
        email,
        user_metadata: (payload?.user_metadata as Record<string, unknown>) || {},
      },
    };
  }

  return {
    ok: false,
    response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
  };
}
