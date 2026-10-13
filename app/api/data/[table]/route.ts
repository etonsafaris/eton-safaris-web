import { NextResponse } from 'next/server';
import { publicListColumnsFor } from '@/lib/data-server';
import { formatDatabaseErrorMessage } from '@/lib/database-error-message';
import { withPgClient } from '@/lib/supabase/pool';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

const TABLES = new Set([
  'tours',
  'national_park',
  'national_parks',
  'parks',
  'accommodations',
  'explore',
  'countries',
  'categories',
  'keywords',
  'keyword',
  'seo_keywords',
  'safari_updates',
  'pages',
  'landing_pages',
  'reviews',
  'bookings',
  'pesapal_payments',
]);

const HEAVY_TABLES = new Set([
  'tours',
  'safari_updates',
  'accommodations',
  'national_park',
  'national_parks',
  'parks',
  'explore',
  'pages',
]);

const identifier = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
/** Successful ORDER BY per table, so the next read does not probe missing columns. */
const publicOrderCache = new Map<string, string>();

function missingSelectColumn(message?: string) {
  const text = String(message || '');
  const match =
    text.match(/Could not find the '([^']+)' column/i) ||
    text.match(/column ["'`]([^"'`.]+)["'`]/i) ||
    text.match(/column (?:[\w]+\.)?([A-Za-z_][\w]*) does not exist/i);
  return match?.[1] || null;
}

function dropColumnFromSelect(columns: string, column: string) {
  return columns
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part && part !== column && part !== '*')
    .join(',');
}

export async function GET(
  request: Request,
  context: { params: { table: string } }
) {
  const table = context.params.table;
  if (!TABLES.has(table)) {
    return NextResponse.json({ error: 'Unknown data table' }, { status: 400 });
  }

  const url = new URL(request.url);
  const requested = url.searchParams.get('select');
  const listColumns = publicListColumnsFor(table) || publicListColumnsFor(table.replace(/s$/, '')) || '';
  const range = url.searchParams.get('range')?.match(/^(\d+)-(\d+)$/);
  const maxLimit = table === 'tours' ? 96 : HEAVY_TABLES.has(table) ? 200 : 1000;
  const defaultLimit = table === 'tours' ? 48 : 48;
  const limit = range
    ? Math.min(Number(range[2]) - Number(range[1]) + 1, maxLimit)
    : Math.min(Number(url.searchParams.get('limit') || defaultLimit), maxLimit);
  const offset = range ? Number(range[1]) : 0;

  const keyedRow = ['eq.id', 'eq.slug', 'eq.seo_slug'].some((key) => url.searchParams.has(key));
  // One row: SELECT * returns only real columns. Guessing a column list retries the database once per missing name.
  let columns = keyedRow
    ? '*'
    : requested && requested !== '*'
      ? requested
          .split(',')
          .map((column) => column.trim())
          .filter((column) => identifier.test(column))
          .join(', ')
      : listColumns || '*';
  if (columns !== '*') {
    columns = columns
      .split(',')
      .map((column) => column.trim())
      .filter((column) => column && column !== 'seo_schema')
      .join(', ');
  }
  if (!columns) columns = listColumns || 'id';
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
  const orderClauses: string[] = [];
  const rememberedOrder = publicOrderCache.get(table);
  if (rememberedOrder) orderClauses.push(rememberedOrder);
  if (order) {
    const match = /^([a-zA-Z_][a-zA-Z0-9_]*)(?:\.(asc|desc))?$/.exec(order);
    if (match && identifier.test(match[1])) {
      orderClauses.push(` ORDER BY ${match[1]} ${(match[2] || 'asc').toUpperCase()}`);
    }
  }
  for (const clause of [
    ' ORDER BY created_date DESC',
    ' ORDER BY created_at DESC',
    ' ORDER BY id DESC',
    '',
  ]) {
    if (!orderClauses.includes(clause)) orderClauses.push(clause);
  }
  const whereSql = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';

  try {
    return await withPgClient(async (client) => {
      let result;
      for (let attempt = 0; attempt < 24; attempt += 1) {
        let lastError: unknown = null;
        let droppedColumn = false;
        for (const orderSql of orderClauses) {
          try {
            result = await client.query(
              `SELECT ${columns} FROM ${table}${whereSql}${orderSql} OFFSET ${offset} LIMIT ${limit}`,
              params
            );
            publicOrderCache.set(table, orderSql);
            lastError = null;
            break;
          } catch (error) {
            lastError = error;
            const detail = error instanceof Error ? error.message : String(error);
            const missing = columns !== '*' ? missingSelectColumn(detail) : null;
            if (missing && columns.split(',').map((part) => part.trim()).includes(missing)) {
              const next = dropColumnFromSelect(columns, missing);
              if (next && next !== columns) {
                console.warn(`[Aiven] Dropping missing column "${missing}" from ${table} public select.`);
                columns = next;
                droppedColumn = true;
                break;
              }
            }
            if (/column .* does not exist/i.test(detail) && orderSql) {
              continue;
            }
            if (!keyedRow && listColumns && columns !== listColumns && columns !== '*') {
              columns = listColumns;
              droppedColumn = true;
              break;
            }
            throw error;
          }
        }
        if (result) break;
        if (droppedColumn) continue;
        if (lastError) throw lastError;
      }
      if (!result) {
        return NextResponse.json({ data: [], total: 0 }, { status: 200 });
      }
      let total = result.rows.length;
      if (url.searchParams.get('count') === '1' && table !== 'tours') {
        const countResult = await client.query(`SELECT COUNT(*)::int AS total FROM ${table}${whereSql}`, params);
        total = countResult.rows[0]?.total || 0;
      } else if (url.searchParams.get('count') === '1') {
        total = result.rows.length < limit ? offset + result.rows.length : offset + result.rows.length + limit;
      }
      const singleRow = url.searchParams.has('eq.id') || limit === 1;
      return NextResponse.json(
        { data: result.rows, total },
        {
          headers: {
            'Cache-Control':
              singleRow && table !== 'pages' && table !== 'landing_pages' && table !== 'countries'
                ? 'private, no-store'
                : 'public, s-maxage=120, stale-while-revalidate=300',
          },
        }
      );
    });
  } catch (error) {
    console.error(`[Aiven] Public data request failed for ${table}:`, error);
    const message = formatDatabaseErrorMessage(error);
    const status = 503;
    return NextResponse.json(
      { data: [], error: true, message },
      { status }
    );
  }
}
