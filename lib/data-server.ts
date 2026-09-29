import { unstable_cache } from 'next/cache';
import { CMS_PUBLIC_CACHE_TAG, CMS_PUBLIC_REVALIDATE_SECONDS } from '@/lib/cms-public-cache';
import { db } from '@/lib/supabase/pool';
import {
  extractEmbeddedContent,
  stripEmbeddedContent,
} from '@/lib/embedded-content';
import { decodeHtmlEntities } from '@/lib/sanitize-html';
import { rememberKnownColumns } from '@/lib/supabase-payload';
import { isDeployableImageUrl, withImageCacheBust } from '@/lib/public-image';
import {
  clearCollectionCache,
  clearInflightCollection,
  getCachedCollection,
  getInflightCollection,
  setCachedCollection,
  setInflightCollection,
} from '@/lib/collection-cache';
import { stayMatchesParkLoose } from '@/lib/park-stay-match';
import type { RecordRow } from '@/lib/types';

// Additional utility functions needed by client components
export function getRecordImage(record: RecordRow): string | null {
  const preferred = [
    'image_url',
    'cover_image',
    'featured_image',
    'thumbnail',
    'photo',
    'banner',
    'picture',
    'social_image_url',
  ];
  let found: string | null = null;
  for (const key of preferred) {
    const value = record[key];
    if (isDeployableImageUrl(value)) {
      found = value.trim();
      break;
    }
  }
  if (!found) {
    for (const key of Object.keys(record)) {
      if (!/image|photo|thumbnail|cover|banner|picture|avatar|featured/.test(key)) continue;
      const value = record[key];
      if (isDeployableImageUrl(value)) {
        found = value.trim();
        break;
      }
    }
  }
  if (!found) {
    const html = recordBodyHtml(record);
    const fromHtml = /<img[^>]+src=["']([^"']+)["']/i.exec(html)?.[1]?.trim();
    found = fromHtml && isDeployableImageUrl(fromHtml) ? fromHtml : null;
  }
  return found ? withImageCacheBust(found, recordStamp(record)) : null;
}

function recordStamp(record: RecordRow) {
  return String(
    record.updated_date ||
      record.updated_at ||
      record.updatedAt ||
      record.modified_at ||
      record.created_at ||
      record.id ||
      ''
  );
}

export function getRecordTitle(record: RecordRow): string {
  const preferred = ['title', 'name', 'label', 'subject', 'heading', 'keyword', 'guest_name', 'customer_name', 'author', 'email'];
  const candidates = preferred
    .map((key) => readableFieldValue(record[key]))
    .filter(Boolean);
  const solid = candidates.find((value) => value.length >= 3);
  if (solid) return solid;
  if (candidates[0]) return candidates[0];

  for (const key of Object.keys(record)) {
    if (preferred.includes(key) || key === 'slug' || key === 'seo_slug') continue;
    const value = readableFieldValue(record[key]);
    if (value.length >= 3) return value;
  }
  return 'Untitled';
}

function readableFieldValue(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  // Postgres/json arrays: use the first non-empty string entry — never index a string as [0].
  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = readableFieldValue(item);
      if (nested) return nested;
    }
  }
  if (value && typeof value === 'object') {
    const rec = value as Record<string, unknown>;
    for (const key of ['html', 'content', 'body', 'text', 'value', 'markdown', 'description']) {
      const nested = rec[key];
      if (typeof nested === 'string' && nested.trim()) return nested.trim();
    }
  }
  return '';
}

export function pickString(record: RecordRow, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = readableFieldValue(record[key]);
    if (value) return value;
  }
  return fallback;
}

