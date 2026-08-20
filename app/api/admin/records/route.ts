import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE } from '@/lib/admin-session-cookie';
import { requireAdminUser } from '@/lib/require-admin';
import { bearerTokenFromRequest, createWriteClient, isRlsError, rlsHelpMessage } from '@/lib/supabase/request-client';

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
