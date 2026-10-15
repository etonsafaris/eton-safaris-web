import type { PoolClient } from '@/lib/supabase/pool';
import { adminListColumnsFor } from '@/lib/data-server';
import { isPgTooManyClientsError, withPgRetry } from '@/lib/pg-retry';
import { withAdminPgRoute } from '@/lib/admin-pg-route';
import type { RecordRow } from '@/lib/types';

export class AdminListQueryError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'AdminListQueryError';
    if (options?.cause) (this as Error & { cause?: unknown }).cause = options.cause;
  }
}

function isTransientPgError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    isPgTooManyClientsError(error) ||
    /timeout|timed out|connection terminated|ECONNRESET|ENOTFOUND|ETIMEDOUT|sorry, too many clients/i.test(
      message
    )
  );
}

export const ADMIN_PAGE_SIZE_DEFAULT = 50;
export const ADMIN_PAGE_SIZE_MAX = 50;

const HEAVY_ADMIN_TABLES = new Set([
  'tours',
  'accommodations',
  'national_park',
  'safari_updates',
  'explore',
  'bookings',
  'inquiries',
  'quotations_inquiries',
  'quotations',
  'contact_inquiries',
  'pesapal_payments',
  'registered_agents',
  'subscribers',
  'notifications',
  'countries',
  'categories',
  'pages',
  'landing_pages',
  'keywords',
  'reviews',
]);

export type AdminListFilters = {
  country?: string;
  park?: string;
  category?: string;
  /** Safari Updates use standard or language. Tours use standard or google. */
  postType?: 'standard' | 'language' | 'google';
  /** Server-side search (Dav-style: filter in SQL, not in the browser). */
  q?: string;
};

function searchColumnsFor(table: string): string[] {
  const byTable: Record<string, string[]> = {
    tours: ['title', 'slug', 'seo_slug', 'country', 'category'],
    safari_updates: ['title', 'slug', 'seo_slug', 'excerpt', 'country'],
    countries: ['name', 'slug', 'seo_slug', 'tagline'],
    categories: ['name', 'slug', 'seo_slug', 'country'],
    national_park: ['name', 'slug', 'seo_slug', 'country', 'location'],
    accommodations: ['name', 'slug', 'seo_slug', 'country', 'location'],
    explore: ['title', 'slug', 'seo_slug', 'country', 'location'],
    gallery: ['title', 'caption', 'alt_text'],
    pages: ['title', 'post_title', 'slug', 'seo_slug'],
    landing_pages: ['title', 'post_title', 'slug', 'seo_slug', 'country'],
    keywords: ['keywords', 'keyword', 'country', 'category'],
    reviews: ['customer_name', 'tour_title', 'review_text', 'author', 'title'],
    bookings: ['customer_name', 'customer_email', 'tour_title', 'country', 'booking_code'],
    subscribers: ['email'],
    notifications: ['title', 'message', 'type'],
    pesapal_payments: ['last_ipn_tracking_id', 'last_payment_status', 'environment', 'last_error'],
    quotations_inquiries: ['client_name', 'email', 'special_requests', 'travel_destination'],
    quotations: ['client_name', 'email', 'special_requests', 'travel_destination'],
    contact_inquiries: ['client_name', 'email', 'special_requests'],
    inquiries: ['client_name', 'email', 'special_requests', 'travel_destination'],
    registered_agents: ['name', 'username', 'email', 'phone', 'company', 'country'],
  };
  return byTable[table] || ['title', 'name', 'slug', 'email'];
}