export function pickStoredString(record: RecordRow | null | undefined, keys: string[], fallback = ''): string {
  if (!record) return fallback;
  const direct = pickString(record, keys, '');
  if (direct) return direct;
  const fields = extractEmbeddedContent(recordBodyHtml(record)).fields || {};
  for (const key of keys) {
    const value = fields[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return fallback;
}

export function pickNumber(record: RecordRow, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value && !Number.isNaN(Number(value))) return Number(value);
  }
  return fallback;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function publicRecordSlug(record: RecordRow): string {
  const fromSlug = slugify(pickString(record, ['slug', 'seo_slug']));
  if (fromSlug) return fromSlug;
  const fromTitle = slugify(getRecordTitle(record));
  if (fromTitle && fromTitle !== 'untitled') return fromTitle;
  return String(record.id || '');
}

export function findRecordBySlug(rows: RecordRow[], slug: string) {
  const needle = slugify(slug);
  if (!needle) return null;
  return (
    rows.find((row) => slugify(pickString(row, ['slug', 'seo_slug'])) === needle) ||
    rows.find((row) => publicRecordSlug(row) === needle) ||
    rows.find((row) => String(row.id) === slug) ||
    null
  );
}

export function recordCardBlurb(record: RecordRow): string {
  const stored = pickPlainText(record, [
    'excerpt',
    'summary',
    'tagline',
    'description_title',
    'subtitle',
    'description',
  ]);
  if (stored.length >= 20) return stored.slice(0, 180);
  const country = pickString(record, ['country']);
  const category = pickString(record, ['category', 'type']);
  const location = pickString(record, ['location']);
  const days = pickNumber(record, ['duration_days', 'days', 'duration']);
  const duration = pickString(record, ['duration_label']) || (days > 0 ? `${days} days` : '');
  const bits = [duration, category, location, country].filter(Boolean);
  if (bits.length) return bits.join(' · ');
  const title = getRecordTitle(record);
  return title ? `Discover ${title} with Eton Safaris.` : '';
}

export function pickPlainText(record: RecordRow, keys: string[], fallback = ''): string {
  return stripHtml(pickString(record, keys, fallback));
}

export function stripHtml(value: string): string {
  return decodeHtmlEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export function visibleRecordHtml(record: RecordRow | null | undefined, keys: string[] = ['description', 'content', 'summary', 'excerpt', 'overview', 'about', 'body']): string {
  return stripEmbeddedContent(pickString(record || {}, keys));
}

export function parseContentBlocks(value: unknown): {
  title: string;
  description: string;
  image_url?: string;
  caption?: string;
}[] {
  if (Array.isArray(value)) {
    const blocks: { title: string; description: string; image_url?: string; caption?: string }[] = [];
    for (const item of value) {
      if (!item || typeof item !== 'object') continue;
      const row = item as Record<string, unknown>;
      if (row.kind === 'faq' || (row.question && !row.title && !row.description)) continue;
      const title = String(row.title || '');
      const description = String(row.description || '');
      const image_url = String(row.image_url || row.image || '');
      const caption = String(row.caption || '');
      if (!title && !description && !image_url && !caption) continue;
      blocks.push({ title, description, image_url, caption });
    }
    return blocks;
  }
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    return parseContentBlocks(JSON.parse(value));
  } catch {
    return extractEmbeddedContent(value).blocks || [];
  }
}

export function parseBlocksFromRecord(record: RecordRow | null | undefined): { title: string; description: string }[] {
  if (!record) return [];
  const fromColumns = parseContentBlocks(
    record.park_blocks ||
      record.accommodation_blocks ||
      record.place_blocks ||
      record.post_blocks ||
      record.page_blocks ||
      record.blocks
  );
  if (fromColumns.length > 0) return fromColumns;
  return extractEmbeddedContent(recordBodyHtml(record)).blocks || [];
}

export function isLanguagePost(record: RecordRow): boolean {
  return String(record.post_type || '').toLowerCase().includes('language');
}

export function recordBodyHtml(record: RecordRow | null | undefined): string {
  if (!record) return '';
  for (const key of ['description', 'content', 'body', 'html', 'text', 'overview', 'about', 'summary', 'excerpt']) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return '';
}

function slugLookupValues(slug: string): string[] {
  let raw = String(slug || '').trim();
  try {
    raw = decodeURIComponent(raw);
  } catch {
    // keep raw
  }
  raw = raw.replace(/^\/+|\/+$/g, '');
  const needle = slugify(raw);
  return Array.from(new Set([raw, needle, raw.toLowerCase()].filter(Boolean)));
}

export { clearCollectionCache };

const PAGE_SIZE = 1000;
/** Short cache avoids duplicate refresh/metadata queries while keeping CMS edits responsive. */
const FETCH_CACHE_MS = 90_000;
/** Remember resolved select strings per table so missing-column drops are not repeated. */
const resolvedSelects = new Map<string, string>();

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

async function queryWithColumnFallback(
  sqlFromColumns: (columns: string) => { text: string; values?: unknown[] },
  initialColumns: string,
  cacheKey?: string
): Promise<RecordRow[]> {
  let columns = (cacheKey && resolvedSelects.get(cacheKey)) || initialColumns;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      const { text, values } = sqlFromColumns(columns);
      const res = await db.query(text, values);
      const rows = (res.rows as RecordRow[]).map(jsonSafeRow);
      if (cacheKey) resolvedSelects.set(cacheKey, columns);
      if (rows[0] && cacheKey?.startsWith('tours')) rememberKnownColumns('tours', Object.keys(rows[0]));
      return rows;
    } catch (error: any) {
      const missing = columns !== '*' ? missingSelectColumn(error.message) : null;
      if (missing && columns.split(',').map((part) => part.trim()).includes(missing)) {
        const next = dropColumnFromSelect(columns, missing);
        if (next && next !== columns) {
          console.warn(`[Aiven] Dropping missing column "${missing}" from list select.`);
          columns = next;
          if (cacheKey) resolvedSelects.set(cacheKey, columns);
          continue;
        }
      }
      throw error;
    }
  }
  return [];
}

function isTransientFetchError(message?: string) {
  return /timeout|terminated|fetch failed|network|ECONNRESET|ENOTFOUND|ETIMEDOUT|UND_ERR_CONNECT_TIMEOUT|Connect Timeout|520|502|503|504|schema cache|connection|too many clients/i.test(
    String(message || '')
  );
}

function jsonSafeValue(value: unknown): unknown {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (typeof value === 'bigint') return value.toString();
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) return value.toString('base64');
  if (Array.isArray(value)) return value.map(jsonSafeValue);
  return value;
}

function jsonSafeRow(row: RecordRow): RecordRow {
  const next: RecordRow = { ...row };
  for (const key of Object.keys(next)) {
    next[key] = jsonSafeValue(next[key]) as RecordRow[typeof key];
  }
  return next;
}

function asRows(data: unknown): RecordRow[] {
  return Array.isArray(data) ? (data as RecordRow[]).map(jsonSafeRow) : [];
}

function asRow(data: unknown): RecordRow | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  return jsonSafeRow(data as RecordRow);
}

