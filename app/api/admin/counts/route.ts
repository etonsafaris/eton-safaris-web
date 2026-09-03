export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { AGENT_TABLES, isMissingTable } from '@/lib/agent-tables';
import { ADMIN_SESSION_COOKIE } from '@/lib/admin-session-cookie';
import { requireAdminUser } from '@/lib/require-admin';
import { db } from '@/lib/supabase/server.ts/server';

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

async function countWithMode(name: string) {
  try {
    const result = await db.query<{ count: number }>(`SELECT COUNT(*)::int AS count FROM ${quoteTable(name)}`);
    return Number(result.rows[0]?.count || 0);
  } catch (error) {
    if (error instanceof Error && isMissingTable(error.message)) return null;
    throw error;
  }
}

async function countTable(table: string, aliases: string[] = []) {
  if (table === 'registered_agents') {
    let total = 0;
    for (const name of AGENT_TABLES) {
      const count = await countWithMode(name);
      if (count != null) total += count;
    }
    return total;
  }

  const names = Array.from(new Set([table, ...(TABLE_ALIASES[table] || []), ...aliases].filter(Boolean)));
  for (const name of names) {
    const count = await countWithMode(name);
    if (count != null) return count;
  }
  return 0;
}

async function mapInChunks<T, R>(items: T[], fn: (item: T) => Promise<R>, size = 8) {
  const results: R[] = [];
  for (let index = 0; index < items.length; index += size) {
    const chunk = items.slice(index, index + size);
    results.push(...(await Promise.all(chunk.map(fn))));
  }
  return results;
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

  try {
    const counts: Record<string, number> = {};
    await mapInChunks(items, async (item) => {
      if (!item?.id || !item?.table) return;
      counts[item.id] = await countTable(item.table, item.aliases || []);
    }, 4);

    return NextResponse.json({ counts });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load counts' },
      { status: 500 }
    );
  }
}
