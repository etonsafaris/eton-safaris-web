// Aiven PostgreSQL admin authentication (migrated from Supabase)
import { NextResponse } from 'next/server';
import { agentIsActive, isStaffRole } from '@/lib/find-agent';
import { isOwnerAdminEmail } from '@/lib/inbox';
import { decodeJwtPayload, emailFromJwtPayload } from '@/lib/supabase/jwt-payload';
import { isDatabaseConfigured, withPgClient } from '@/lib/supabase/pool';

const AGENT_TABLES = ['registered_agents', 'Agent'] as const;

async function findStaffAgentByEmail(
  email: string,
  client: import('@/lib/supabase/pool').PoolClient
) {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes('@')) return null;

  for (const table of AGENT_TABLES) {
    try {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM "${table}" WHERE lower(trim(email)) = $1 LIMIT 1`,
        [normalized]
      );
      const row = result.rows[0];
      if (!row) continue;
      if (isOwnerAdminEmail(String(row.email || row.Email || ''))) return row;
      if (isStaffRole(row.role) && agentIsActive(row as import('@/lib/types').RecordRow)) return row;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/relation .* does not exist/i.test(message)) {
        console.warn(`[Admin auth] Could not read ${table}:`, message);
      }
    }
  }
  return null;
}

export async function requireAdminUser(request: Request): Promise<
  { ok: true; user: Record<string, unknown> } | { ok: false; response: NextResponse }
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
  const sub = String(payload?.sub || '').trim();

  if (email && isOwnerAdminEmail(email)) {
    return { ok: true, user: { email, id: sub || email } };
  }

  if (!isDatabaseConfigured()) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Server is not configured' }, { status: 500 }),
    };
  }

  try {
    const user = await withPgClient(async (client) => {
      if (email || sub) {
        const profiles = await client.query<Record<string, unknown>>(
          `SELECT * FROM profiles
           WHERE ($1::text <> '' AND lower(trim(email)) = lower(trim($1)))
              OR ($2::text <> '' AND CAST(id AS text) = $2)
           LIMIT 1`,
          [email, sub]
        );
        if (profiles.rows[0]) return profiles.rows[0];
      }
      if (email) {
        const agent = await findStaffAgentByEmail(email, client);
        if (agent) return agent;
      }
      return null;
    });
    if (user) return { ok: true, user };
  } catch (error) {
    console.error('[Admin auth] Database lookup failed:', error instanceof Error ? error.message : error);
  }

  return {
    ok: false,
    response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
  };
}