async function selectRange(
  tableName: string,
  selectColumns: string,
  start: number,
  end: number
): Promise<{ data: RecordRow[] | null; error: { message: string } | null }> {
  let lastMessage = '';
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const offset = start;
      const limit = end - start + 1;
      const queryText = `SELECT ${selectColumns} FROM ${tableName} OFFSET ${offset} LIMIT ${limit}`;
      const res = await db.query(queryText);
      return { data: (res.rows as RecordRow[]).map(jsonSafeRow), error: null };
    } catch (error: any) {
      lastMessage = error.message || 'fetch failed';
      if (!isTransientFetchError(lastMessage)) {
        return { data: null, error: { message: lastMessage } };
      }
      await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
    }
  }
  return { data: null, error: { message: lastMessage || 'fetch failed' }};
}

export async function fetchAllRecords(
  tableName: string,
  columns = '*',
  maxRows?: number
): Promise<RecordRow[]> {
  const allRows: RecordRow[] = [];
  let start = 0;
  const cacheKey = `${tableName}::${columns}`;
  let selectColumns = resolvedSelects.get(cacheKey) || columns;

  while (true) {
    const remaining = maxRows ? maxRows - allRows.length : PAGE_SIZE;
    if (maxRows && remaining <= 0) return allRows.slice(0, maxRows);
    const page = Math.min(PAGE_SIZE, remaining);
    const end = start + page - 1;
    const { data, error } = await selectRange(tableName, selectColumns, start, end);

    if (error) {
      const missing = selectColumns !== '*' ? missingSelectColumn(error.message) : null;
      if (missing && selectColumns.split(',').map((part) => part.trim()).includes(missing)) {
        const next = dropColumnFromSelect(selectColumns, missing);
        if (next && next !== selectColumns) {
          console.warn(`[Aiven] Dropping missing column "${missing}" from "${tableName}" list select.`);
          selectColumns = next;
          resolvedSelects.set(cacheKey, selectColumns);
          allRows.length = 0;
          start = 0;
          continue;
        }
      }
      console.error(`[Aiven] Error fetching "${tableName}" (rows ${start}–${end}):`, error);
      throw new Error(error.message);
    }

    const chunk = data || [];
    allRows.push(...chunk);
    if (chunk[0]) rememberKnownColumns(tableName, Object.keys(chunk[0]));
    resolvedSelects.set(cacheKey, selectColumns);

    if (chunk.length < page) break;
    start += page;
  }

  return allRows;
}

/** Lightweight columns for tour cards / listing pages (avoids huge description payloads).
 * Must match real Aiven database columns — wrong names cause retry storms on large tables.
 */
const SEO_INDEX_LIST_COLUMNS = 'seo_schema,meta_description';

export const TOUR_LIST_COLUMNS =
  `id,title,slug,seo_slug,country,category,duration_days,duration_nights,duration_label,price,image_url,social_image_url,is_featured,is_popular,show_on_landing,star_rating,review_count,published_at,created_date,updated_date,${SEO_INDEX_LIST_COLUMNS}`;

/** Shared list columns for admin grids and public listings (no description HTML). */
export const ADMIN_LIST_COLUMNS: Record<string, string> = {
  tours: TOUR_LIST_COLUMNS,
  accommodations:
    `id,name,slug,seo_slug,location,country,type,image_url,social_image_url,description_title,national_park_id,national_park_name,published_at,created_date,updated_date,${SEO_INDEX_LIST_COLUMNS}`,
  national_park:
    `id,name,slug,location,country,image_url,social_image_url,description_title,seo_slug,published_at,created_date,updated_date,${SEO_INDEX_LIST_COLUMNS}`,
  national_parks:
    `id,name,slug,location,country,image_url,social_image_url,description_title,seo_slug,published_at,created_date,updated_date,${SEO_INDEX_LIST_COLUMNS}`,
  parks:
    `id,name,slug,location,country,image_url,social_image_url,description_title,seo_slug,published_at,created_date,updated_date,${SEO_INDEX_LIST_COLUMNS}`,
  explore:
    `id,title,slug,location,country,image_url,social_image_url,description_title,seo_slug,published_at,created_date,updated_date,${SEO_INDEX_LIST_COLUMNS}`,
  safari_updates:
    `id,title,slug,seo_slug,excerpt,category,country,image_url,social_image_url,post_type,publish_date,published_at,created_date,updated_date,${SEO_INDEX_LIST_COLUMNS}`,
  countries:
    `id,name,slug,seo_slug,tagline,summary,excerpt,image_url,social_image_url,is_popular,description_title,published_at,created_date,updated_date,${SEO_INDEX_LIST_COLUMNS}`,
  categories:
    `id,name,slug,seo_slug,country,image_url,social_image_url,description_title,published_at,created_date,updated_date,${SEO_INDEX_LIST_COLUMNS}`,
  pages: `id,title,post_title,slug,seo_slug,cover_image,social_image_url,subtitle,published_at,created_date,updated_date,${SEO_INDEX_LIST_COLUMNS}`,
  landing_pages:
    `id,title,post_title,slug,seo_slug,country,cover_image,social_image_url,subtitle,published_at,created_date,updated_date,${SEO_INDEX_LIST_COLUMNS}`,
  bookings:
    'id,customer_name,customer_email,customer_phone,tour_id,tour_title,country,status,travel_date,total_amount,amount_paid,remaining_balance,payment_status,number_of_people,currency,created_date,updated_date',
  keywords: 'id,keywords,keyword,country,category,created_date,created_at,updated_date,updated_at',
  keyword: 'id,keywords,keyword,country,category,created_date,created_at,updated_date,updated_at',
  seo_keywords: 'id,keywords,keyword,country,category,created_date,created_at,updated_date,updated_at',
};

