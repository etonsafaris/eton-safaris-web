// Aiven PostgreSQL admin authentication (migrated from Supabase)
import { NextResponse } from 'next/server';
import { agentIsActive, isStaffRole } from '@/lib/find-agent';
import { isOwnerAdminEmail } from '@/lib/inbox';
import { decodeJwtPayload, emailFromJwtPayload } from '@/lib/supabase/jwt-payload';
import { queryRows } from '@/lib/supabase/pool';

const AGENT_TABLES = ['registered_agents', 'Agent'] as const;

async function findStaffAgentByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes('@')) return null;

  for (const table of AGENT_TABLES) {
    try {
      const rows = await queryRows<Record<string, unknown>>(
        `SELECT * FROM "${table}" WHERE lower(trim(email)) = $1 LIMIT 1`,
        [normalized]
      );
      const row = rows[0];
      if (!row) continue;
      if (isOwnerAdminEmail(String(row.email || row.Email || ''))) return row;
      if (isStaffRole(row.role) && agentIsActive(row)) return row;
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

  if (!process.env.DATABASE_URL) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Server is not configured' }, { status: 500 }),
    };
  }

  const payload = decodeJwtPayload(token);
  const email = emailFromJwtPayload(payload);
  const sub = String(payload?.sub || '').trim();

  if (email && isOwnerAdminEmail(email)) {
    return { ok: true, user: { email, id: sub || email } };
  }

  try {
    if (email || sub) {
      const profiles = await queryRows<Record<string, unknown>>(
        `SELECT * FROM profiles
         WHERE ($1::text <> '' AND lower(trim(email)) = lower(trim($1)))
            OR ($2::text <> '' AND CAST(id AS text) = $2)
         LIMIT 1`,
        [email, sub]
      );
      if (profiles[0]) {
        return { ok: true, user: profiles[0] };
      }
    }

    if (email) {
      const agent = await findStaffAgentByEmail(email);
      if (agent) return { ok: true, user: agent };
    }
  } catch (error) {
    console.error('[Admin auth] Database lookup failed:', error instanceof Error ? error.message : error);
  }

  return {
    ok: false,
    response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
  };
}