function quoteTable(name: string) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Invalid table name: ${name}`);
  }
  return `"${name}"`;
}

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

function sanitizeFilter(value: string) {
  return String(value || '')
    .trim()
    .replace(/[%*,()'"\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function countryMatchColumns(table: string): string[] {
  const byTable: Record<string, string[]> = {
    tours: ['country'],
    national_park: ['country', 'location'],
    accommodations: ['country', 'location', 'national_park_name'],
    explore: ['country', 'location'],
    safari_updates: ['country'],
    categories: ['country'],
    landing_pages: ['country'],
    keywords: ['country'],
    reviews: ['country'],
    bookings: ['country', 'destination'],
    countries: ['name', 'slug'],
    quotations_inquiries: ['destination'],
    quotations: ['destination'],
    inquiries: ['destination'],
    registered_agents: ['country'],
    pesapal_payments: [],
    subscribers: [],
    notifications: [],
    contact_inquiries: [],
  };
  return byTable[table] || ['country', 'destination'];
}

/** Match the same country fields the public site uses (slug/name variants). */
function countryFilterSql(table: string, paramIndex: number) {
  const columns = countryMatchColumns(table);
  const parts = columns.map((column) => `COALESCE("${column}"::text, '') ILIKE $${paramIndex}`);
  return parts.length ? `(${parts.join(' OR ')})` : `country ILIKE $${paramIndex}`;
}

function parkFilterSql(table: string, paramIndex: number) {
  if (table === 'accommodations') {
    return `(COALESCE(national_park_name::text, '') ILIKE $${paramIndex} OR COALESCE(location::text, '') ILIKE $${paramIndex})`;
  }
  return `(COALESCE(national_park_name::text, '') ILIKE $${paramIndex} OR COALESCE(location::text, '') ILIKE $${paramIndex})`;
}

const TABLES_WITH_CATEGORY = new Set([
  'tours',
  'safari_updates',
  'categories',
  'keywords',
  'notifications',
]);

function buildWhere(filters: AdminListFilters | undefined, table: string) {
  const params: unknown[] = [];
  const clauses: string[] = [];
  const country = sanitizeFilter(filters?.country || '');
  const category = sanitizeFilter(filters?.category || '');
  const park = sanitizeFilter(filters?.park || '');
  const q = sanitizeFilter(filters?.q || '');
  if (country && countryMatchColumns(table).length) {
    params.push(`%${country}%`);
    clauses.push(countryFilterSql(table, params.length));
  }
  if (category && TABLES_WITH_CATEGORY.has(table)) {
    params.push(`%${category}%`);
    clauses.push(`category ILIKE $${params.length}`);
  }
  if (park) {
    params.push(`%${park}%`);
    const index = params.length;
    clauses.push(parkFilterSql(table, index));
  }
  if (q) {
    params.push(`%${q}%`);
    const index = params.length;
    const parts = searchColumnsFor(table).map((column) => `COALESCE("${column}"::text, '') ILIKE $${index}`);
    if (parts.length) clauses.push(`(${parts.join(' OR ')})`);
  }
  if (table === 'safari_updates' && filters?.postType === 'language') {
    clauses.push(`COALESCE(post_type::text, '') ILIKE '%language%'`);
  } else if (table === 'safari_updates' && filters?.postType === 'standard') {
    clauses.push(`COALESCE(post_type::text, '') NOT ILIKE '%language%'`);
  }
  if (table === 'tours' && filters?.postType === 'google') {
    clauses.push(`COALESCE(post_type::text, '') ILIKE '%google%'`);
  } else if (table === 'tours' && filters?.postType === 'standard') {
    clauses.push(`COALESCE(post_type::text, '') NOT ILIKE '%google%'`);
  }
  const sql = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
  return { sql, params };
}

function orderSqlCandidates(table: string): string[] {
  if (table === 'safari_updates') {
    return [
      'COALESCE("published_at", "created_date", "created_at", "updated_date")',
      '"published_at"',
      '"created_date"',
      '"created_at"',
      '"id"',
    ];
  }
  return ['"created_date"', '"created_at"', '"published_at"', '"publish_date"', '"id"'];
}

const listShapeCache = new Map<string, { columns: string; orderSql: string }>();

async function runListQuery(
  client: PoolClient,
  table: string,
  columns: string,
  whereSql: string,
  params: unknown[],
  orderSql: string,
  offset: number,
  limit: number
) {
  const quoted = quoteTable(table);
  const off = params.length + 1;
  const lim = params.length + 2;
  const dataRes = await client.query(
    `SELECT ${columns}, COUNT(*) OVER()::int AS __total FROM ${quoted}${whereSql} ORDER BY ${orderSql} DESC NULLS LAST OFFSET $${off} LIMIT $${lim}`,
    [...params, offset, limit]
  );
  const raw = dataRes.rows as RecordRow[];
  if (raw.length) {
    const total = Number(raw[0].__total || raw.length);
    const rows = raw.map((row) => {
      const next = { ...row };
      delete next.__total;
      return next;
    });
    return { rows, total };
  }
  const countRes = await client.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM ${quoted}${whereSql}`,
    params
  );
  return { rows: [] as RecordRow[], total: Number(countRes.rows[0]?.total || 0) };
}

/**
 * One pool client, always released in `withAdminPgRoute` — server-side LIMIT/OFFSET for admin grids.
 */
