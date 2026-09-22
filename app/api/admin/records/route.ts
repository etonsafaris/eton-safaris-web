export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { AGENT_TABLES, dedupeAgentRows, isMissingTable } from '@/lib/agent-tables';
import { allowAdminRequest } from '@/lib/admin-request-auth';
import {
  ADMIN_PAGE_SIZE_DEFAULT,
  ADMIN_PAGE_SIZE_MAX,
  AdminListQueryError,
  queryAdminRecordById,
  queryAdminTablePage,
} from '@/lib/admin-paginated-list';
import { isPgTooManyClientsError } from '@/lib/pg-retry';
import { adminListColumnsFor } from '@/lib/data-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { saveWithColumnFallback } from '@/lib/supabase-save';
import { bearerTokenFromRequest, createWriteClient, hasServiceRoleKey, isRlsError, rlsHelpMessage } from '@/lib/supabase/request-client';
import type { RecordRow } from '@/lib/types';
type SupabaseClient = any;

const ALLOWED_TABLES = new Set([
  'tours',
  'national_park',
  'accommodations',
  'safari_updates',
  'explore',
  'countries',
  'categories',
  'pages',
  'landing_pages',
  'keywords',
  'Agent',
  'notifications',
  'subscribers',
  'reviews',
  'registered_agents',
  'inquiries',
  'quotations_inquiries',
  'quotations',
  'contact_inquiries',
  'bookings',
  'pesapal_payments',
]);

const TABLE_ALIASES: Record<string, string[]> = {
  quotations_inquiries: ['quotations_inquiries', 'quotations'],
  inquiries: ['inquiries', 'contact_inquiries'],
  quotations: ['quotations', 'quotations_inquiries'],
  contact_inquiries: ['contact_inquiries', 'inquiries'],
};

async function allowAdmin(request: Request) {
  return allowAdminRequest(request);
}

async function loadAgentRows(client: SupabaseClient) {
  const collected: RecordRow[] = [];
  let lastError = '';
  for (const name of AGENT_TABLES) {
    const queried = await client.from(name).select('*');
    if (queried.error) {
      if (!isMissingTable(queried.error.message)) {
        lastError = isRlsError(queried.error.message)
          ? rlsHelpMessage('Loading registered agents')
          : queried.error.message;
      }
      continue;
    }
    collected.push(...(Array.isArray(queried.data) ? (queried.data as unknown as RecordRow[]) : []));
  }
  if (collected.length === 0 && lastError) {
    return { data: [] as RecordRow[], error: lastError };
  }
  return { data: dedupeAgentRows(collected), error: '' };
}

function jsonSafeRows(rows: unknown) {
  return JSON.parse(
    JSON.stringify(rows || [], (_key, value) => (typeof value === 'bigint' ? value.toString() : value))
  );
}

