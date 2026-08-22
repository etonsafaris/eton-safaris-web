import { NextResponse } from 'next/server';
import { AGENT_TABLES, dedupeAgentRows, isMissingTable } from '@/lib/agent-tables';
import { ADMIN_SESSION_COOKIE } from '@/lib/admin-session-cookie';
import { requireAdminUser } from '@/lib/require-admin';
import { bearerTokenFromRequest, createWriteClient, isRlsError, rlsHelpMessage } from '@/lib/supabase/request-client';
import type { RecordRow } from '@/lib/types';
import type { SupabaseClient } from '@supabase/supabase-js';

const ALLOWED_TABLES = new Set([
  'notifications',
  'subscribers',
  'reviews',
  'registered_agents',
  'inquiries',
  'quotations_inquiries',
  'bookings',
  'pesapal_payments',
]);

async function allowAdmin(request: Request) {
  const cookie = request.headers.get('cookie') || '';
  if (cookie.split(';').some((part) => part.trim() === `${ADMIN_SESSION_COOKIE}=1`)) {
    return true;
  }
  const auth = await requireAdminUser(request);
  return auth.ok;
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
    collected.push(...(((queried.data as RecordRow[] | null) || [])));
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

  const table = new URL(request.url).searchParams.get('table')?.trim() || '';
  if (!ALLOWED_TABLES.has(table)) {
    return NextResponse.json({ error: 'Unknown table' }, { status: 400 });
  }

  try {
    const client = createWriteClient(bearerTokenFromRequest(request));
    if (table === 'registered_agents') {
      const rows = await loadAgentRows(client);
      if (rows.error) {
        return NextResponse.json({ error: rows.error }, { status: 400 });
      }
      return NextResponse.json({ rows: jsonSafeRows(rows.data) });
    }
    const { data, error } = await client.from(table).select('*').order('created_at', { ascending: false });
    if (error) {
      const fallback = await client.from(table).select('*');
      if (fallback.error) {
        const message = isRlsError(fallback.error.message)
          ? rlsHelpMessage(`Loading ${table}`)
          : fallback.error.message;
        return NextResponse.json({ error: message }, { status: 400 });
      }
      return NextResponse.json({ rows: jsonSafeRows(fallback.data || []) });
    }
    return NextResponse.json({ rows: jsonSafeRows(data || []) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load records' },
      { status: 500 }
    );
  }
}