export async function queryAdminTablePage(
  table: string,
  options: {
    limit?: number;
    offset?: number;
    columns?: string;
    filters?: AdminListFilters;
  }
): Promise<{ rows: RecordRow[]; total: number }> {
  const limit = Math.min(
    ADMIN_PAGE_SIZE_MAX,
    Math.max(1, options.limit ?? ADMIN_PAGE_SIZE_DEFAULT)
  );
  const offset = Math.max(0, options.offset ?? 0);
  const requestedColumns = options.columns || adminListColumnsFor(table) || '*';
  const shapeKey = `${table}|${requestedColumns}`;
  const remembered = listShapeCache.get(shapeKey);
  let columns = remembered?.columns || requestedColumns;
  const orderColumns = remembered
    ? [remembered.orderSql, ...orderSqlCandidates(table).filter((sql) => sql !== remembered.orderSql)]
    : orderSqlCandidates(table);
  let activeFilters = options.filters;
  let where = buildWhere(activeFilters, table);

  return withPgRetry(async () => {
    try {
      return await withAdminPgRoute(async (client) => {
        for (let attempt = 0; attempt < 10; attempt += 1) {
          let droppedColumn = false;
          for (const orderSql of orderColumns) {
            try {
              const page = await runListQuery(
                client,
                table,
                columns,
                where.sql,
                [...where.params],
                orderSql,
                offset,
                limit
              );
              listShapeCache.set(shapeKey, { columns, orderSql });
              return page;
            } catch (error) {
              const detail = error instanceof Error ? error.message : String(error);
              if (activeFilters?.postType && /post_type/i.test(detail) && /does not exist/i.test(detail)) {
                const { postType: _ignored, ...rest } = activeFilters;
                activeFilters = rest;
                where = buildWhere(activeFilters, table);
                droppedColumn = true;
                break;
              }
              const missing = missingSelectColumn(detail);
              if (missing && where.sql.toLowerCase().includes(`"${missing.toLowerCase()}"`)) {
                where = { sql: '', params: [] };
                activeFilters = undefined;
                droppedColumn = true;
                break;
              }
              if (missing && columns.split(',').map((part) => part.trim()).includes(missing)) {
                const next = dropColumnFromSelect(columns, missing);
                if (next && next !== columns) {
                  columns = next;
                  droppedColumn = true;
                  break;
                }
              }
              if (/column .* does not exist/i.test(detail)) {
                continue;
              }
              throw error;
            }
          }
          if (!droppedColumn) break;
        }
        try {
          return await runListQuery(
            client,
            table,
            columns,
            where.sql,
            [...where.params],
            '"id"',
            offset,
            limit
          );
        } catch (fallbackError) {
          throw new AdminListQueryError(`Could not list rows from ${table}`, { cause: fallbackError });
        }
      });
    } catch (error) {
      if (error instanceof AdminListQueryError) throw error;
      const message = error instanceof Error ? error.message : String(error);
      if (isTransientPgError(error)) {
        throw error;
      }
      console.error(`[Admin] Paginated list failed for ${table}:`, message);
      throw new AdminListQueryError(message || `Could not list rows from ${table}`, { cause: error });
    }
  }, 6);
}

export function isHeavyAdminTable(table: string) {
  return HEAVY_ADMIN_TABLES.has(table);
}

/** Full row for admin edit forms (`SELECT *`), one client, always released. */
export async function queryAdminRecordById(
  table: string,
  id: string | number
): Promise<RecordRow | null> {
  const idText = String(id ?? '').trim();
  if (!idText) return null;

  try {
    return await withPgRetry(async () =>
      withAdminPgRoute(async (client) => {
        const quoted = quoteTable(table);
        const res = await client.query(
          `SELECT * FROM ${quoted} WHERE CAST(id AS text) = $1 LIMIT 1`,
          [idText]
        );
        if (res.rows[0]) return res.rows[0] as RecordRow;

        const asNumber = Number(idText);
        if (Number.isFinite(asNumber) && String(asNumber) === idText) {
          const numeric = await client.query(`SELECT * FROM ${quoted} WHERE id = $1 LIMIT 1`, [asNumber]);
          if (numeric.rows[0]) return numeric.rows[0] as RecordRow;
        }
        return null;
      })
    );
  } catch (error) {
    console.error(`[Admin] Could not load ${table} id=${idText}:`, error);
    return null;
  }
}