export async function GET(request: Request) {
  if (!(await allowAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const table = url.searchParams.get('table')?.trim() || '';
  if (!ALLOWED_TABLES.has(table)) {
    return NextResponse.json({ error: 'Unknown table' }, { status: 400 });
  }

  const recordId = url.searchParams.get('id')?.trim() || '';
  if (recordId) {
    try {
      const names = TABLE_ALIASES[table] || [table];
      for (const name of names) {
        const row = await queryAdminRecordById(name, recordId);
        if (row) {
          return NextResponse.json({ row: jsonSafeRows([row])[0] });
        }
      }
      return NextResponse.json({ row: null, error: 'Record not found' }, { status: 404 });
    } catch (error) {
      console.error(`[Admin] records GET by id failed for ${table}:`, error);
      return NextResponse.json({ row: null, error: 'Could not load record' }, { status: 500 });
    }
  }

  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const limit = Math.min(
    ADMIN_PAGE_SIZE_MAX,
    Math.max(1, Number(url.searchParams.get('limit')) || ADMIN_PAGE_SIZE_DEFAULT)
  );
  const offset = (page - 1) * limit;
  const filters = {
    country: url.searchParams.get('country')?.trim() || undefined,
    park: url.searchParams.get('park')?.trim() || undefined,
    category: url.searchParams.get('category')?.trim() || undefined,
    q: url.searchParams.get('q')?.trim() || undefined,
  };

  try {
    if (table === 'registered_agents') {
      const client = hasServiceRoleKey()
        ? createAdminClient()
        : createWriteClient(bearerTokenFromRequest(request));
      const rows = await loadAgentRows(client);
      if (rows.error) {
        return NextResponse.json({ error: rows.error, rows: [], total: 0 }, { status: 400 });
      }
      const all = rows.data || [];
      const slice = all.slice(offset, offset + limit);
      return NextResponse.json({
        rows: jsonSafeRows(slice),
        total: all.length,
        page,
        pageSize: limit,
      });
    }

    const names = TABLE_ALIASES[table] || [table];
    const listSelect = adminListColumnsFor(table) || adminListColumnsFor(names[0]) || undefined;
    let lastMessage = '';

    for (const name of names) {
      const result = await queryAdminTablePage(name, {
        limit,
        offset,
        columns: listSelect || adminListColumnsFor(name),
        filters,
      });
      if (result.rows.length > 0 || result.total > 0 || name === names[names.length - 1]) {
        return NextResponse.json({
          rows: jsonSafeRows(result.rows),
          total: result.total,
          page,
          pageSize: limit,
        });
      }
      lastMessage = `No rows in ${name}`;
    }

    console.warn(`[Admin] records GET empty for ${table}:`, lastMessage);
    return NextResponse.json({ rows: [], total: 0, page, pageSize: limit, error: lastMessage });
  } catch (error) {
    const message =
      error instanceof AdminListQueryError || error instanceof Error
        ? error.message
        : 'Could not load records';
    console.error(`[Admin] records GET error for ${table}:`, error);
    const status = isPgTooManyClientsError(error) ? 503 : 500;
    return NextResponse.json(
      { rows: [], total: 0, error: message, retryable: status === 503 },
      { status }
    );
  }
}

export async function POST(request: Request) {
  if (!(await allowAdmin(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = (await request.json()) as { table?: string; id?: string | number | null; payload?: Record<string, unknown> };
    const table = body.table?.trim() || '';
    if (!ALLOWED_TABLES.has(table)) return NextResponse.json({ error: 'Unknown table' }, { status: 400 });
    if (!body.payload || typeof body.payload !== 'object' || Array.isArray(body.payload)) {
      return NextResponse.json({ error: 'A record payload is required' }, { status: 400 });
    }
    const result = await saveWithColumnFallback(table, body.payload, body.id);
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 });
    return NextResponse.json({ data: jsonSafeRows(result.data || []) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not save record' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await allowAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const table = url.searchParams.get('table')?.trim() || '';
  const id = url.searchParams.get('id')?.trim() || '';
  if (!ALLOWED_TABLES.has(table)) {
    return NextResponse.json({ error: 'Unknown table' }, { status: 400 });
  }

  if (!id) {
    return NextResponse.json({ error: 'Record id is required' }, { status: 400 });
  }

  try {
    // Prefer service role so admins can delete bookings even when RLS blocks anon/auth deletes.
    const client = createAdminClient();
    const names = TABLE_ALIASES[table] || [table];
    let lastMessage = '';

    for (const name of names) {
      // Booking delete also clears linked Pesapal payment rows so the panel stays clean.
      if (name === 'bookings') {
        await client.from('pesapal_payments').delete().eq('booking_id', id);
        const asNumber = Number(id);
        if (Number.isFinite(asNumber) && String(asNumber) === id) {
          await client.from('pesapal_payments').delete().eq('booking_id', asNumber);
        }
      }

      const removed = await client.from(name).delete().eq('id', id);
      if (!removed.error) {
        return NextResponse.json({ ok: true, table: name, id });
      }
      // Some tables use uuid/text ids — retry as-is already; try numeric only if it parses.
      const asNumber = Number(id);
      if (Number.isFinite(asNumber) && String(asNumber) === id) {
        const numeric = await client.from(name).delete().eq('id', asNumber);
        if (!numeric.error) {
          return NextResponse.json({ ok: true, table: name, id });
        }
        lastMessage = isRlsError(numeric.error.message)
          ? rlsHelpMessage(`Deleting from ${name}`)
          : numeric.error.message;
      } else {
        lastMessage = isRlsError(removed.error.message)
          ? rlsHelpMessage(`Deleting from ${name}`)
          : removed.error.message;
      }
    }

    return NextResponse.json({ error: lastMessage || `Could not delete from ${table}` }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not delete record' },
      { status: 500 }
    );
  }
}
