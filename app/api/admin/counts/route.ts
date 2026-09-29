export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

import type { PoolClient } from 'pg';
import { NextResponse } from 'next/server';
import { AGENT_TABLES, isMissingTable } from '@/lib/agent-tables';
import { ADMIN_SESSION_COOKIE } from '@/lib/admin-session-cookie';
import { requireAdminUser } from '@/lib/require-admin';
import { peekAdminCountsCache, writeAdminCountsCache } from '@/lib/admin-counts-server-cache';
import { isPgTooManyClientsError, withPgRetry } from '@/lib/pg-retry';
import { withAdminPgRoute } from '@/lib/admin-pg-route';

const TABLE_ALIASES: Record<string, string[]> = {
  quotations_inquiries: ['quotations_inquiries', 'quotations'],
  inquiries: ['inquiries', 'contact_inquiries'],
  quotations: ['quotations', 'quotations_inquiries'],
  contact_inquiries: ['contact_inquiries', 'inquiries'],
  national_park: ['national_park', 'national_parks', 'parks'],
  keywords: ['keywords', 'keyword', 'seo_keywords'],
};

async function allowAdmin(request: Request) {
  const cookie = request.headers.get('cookie') || '';
  if (cookie.split(';').some((part) => part.trim() === `${ADMIN_SESSION_COOKIE}=1`)) {
    return true;
  }
  const auth = await requireAdminUser(request);
  return auth.ok;
}

function quoteTable(name: string) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) throw new Error(`Invalid table name: ${name}`);
  return `"${name}"`;
}

async function countWithClient(client: PoolClient, name: string) {
  try {
    const result = await client.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM ${quoteTable(name)}`
    );
    return Number(result.rows[0]?.count || 0);
  } catch (error) {
    if (error instanceof Error && isMissingTable(error.message)) return null;
    throw error;
  }
}

async function countTableWithClient(
  client: PoolClient,
  table: string,
  aliases: string[] = []
) {
  if (table === 'registered_agents') {
    let total = 0;
    for (const name of AGENT_TABLES) {
      const count = await countWithClient(client, name);
      if (count != null) total += count;
    }
    return total;
  }

  const names = Array.from(new Set([table, ...(TABLE_ALIASES[table] || []), ...aliases].filter(Boolean)));
  for (const name of names) {
    const count = await countWithClient(client, name);
    if (count != null) return count;
  }
  return 0;
}

export async function POST(request: Request) {
  if (!(await allowAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { items?: { id: string; table: string; aliases?: string[] }[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    return NextResponse.json({ counts: {} });
  }

  const cached = peekAdminCountsCache();
  if (cached) {
    return NextResponse.json({ counts: cached, cached: true });
  }

  try {
    const counts = await withPgRetry(
      () =>
        withAdminPgRoute(async (client) => {
          const result: Record<string, number> = {};
          for (const item of items) {
            if (!item?.id || !item?.table) continue;
            try {
              result[item.id] = await countTableWithClient(client, item.table, item.aliases || []);
            } catch (error) {
              console.error(`[Admin] Could not count ${item.table}:`, error);
              result[item.id] = 0;
            }
          }
          return result;
        }),
      6
    );
    writeAdminCountsCache(counts);
    return NextResponse.json({ counts });
  } catch (error) {
    console.error('[Admin] Counts batch failed:', error);
    const message = isPgTooManyClientsError(error)
      ? 'Database is busy. Counts will refresh shortly.'
      : error instanceof Error
        ? error.message
        : 'Could not load counts';
    return NextResponse.json({ error: message, counts: {} }, { status: 503 });
  }
}
