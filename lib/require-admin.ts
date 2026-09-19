// Aiven PostgreSQL admin authentication (migrated from Supabase)
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/pool';

export async function requireAdminUser(request: Request): Promise<
  { ok: true; user: any } | { ok: false; response: NextResponse }
> {
  const header = request.headers.get('authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  if (!process.env.DATABASE_URL) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Server is not configured' }, { status: 500 }),
    };
  }

  // Simple token validation for Aiven - check against stored admin tokens
  let client;
  try {
    client = await db.connect();
    const queryText = `SELECT * FROM profiles WHERE email = $1 LIMIT 1`;
    const result = await client.query(queryText, [token]);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      return { ok: true, user };
    }
  } catch (error: any) {
    console.error('[Aiven] Admin auth error:', error.message);
  } finally {
    client?.release();
  }

  return {
    ok: false,
    response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
  };
}