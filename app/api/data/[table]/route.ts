import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server.ts/server';

export const dynamic = 'force-dynamic';

const TABLES = new Set([
  'tours',
  'national_park',
  'national_parks',
  'parks',
  'accommodations',
  'explore',
  'countries',
  'categories',
  'safari_updates',
  'pages',
  'landing_pages',
  'reviews',
  'bookings',
  'pesapal_payments',
]);

const identifier = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export async function GET(
  request: Request,
  context: { params: { table: string } }
) {
  const table = context.params.table;
  if (!TABLES.has(table)) {
    return NextResponse.json({ error: 'Unknown data table' }, { status: 400 });
  }

  const url = new URL(request.url);
  const select = url.searchParams.get('select') || '*';
  const columns = select === '*'
    ? '*'
    : select.split(',').map((column) => column.trim()).filter((column) => identifier.test(column)).join(', ');
  if (!columns) return NextResponse.json({ error: 'Invalid select columns' }, { status: 400 });

  const params: unknown[] = [];
  const conditions: string[] = [];
  for (const [key, value] of url.searchParams.entries()) {
    const match = /^(eq|ilike)\.([a-zA-Z_][a-zA-Z0-9_]*)$/.exec(key);
    if (!match) continue;
    params.push(match[1] === 'ilike' ? value : value);
    conditions.push(`${match[2]} ${match[1] === 'ilike' ? 'ILIKE' : '='} $${params.length}`);
  }

  const order = url.searchParams.get('order');
  let orderSql = '';
  if (order) {
    const match = /^([a-zA-Z_][a-zA-Z0-9_]*)(?:\.(asc|desc))?$/.exec(order);
    if (match) orderSql = ` ORDER BY ${match[1]} ${(match[2] || 'asc').toUpperCase()}`;
  }
  const range = url.searchParams.get('range')?.match(/^(\d+)-(\d+)$/);
  const limit = range ? Math.min(Number(range[2]) - Number(range[1]) + 1, 1000) : Math.min(Number(url.searchParams.get('limit') || 1000), 1000);
  const offset = range ? Number(range[1]) : 0;
  const whereSql = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';

  let client;
  try {
    client = await db.connect();
    const result = await client.query(
      `SELECT ${columns} FROM ${table}${whereSql}${orderSql} OFFSET ${offset} LIMIT ${limit}`,
      params
    );
    return NextResponse.json({ data: result.rows });
  } catch (error) {
    console.error(`[Aiven] Public data request failed for ${table}:`, error);
    return NextResponse.json({ data: [], error: 'Could not load data' }, { status: 503 });
  } finally {
    client?.release();
  }
}
