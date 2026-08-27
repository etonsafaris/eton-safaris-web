import { NextResponse } from 'next/server';
import { AGENT_TABLES, dedupeAgentRows, isMissingTable } from '@/lib/agent-tables';
import { ADMIN_SESSION_COOKIE } from '@/lib/admin-session-cookie';
import { requireAdminUser } from '@/lib/require-admin';
import { createPrivilegedClient } from '@/lib/supabase/admin';
import { bearerTokenFromRequest, createWriteClient, hasServiceRoleKey, isRlsError, rlsHelpMessage } from '@/lib/supabase/request-client';
import type { RecordRow } from '@/lib/types';
import type { SupabaseClient } from '@supabase/supabase-js';

const ALLOWED_TABLES = new Set([
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

  const table = new URL(request.url).searchParams.get('table')?.trim() || '';
  if (!ALLOWED_TABLES.has(table)) {
    return NextResponse.json({ error: 'Unknown table' }, { status: 400 });
  }

  try {
    // Prefer service role for admin reads so RLS does not empty ops tables.
    const client = hasServiceRoleKey()
      ? createPrivilegedClient()
      : createWriteClient(bearerTokenFromRequest(request));
    if (table === 'registered_agents') {
      const rows = await loadAgentRows(client);
      if (rows.error) {
        return NextResponse.json({ error: rows.error }, { status: 400 });
      }
      return NextResponse.json({ rows: jsonSafeRows(rows.data) });
    }

    const names = TABLE_ALIASES[table] || [table];
    let lastMessage = '';
    for (const name of names) {
      // Schema uses created_date (Base44 legacy), not created_at.
      const orderedByDate = await client.from(name).select('*').order('created_date', { ascending: false });
      if (!orderedByDate.error) {
        return NextResponse.json({ rows: jsonSafeRows(orderedByDate.data || []) });
      }
      const orderedByAt = await client.from(name).select('*').order('created_at', { ascending: false });
      if (!orderedByAt.error) {
        return NextResponse.json({ rows: jsonSafeRows(orderedByAt.data || []) });
      }
      const fallback = await client.from(name).select('*');
      if (!fallback.error) {
        return NextResponse.json({ rows: jsonSafeRows(fallback.data || []) });
      }
      lastMessage = isRlsError(fallback.error.message)
        ? rlsHelpMessage(`Loading ${name}`)
        : fallback.error.message;
    }
    return NextResponse.json({ error: lastMessage || `Could not load ${table}` }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load records' },
      { status: 500 }
    );
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
    const client = createPrivilegedClient();
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
