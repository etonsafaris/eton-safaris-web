import { NextResponse } from 'next/server';
import { AGENT_TABLES, isMissingTable } from '@/lib/agent-tables';
import { ADMIN_SESSION_COOKIE } from '@/lib/admin-session-cookie';
import { requireAdminUser } from '@/lib/require-admin';
import { createPrivilegedClient } from '@/lib/supabase/admin';
import { bearerTokenFromRequest, createWriteClient, hasServiceRoleKey } from '@/lib/supabase/request-client';
import type { SupabaseClient } from '@supabase/supabase-js';

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

async function countWithMode(
  client: SupabaseClient,
  name: string,
  mode: 'exact' | 'estimated' | 'planned'
) {
  for (const column of ['id', '*'] as const) {
    const { count, error } = await client.from(name).select(column, { count: mode, head: true });
    if (!error && typeof count === 'number') return count;
    if (error && isMissingTable(error.message)) return null;
  }
  return null;
}

async function countTable(client: SupabaseClient, table: string, aliases: string[] = []) {
  if (table === 'registered_agents') {
    let total = 0;
    for (const name of AGENT_TABLES) {
      const exact = await countWithMode(client, name, 'exact');
      if (exact != null) total += exact;
      else {
        const estimated = await countWithMode(client, name, 'estimated');
        if (estimated != null) total += estimated;
      }
    }
    return total;
  }

  const names = Array.from(new Set([table, ...(TABLE_ALIASES[table] || []), ...aliases].filter(Boolean)));
  for (const name of names) {
    const exact = await countWithMode(client, name, 'exact');
    if (exact != null) return exact;

    const estimated = await countWithMode(client, name, 'estimated');
    if (estimated != null) return estimated;

    const planned = await countWithMode(client, name, 'planned');
    if (planned != null) return planned;
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
    const client = hasServiceRoleKey()
      ? createPrivilegedClient()
      : createWriteClient(bearerTokenFromRequest(request));

    const counts: Record<string, number> = {};
    await mapInChunks(items, async (item) => {
      if (!item?.id || !item?.table) return;
      counts[item.id] = await countTable(client, item.table, item.aliases || []);
    });

    return NextResponse.json({ counts });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load counts' },
      { status: 500 }
    );
  }
}