export const PUBLIC_LIST_COLUMNS = ADMIN_LIST_COLUMNS;

export function adminListColumnsFor(table: string, aliases: string[] = []): string | undefined {
  return ADMIN_LIST_COLUMNS[table] || aliases.map((alias) => ADMIN_LIST_COLUMNS[alias]).find(Boolean);
}

export function publicListColumnsFor(table: string, aliases: string[] = []): string | undefined {
  return PUBLIC_LIST_COLUMNS[table] || aliases.map((alias) => PUBLIC_LIST_COLUMNS[alias]).find(Boolean);
}

function defaultCollectionMaxRows(table: string, aliases: string[] = []): number | undefined {
  const names = [table, ...aliases].map((name) => name.toLowerCase());
  if (names.some((name) => name === 'tours')) return 96;
  if (names.some((name) => name === 'safari_updates')) return 48;
  if (names.some((name) => name === 'national_park' || name === 'national_parks' || name === 'parks')) {
    return 96;
  }
  if (names.some((name) => name === 'accommodations')) return 96;
  if (names.some((name) => name === 'explore')) return 96;
  return undefined;
}

async function fetchCollectionRecordsLive(
  table: string,
  aliases: string[],
  columns: string,
  maxRows: number | undefined
): Promise<RecordRow[]> {
  const cacheKey = [table, columns, maxRows ?? 'all', ...aliases].join('|');
  if (FETCH_CACHE_MS > 0) {
    const cached = getCachedCollection(cacheKey);
    if (cached) return cached as RecordRow[];
  }
  const pending = getInflightCollection(cacheKey) as Promise<RecordRow[]> | undefined;
  if (pending) return pending;

  const request = (async () => {
    const names = [table, ...aliases];
    let lastError: unknown = null;

    for (const name of names) {
      try {
        const rows = await fetchAllRecords(name, columns, maxRows);
        if (FETCH_CACHE_MS > 0 && rows.length > 0) {
          setCachedCollection(cacheKey, rows, FETCH_CACHE_MS);
        }
        return rows;
      } catch (error) {
        lastError = error;
        console.error(`[Aiven] Table "${name}" failed, trying next alias if available.`);
      }
    }

    if (lastError) {
      console.error('[Aiven] All table aliases failed; serving empty list instead of crashing the page.');
      return [];
    }
    return [];
  })();

  setInflightCollection(cacheKey, request);
  try {
    return await request;
  } finally {
    clearInflightCollection(cacheKey);
  }
}

export async function fetchCollectionRecords(
  table: string,
  aliases: string[] = [],
  options?: { columns?: string; full?: boolean; unlimited?: boolean; maxRows?: number }
): Promise<RecordRow[]> {
  // Default to light list columns — never pull full description HTML for whole tables unless asked.
  const columns =
    options?.full || options?.columns === '*'
      ? '*'
      : options?.columns || publicListColumnsFor(table, aliases) || '*';
  const maxRows =
    options?.unlimited || options?.full
      ? undefined
      : options?.maxRows ?? defaultCollectionMaxRows(table, aliases);
  const cacheKey = [table, columns, maxRows ?? 'all', ...aliases].join('|');

  try {
    return await unstable_cache(
      () => fetchCollectionRecordsLive(table, aliases, columns, maxRows),
      ['collection-records', cacheKey],
      {
        revalidate: CMS_PUBLIC_REVALIDATE_SECONDS,
        tags: [CMS_PUBLIC_CACHE_TAG, `collection:${table}`],
      }
    )();
  } catch (error) {
    console.warn(`[Public] Cached fetch for "${table}" failed; using live fallback.`, error);
    return fetchCollectionRecordsLive(table, aliases, columns, maxRows);
  }
}

/** Exact row count without downloading row payloads (admin dashboard cards). */
export async function countCollectionRecords(table: string, aliases: string[] = []): Promise<number> {
  const names = [table, ...aliases].filter(Boolean);
  let lastError: unknown = null;
  for (const name of names) {
    try {
      const queryText = `SELECT COUNT(*) as count FROM ${name}`;
      const res = await db.query(queryText);
      return parseInt(res.rows[0].count, 10) || 0;
    } catch (error: any) {
      lastError = error;
      console.error(`[Aiven] Count "${name}" failed:`, error);
    }
  }
  if (lastError) throw lastError;
  return 0;
}

function sanitizeIlike(value: string) {
  return String(value || '')
    .trim()
    .replace(/[%*,()'"\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** One page of light rows — use for admin grids / home carousels instead of full-table downloads. */
export async function fetchCollectionPage(
  table: string,
  aliases: string[] = [],
  options?: {
    columns?: string;
    limit?: number;
    offset?: number;
    orderBy?: string;
    ascending?: boolean;
    filters?: { country?: string; park?: string; category?: string };
  }
): Promise<{ rows: RecordRow[]; total: number }> {
  const columns = options?.columns || publicListColumnsFor(table, aliases) || '*';
  const limit = Math.max(1, Math.min(options?.limit ?? 48, 200));
  const offset = Math.max(0, options?.offset ?? 0);
  const orderBy = options?.orderBy === undefined ? 'created_date' : options.orderBy;
  const ascending = options?.ascending ?? false;
  const countryFilter = sanitizeIlike(options?.filters?.country || '');
  const parkFilter = sanitizeIlike(options?.filters?.park || '');
  const categoryFilter = sanitizeIlike(options?.filters?.category || '');
  const names = [table, ...aliases].filter(Boolean);
  let lastError: unknown = null;
  const parkColumnFallbacks =
    table === 'accommodations' || aliases.includes('accommodations')
      ? ['national_park_name', 'national_park', 'park_name', 'park', 'location']
      : ['name'];

  for (const name of names) {
    let selectColumns = columns;
    let parkColumnIndex = 0;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const parkColumn = parkFilter ? parkColumnFallbacks[parkColumnIndex] || '' : '';
      try {
        let whereClauses: string[] = [];
        let params: any[] = [];
        let paramIndex = 1;

        if (countryFilter) {
          whereClauses.push(`country ILIKE $${paramIndex}`);
          params.push(`%${countryFilter}%`);
          paramIndex++;
        }
        if (categoryFilter) {
          whereClauses.push(`category ILIKE $${paramIndex}`);
          params.push(`%${categoryFilter}%`);
          paramIndex++;
        }
        if (parkFilter && parkColumn) {
          whereClauses.push(`${parkColumn} ILIKE $${paramIndex}`);
          params.push(`%${parkFilter}%`);
          paramIndex++;
        }

        const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        const orderClause = orderBy ? `ORDER BY ${orderBy} ${ascending ? 'ASC' : 'DESC'}` : '';
        const queryText = `SELECT ${selectColumns} FROM ${name} ${whereClause} ${orderClause} OFFSET ${offset} LIMIT ${limit}`;
        
        const res = await db.query(queryText, params);
        
        const rows = (res.rows as RecordRow[]).map(jsonSafeRow);
        if (rows[0]) rememberKnownColumns(name, Object.keys(rows[0]));
        // Avoid count: 'exact' — it scans huge tables and was timing out Vercel (504).
        const total = rows.length < limit ? offset + rows.length : offset + rows.length + limit;
        return { rows, total };
      } catch (error: any) {
        const detail = error.message || '';
        const missing = missingSelectColumn(detail);
        if (missing && parkFilter && parkColumnFallbacks.includes(missing) && parkColumnIndex < parkColumnFallbacks.length - 1) {
          parkColumnIndex += 1;
          continue;
        }
        if (missing && selectColumns !== '*' && selectColumns.split(',').map((part) => part.trim()).includes(missing)) {
          const next = dropColumnFromSelect(selectColumns, missing);
          if (next && next !== selectColumns) {
            selectColumns = next;
            continue;
          }
        }
        if (/created_date/i.test(detail) && orderBy === 'created_date') {
          return fetchCollectionPage(table, aliases, { ...options, orderBy: 'published_at' });
        }
        if (/published_at/i.test(detail) && orderBy === 'published_at') {
          return fetchCollectionPage(table, aliases, { ...options, orderBy: 'publish_date' });
        }
        if (/publish_date/i.test(detail) && orderBy === 'publish_date') {
          return fetchCollectionPage(table, aliases, { ...options, orderBy: 'created_at' });
        }
        if (/created_at/i.test(detail) && orderBy === 'created_at') {
          return fetchCollectionPage(table, aliases, { ...options, orderBy: 'id' });
        }
        if (/column .* does not exist/i.test(detail) && orderBy === 'id') {
          return fetchCollectionPage(table, aliases, { ...options, orderBy: '' });
        }
        if (!isTransientFetchError(detail)) {
          lastError = error;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
        lastError = error;
      }
    }
  }

  if (lastError) throw lastError;
  return { rows: [], total: 0 };
}

const SAFARI_UPDATE_PUBLIC_LIST_FALLBACK =
  'id,title,slug,seo_slug,excerpt,category,country,image_url,social_image_url,post_type,publish_date,published_at,created_date,created_at,status,published,is_published';

export function filterPublicSafariUpdates(rows: RecordRow[]): RecordRow[] {
  return rows.filter((row) => isPublishedRecord(row) && !isLanguagePost(row));
}

/** Blog listing — direct Aiven query (no 15m empty Data Cache) with sort column fallbacks. */
export async function fetchPublicSafariUpdatesPage(options?: {
  limit?: number;
  offset?: number;
}): Promise<{ rows: RecordRow[]; total: number }> {
  const limit = Math.max(1, Math.min(options?.limit ?? 48, 200));
  const offset = Math.max(0, options?.offset ?? 0);
  const initialColumns = publicListColumnsFor('safari_updates') || SAFARI_UPDATE_PUBLIC_LIST_FALLBACK;
  const orderColumns = ['published_at', 'publish_date', 'created_date', 'created_at', 'id'];

  for (const orderColumn of orderColumns) {
    try {
      const raw = await queryWithColumnFallback(
        (cols) => ({
          text: `SELECT ${cols} FROM safari_updates ORDER BY ${orderColumn} DESC NULLS LAST OFFSET ${offset} LIMIT ${limit}`,
          values: [],
        }),
        initialColumns,
        'safari_updates::public-list'
      );
      const rows = filterPublicSafariUpdates(raw);
      const total = rows.length < limit ? offset + rows.length : offset + rows.length + limit;
      return { rows, total };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      if (!/column .* does not exist|does not exist/i.test(detail)) {
        console.warn('[Aiven] Safari updates list query failed:', detail);
      }
    }
  }

  try {
    const raw = await queryWithColumnFallback(
      (cols) => ({
        text: `SELECT ${cols} FROM safari_updates OFFSET ${offset} LIMIT ${limit}`,
        values: [],
      }),
      initialColumns,
      'safari_updates::public-list'
    );
    const rows = filterPublicSafariUpdates(raw);
    const total = rows.length < limit ? offset + rows.length : offset + rows.length + limit;
    return { rows, total };
  } catch (error) {
    console.error('[Aiven] Safari updates fallback list failed:', error);
    return { rows: [], total: 0 };
  }
}

const TOUR_SELECT_CACHE_KEY = 'tours::list';

function publishedTourRows(rows: RecordRow[], limit: number) {
  return rows.filter(isPublishedRecord).slice(0, limit);
}

/** Homepage / carousels: featured tours only — never page through all ~2900 rows. */
export async function fetchFeaturedTours(limit = 24): Promise<RecordRow[]> {
  const capped = Math.max(1, Math.min(limit, 48));
  const columns = resolvedSelects.get(TOUR_SELECT_CACHE_KEY) || TOUR_LIST_COLUMNS;

  try {
    const featured = await queryWithColumnFallback(
      (cols) => ({
        text: `SELECT ${cols} FROM tours WHERE is_featured = true OR is_popular = true OR show_on_landing = true LIMIT ${capped}`,
      }),
      columns,
      TOUR_SELECT_CACHE_KEY
    );
    const published = publishedTourRows(featured, capped);
    if (published.length) return published;
  } catch (error: any) {
    console.error('[Aiven] Featured tours query failed:', error.message);
  }

  try {
    const recent = await queryWithColumnFallback(
      (cols) => ({
        text: `SELECT ${cols} FROM tours ORDER BY created_date DESC LIMIT ${capped}`,
      }),
      resolvedSelects.get(TOUR_SELECT_CACHE_KEY) || TOUR_LIST_COLUMNS,
      TOUR_SELECT_CACHE_KEY
    );
    return publishedTourRows(recent, capped);
  } catch (error: any) {
    console.error('[Aiven] Recent tours query failed:', error.message);
    return [];
  }
}

/** Country → featured → recent. Never hide tour packages because one filter returned empty. */
export async function resolvePublicTours(options?: {
  country?: string;
  limit?: number;
  excludeId?: string;
}): Promise<RecordRow[]> {
  const capped = Math.max(1, Math.min(options?.limit ?? 12, 48));
  const excludeId = options?.excludeId != null ? String(options.excludeId) : '';
  const keep = (rows: RecordRow[]) =>
    publishedTourRows(
      rows.filter((row) => !excludeId || String(row.id) !== excludeId),
      capped
    );

  const country = String(options?.country || '').trim();
  if (country) {
    const byCountry = keep(await fetchToursForCountryLabel(country, capped));
    if (byCountry.length) return byCountry;
  }
  const featured = keep(await fetchFeaturedTours(capped));
  if (featured.length) return featured;
  try {
    const page = await fetchCollectionPage('tours', [], {
      columns: resolvedSelects.get(TOUR_SELECT_CACHE_KEY) || TOUR_LIST_COLUMNS,
      limit: capped,
      offset: 0,
    });
    return keep(page.rows);
  } catch (error: any) {
    console.error('[Aiven] resolvePublicTours fallback failed:', error.message);
    return [];
  }
}



const PUBLISHED_STATUSES = new Set([
  'published',
  'publish',
  'live',
  'public',
  'active',
  'visible',
  'released',
]);

const UNPUBLISHED_STATUSES = new Set([
  'draft',
  'unpublished',
  'deleted',
  'archived',
  'private',
  'admin-only',
  'admin only',
  'hidden',
]);

function normalizePublishToken(value: string): string {
  return value.toLowerCase().trim();
}

function isBlankPublishToken(value: string): boolean {
  return !value || value === 'null' || value === 'undefined' || value === 'none' || value === '-';
}

/** Empty / missing status counts as published. Prefer status over visibility so Base44 visibility defaults do not hide CMS countries. */
export function isPublishedRecord(record: RecordRow): boolean {
  for (const key of ['published', 'is_published', 'isPublished'] as const) {
    const flag = record[key];
    if (typeof flag === 'boolean') return flag;
  }

  const status = normalizePublishToken(pickString(record, ['status', 'publish_status']));
  if (!isBlankPublishToken(status)) {
    if (PUBLISHED_STATUSES.has(status)) return true;
    if (UNPUBLISHED_STATUSES.has(status)) return false;
  }

  const visibility = normalizePublishToken(pickString(record, ['visibility']));
  if (!isBlankPublishToken(visibility)) {
    if (PUBLISHED_STATUSES.has(visibility)) return true;
    if (UNPUBLISHED_STATUSES.has(visibility)) return false;
  }

  return true;
}

/** Admin-hidden or removed rows must never render on the public site. */
export function isPubliclyVisibleRecord(record: RecordRow | null | undefined): boolean {
  if (!record || typeof record !== 'object') return false;
  if (record.deleted_at || record.deletedAt) return false;
  if (record.is_deleted === true || record.isDeleted === true) return false;
  if (record.is_active === false || record.isActive === false) return false;
  return isPublishedRecord(record);
}

/** Resolve one public record by slug/seo_slug/id without downloading the whole table. */
export async function fetchRecordByPublicSlug(
  table: string,
  slug: string,
  aliases: string[] = [],
  columns = '*'
): Promise<RecordRow | null> {
  const values = slugLookupValues(slug);
  if (!values.length) return null;
  const names = [table, ...aliases].filter(Boolean);
  const selectColumns = columns || '*';

  async function hydrate(name: string, row: RecordRow | null): Promise<RecordRow | null> {
    if (!row) return null;
    rememberKnownColumns(name, Object.keys(row));
    if (selectColumns !== '*' && row.id != null) {
      const full = await fetchCollectionRecordById(name, String(row.id));
      if (full) return jsonSafeRow(full);
    }
    return jsonSafeRow(row);
  }

  for (const name of names) {
    for (const value of values) {
      for (const col of ['seo_slug', 'slug', 'id'] as const) {
        try {
          const queryText = `SELECT ${selectColumns} FROM ${name} WHERE ${col} = $1 LIMIT 1`;
          const res = await db.query(queryText, [value]);
          const row = (res.rows as RecordRow[])[0] ? jsonSafeRow((res.rows as RecordRow[])[0]) : null;
          if (row) return hydrate(name, row);
        } catch (error: any) {
          continue;
        }
      }
    }

    const label = values[0].replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
    if (label.length >= 4) {
      for (const col of ['name', 'title'] as const) {
        for (const pattern of [label, `%${label}%`] as const) {
          try {
            const queryText = `SELECT ${selectColumns} FROM ${name} WHERE ${col} ILIKE $1 LIMIT 1`;
            const res = await db.query(queryText, [pattern]);
            const row = (res.rows as RecordRow[])[0] ? jsonSafeRow((res.rows as RecordRow[])[0]) : null;
            if (row) return hydrate(name, row);
          } catch (error: any) {
            continue;
          }
        }
      }
    }
  }
  return null;
}

/** Detail routes: Aiven slug lookup — null when missing or admin-hidden. */
export async function fetchSyncedPublicRecord(
  table: string,
  slug: string,
  aliases: string[] = []
): Promise<RecordRow | null> {
  const row = await fetchRecordByPublicSlug(table, slug, aliases);
  if (!row || !isPubliclyVisibleRecord(row)) return null;
  return row;
}

/** Country-scoped tour cards — filter in Aiven database instead of downloading all tours. */
export async function fetchToursForCountryLabel(countryLabel: string, limit = 48): Promise<RecordRow[]> {
  const label = String(countryLabel || '').trim();
  if (!label) return [];
  const capped = Math.max(1, Math.min(limit, 200));
  try {
    const rows = await queryWithColumnFallback(
      (cols) => ({
        text: `SELECT ${cols} FROM tours WHERE country ILIKE $1 LIMIT ${capped}`,
        values: [`%${label}%`],
      }),
      resolvedSelects.get(TOUR_SELECT_CACHE_KEY) || TOUR_LIST_COLUMNS,
      TOUR_SELECT_CACHE_KEY
    );
    return publishedTourRows(rows, capped);
  } catch (error: any) {
    console.error('[Aiven] fetchToursForCountryLabel failed:', error.message);
    return [];
  }
}

/** Typeahead / filtered tour lists — never download the full tours table. */
export async function searchTours(options: {
  query?: string;
  country?: string;
  category?: string;
  limit?: number;
}): Promise<RecordRow[]> {
  const capped = Math.max(1, Math.min(options.limit ?? 24, 96));
  const query = sanitizeIlike(options.query || '');
  const country = sanitizeIlike(options.country || '');
  const category = sanitizeIlike((options.category || '').replace(/-/g, ' '));

  try {
    let whereClauses: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    if (query) {
      const like = `%${query}%`;
      whereClauses.push(`(title ILIKE $${paramIndex} OR slug ILIKE $${paramIndex} OR country ILIKE $${paramIndex} OR category ILIKE $${paramIndex})`);
      params.push(like);
      paramIndex++;
    }
    if (country && !/^all destinations$/i.test(country)) {
      whereClauses.push(`country ILIKE $${paramIndex}`);
      params.push(`%${country}%`);
      paramIndex++;
    }
    if (category) {
      whereClauses.push(`category ILIKE $${paramIndex}`);
      params.push(`%${category}%`);
      paramIndex++;
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const rows = await queryWithColumnFallback(
      (cols) => ({
        text: `SELECT ${cols} FROM tours ${whereClause} LIMIT ${capped}`,
        values: params,
      }),
      resolvedSelects.get(TOUR_SELECT_CACHE_KEY) || TOUR_LIST_COLUMNS,
      TOUR_SELECT_CACHE_KEY
    );
    return publishedTourRows(rows, capped);
  } catch (error: any) {
    console.error('[Aiven] searchTours failed:', error.message);
    return [];
  }
}

/** Park detail stays — filter in Aiven database, never download the full accommodations table. */
export async function fetchStaysForPark(parkName: string, limit = 10, parkId?: string): Promise<RecordRow[]> {
  const name = sanitizeIlike(parkName);
  if (!name && !parkId) return [];
  const capped = Math.max(1, Math.min(limit, 48));
  const shortName = name
    .replace(/\s+national\s+park$/i, '')
    .replace(/\s+national\s+reserve$/i, '')
    .replace(/\s+conservation\s+area$/i, '')
    .replace(/\s+np$/i, '')
    .trim();
  const like = `%${shortName || name}%`;
  const staySelectKey = 'accommodations::list';
  let selectColumns = resolvedSelects.get(staySelectKey) || publicListColumnsFor('accommodations') || '*';
  const seen = new Set<string>();
  const merged: RecordRow[] = [];

  function pushRows(rows: RecordRow[]) {
    for (const row of rows) {
      const safe = jsonSafeRow(row);
      const id = String(safe.id || '');
      if (id && seen.has(id)) continue;
      if (id) seen.add(id);
      merged.push(safe);
    }
  }

  const missingParkColumns = new Set<string>();

  async function queryOnce(whereSql: string, params: any[] = []) {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      try {
        const res = await db.query(`SELECT ${selectColumns} FROM accommodations ${whereSql}`, params);
        resolvedSelects.set(staySelectKey, selectColumns);
        pushRows(res.rows as RecordRow[]);
        return;
      } catch (error: any) {
        const message = error?.message || '';
        const missingWhere = message.match(/column "([^"]+)" does not exist/i)?.[1];
        if (missingWhere) {
          missingParkColumns.add(missingWhere);
          return;
        }
        const missing = selectColumns !== '*' ? missingSelectColumn(message) : null;
        if (missing && selectColumns.split(',').map((part) => part.trim()).includes(missing)) {
          const next = dropColumnFromSelect(selectColumns, missing);
          if (next && next !== selectColumns) {
            selectColumns = next;
            continue;
          }
        }
        console.error('[Aiven] Park stays query failed:', message);
        return;
      }
    }
  }

  const id = String(parkId || '').trim();
  if (id) {
    await queryOnce(`WHERE national_park_id = $1 LIMIT ${capped}`, [id]);
  }
  if (merged.length < capped && (shortName || name)) {
    for (const column of ['national_park_name', 'national_park', 'park_name', 'park']) {
      if (missingParkColumns.has(column)) continue;
      await queryOnce(`WHERE ${column} ILIKE $1 LIMIT 48`, [like]);
      if (merged.length >= capped) break;
    }
    if (merged.length < capped && !missingParkColumns.has('location')) {
      await queryOnce(`WHERE location ILIKE $1 LIMIT 48`, [like]);
    }
  }

  return merged
    .filter(isPublishedRecord)
    .filter((item) => stayMatchesParkLoose(item, parkName, id))
    .slice(0, capped);
}

/** Parks in one country — capped so admin filters / country pages stay fast. */
export async function fetchParksForCountry(countryLabel: string, limit = 200, countryId?: string): Promise<RecordRow[]> {
  const label = sanitizeIlike(countryLabel);
  if (!label) return [];
  const capped = Math.max(1, Math.min(limit, 200));
  const names = ['national_park', 'national_parks', 'parks'];
  const selectColumns = '*';
  for (const name of names) {
    const collected: RecordRow[] = [];
    if (countryId) {
      try {
        const res = await db.query(`SELECT ${selectColumns} FROM ${name} WHERE country_id = $1 LIMIT ${capped}`, [countryId]);
        collected.push(...(res.rows as RecordRow[]));
      } catch (error: any) {
        if (!/column .* does not exist|relation .* does not exist/i.test(error.message || '')) {
          console.error(`[Aiven] Parks country_id query failed:`, error.message);
        }
      }
    }
    for (const countryColumn of ['country', 'country_name', 'destination', 'location']) {
      try {
        const queryText = `SELECT ${selectColumns} FROM ${name} WHERE ${countryColumn} ILIKE $1 LIMIT ${capped}`;
        const res = await db.query(queryText, [`%${label}%`]);
        collected.push(...(res.rows as RecordRow[]));
      } catch (error: any) {
        if (!/column .* does not exist|relation .* does not exist/i.test(error.message || '')) {
          console.error(`[Aiven] Parks for country query failed:`, error.message);
        }
      }
    }
    if (collected.length > 0) {
      const seen = new Set<string>();
      return collected.filter(isPublishedRecord).filter((row) => {
        const key = String(row.id || getRecordTitle(row)).toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, capped);
    }
  }
  return [];
}

/** Load one full row for an admin editor — never download the whole table to find a single id. */
async function fetchCollectionRecordByIdLive(
  table: string,
  id: string,
  aliases: string[] = []
): Promise<RecordRow | null> {
  const names = [table, ...aliases].filter(Boolean);
  for (const name of names) {
    try {
      const queryText = `SELECT * FROM ${name} WHERE id = $1 LIMIT 1`;
      const res = await db.query(queryText, [id]);
      const row = (res.rows as RecordRow[])[0] ? jsonSafeRow((res.rows as RecordRow[])[0]) : null;
      if (row) {
        rememberKnownColumns(name, Object.keys(row));
        return row;
      }
    } catch (error: any) {
      if (!/no rows|relation/i.test(error.message || '')) {
        console.error(`[Aiven] Fetch "${name}" id=${id} failed:`, error);
      }
    }
  }
  return null;
}

export async function fetchCollectionRecordById(
  table: string,
  id: string,
  aliases: string[] = []
): Promise<RecordRow | null> {
  const cacheKey = [table, id, ...aliases].join('|');
  return unstable_cache(
    () => fetchCollectionRecordByIdLive(table, id, aliases),
    ['collection-record-by-id', cacheKey],
    {
      revalidate: CMS_PUBLIC_REVALIDATE_SECONDS,
      tags: [CMS_PUBLIC_CACHE_TAG, `collection:${table}`],
    }
  )();
}