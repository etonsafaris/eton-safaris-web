import { createClient } from '@supabase/supabase-js';
import { supabase, supabaseConfig } from '@/lib/supabase/client';
import { isJwtClockError } from '@/lib/supabase/jwt-clock';
import { extractEmbeddedContent, recordBodyHtml, stripEmbeddedContent } from '@/lib/embedded-content';
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
import type { RecordRow } from '@/lib/types';

export { clearCollectionCache };

const PAGE_SIZE = 1000;
const FETCH_CACHE_MS = 60_000;
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

function isTransientFetchError(message?: string) {
  return /timeout|terminated|fetch failed|network|ECONNRESET|ENOTFOUND|ETIMEDOUT|UND_ERR_CONNECT_TIMEOUT|Connect Timeout|520|502|503|504|schema cache|PGRST002/i.test(
    String(message || '')
  );
}

let anonFallback: ReturnType<typeof createClient> | null = null;
let preferAnonFallback = false;

function publicAnonClient() {
  if (!anonFallback) {
    anonFallback = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return anonFallback;
}

function dataClient() {
  return preferAnonFallback ? publicAnonClient() : supabase;
}

function switchToAnonOnJwtClock(detail?: string) {
  if (preferAnonFallback || !isJwtClockError(detail)) return false;
  preferAnonFallback = true;
  return true;
}

async function withJwtRetry<T>(
  run: () => PromiseLike<{ error?: { message?: string; details?: string; hint?: string; code?: string } | null } & T>
): Promise<T> {
  const first = (await run()) as T & {
    error?: { message?: string; details?: string; hint?: string; code?: string } | null;
  };
  if (!first.error) return first;
  const detail = [first.error.message, first.error.details, first.error.hint, first.error.code]
    .filter(Boolean)
    .join(' ');
  if (!switchToAnonOnJwtClock(detail)) return first;
  return (await run()) as T;
}

function asRows(data: unknown): RecordRow[] {
  return Array.isArray(data) ? (data as RecordRow[]) : [];
}

function asRow(data: unknown): RecordRow | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  return data as RecordRow;
}

async function selectRange(
  tableName: string,
  selectColumns: string,
  start: number,
  end: number
): Promise<{ data: RecordRow[] | null; error: { message: string } | null }> {
  let lastMessage = '';
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data, error } = await withJwtRetry(() =>
      dataClient().from(tableName).select(selectColumns).range(start, end)
    );
    if (!error) return { data: asRows(data), error: null };
    const detail = [error.message, error.details, error.hint, error.code].filter(Boolean).join(' ');
    lastMessage = error.message || detail || 'fetch failed';
    if (!isTransientFetchError(detail)) {
      return { data: null, error: { message: lastMessage } };
    }
    await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
  }
  return { data: null, error: { message: lastMessage || 'fetch failed' } };
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
          console.warn(`[Supabase] Dropping missing column "${missing}" from "${tableName}" list select.`);
          selectColumns = next;
          resolvedSelects.set(cacheKey, selectColumns);
          allRows.length = 0;
          start = 0;
          continue;
        }
      }
      console.error(`[Supabase] Error fetching "${tableName}" (rows ${start}–${end}):`, error);
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
 * Must match real Supabase columns — wrong names cause retry storms on large tables.
 */
export const TOUR_LIST_COLUMNS =
  'id,title,slug,seo_slug,country,category,duration_days,duration_nights,duration_label,price,image_url,social_image_url,is_featured,is_popular,show_on_landing,star_rating,review_count,created_date,updated_date';

/** Shared list columns for admin grids and public listings (no description HTML). */
export const ADMIN_LIST_COLUMNS: Record<string, string> = {
  tours: TOUR_LIST_COLUMNS,
  accommodations:
    'id,name,slug,location,country,type,image_url,social_image_url,description_title,national_park_id,national_park_name,seo_slug,created_date,updated_date',
  national_park:
    'id,name,slug,location,country,image_url,social_image_url,description_title,seo_slug,created_date,updated_date',
  national_parks:
    'id,name,slug,location,country,image_url,social_image_url,description_title,seo_slug,created_date,updated_date',
  parks:
    'id,name,slug,location,country,image_url,social_image_url,description_title,seo_slug,created_date,updated_date',
  explore:
    'id,title,slug,location,country,image_url,social_image_url,description_title,seo_slug,created_date,updated_date',
  safari_updates:
    'id,title,slug,seo_slug,excerpt,category,image_url,social_image_url,post_type,publish_date,created_date,updated_date',
  countries:
    'id,name,slug,seo_slug,tagline,image_url,social_image_url,is_popular,description_title,created_date,updated_date',
  categories:
    'id,name,slug,seo_slug,country,image_url,social_image_url,description_title,created_date,updated_date',
  pages: 'id,title,post_title,slug,seo_slug,cover_image,social_image_url,subtitle,created_date,updated_date',
  landing_pages:
    'id,title,post_title,slug,seo_slug,country,cover_image,social_image_url,subtitle,created_date,updated_date',
  bookings:
    'id,customer_name,customer_email,customer_phone,tour_id,tour_title,country,status,travel_date,total_amount,amount_paid,remaining_balance,payment_status,number_of_people,currency,created_date,updated_date',
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
        if (FETCH_CACHE_MS > 0) {
          setCachedCollection(cacheKey, rows, FETCH_CACHE_MS);
        }
        return rows;
      } catch (error) {
        lastError = error;
        console.error(`[Supabase] Table "${name}" failed, trying next alias if available.`);
      }
    }

    if (lastError) throw lastError;
    return [];
  })();

  setInflightCollection(cacheKey, request);
  try {
    return await request;
  } finally {
    clearInflightCollection(cacheKey);
  }
}

/** Exact row count without downloading row payloads (admin dashboard cards). */
export async function countCollectionRecords(table: string, aliases: string[] = []): Promise<number> {
  const names = [table, ...aliases].filter(Boolean);
  let lastError: unknown = null;
  for (const name of names) {
    const { count, error } = await withJwtRetry(() =>
      dataClient().from(name).select('id', { count: 'exact', head: true })
    );
    if (!error) return count || 0;
    lastError = error;
    console.error(`[Supabase] Count "${name}" failed:`, error);
  }
  if (lastError) throw lastError;
  return 0;
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
      const { data, error } = await withJwtRetry(() => {
        let query = dataClient()
          .from(name)
          .select(selectColumns)
          .range(offset, offset + limit - 1);
        if (countryFilter) query = query.ilike('country', `%${countryFilter}%`);
        if (categoryFilter) query = query.ilike('category', `%${categoryFilter}%`);
        if (parkFilter && parkColumn) query = query.ilike(parkColumn, `%${parkFilter}%`);
        if (orderBy) {
          query = query.order(orderBy, { ascending });
        }
        return query;
      });
      if (!error) {
        const rows = asRows(data);
        if (rows[0]) rememberKnownColumns(name, Object.keys(rows[0]));
        // Avoid count: 'exact' — it scans huge tables and was timing out Vercel (504).
        const total = rows.length < limit ? offset + rows.length : offset + rows.length + limit;
        return { rows, total };
      }

      const detail = [error.message, error.details, error.hint, error.code].filter(Boolean).join(' ');
      const missing = missingSelectColumn(error.message);
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
        return fetchCollectionPage(table, aliases, { ...options, orderBy: 'created_at' });
      }
      if (/created_at/i.test(detail) && orderBy === 'created_at') {
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

  if (lastError) throw lastError;
  return { rows: [], total: 0 };
}

/** Homepage / carousels: featured tours only — never page through all ~2900 rows. */
export async function fetchFeaturedTours(limit = 24): Promise<RecordRow[]> {
  const columns = TOUR_LIST_COLUMNS;
  const capped = Math.max(1, Math.min(limit, 48));

  const featured = await withJwtRetry(() =>
    dataClient()
      .from('tours')
      .select(columns)
      .or('is_featured.eq.true,is_popular.eq.true,show_on_landing.eq.true')
      .limit(capped)
  );
  if (!featured.error && featured.data && featured.data.length > 0) {
    return asRows(featured.data).filter(isPublishedRecord).slice(0, capped);
  }

  const recent = await withJwtRetry(() =>
    dataClient().from('tours').select(columns).order('created_date', { ascending: false }).limit(capped)
  );
  if (!recent.error) {
    return asRows(recent.data).filter(isPublishedRecord).slice(0, capped);
  }
  return [];
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
      if (full) return full;
    }
    return row;
  }

  for (const name of names) {
    for (const value of values) {
      for (const col of ['seo_slug', 'slug', 'id'] as const) {
        const { data, error } = await withJwtRetry(() =>
          dataClient().from(name).select(selectColumns).eq(col, value).limit(1)
        );
        if (error) continue;
        const row = asRows(data)[0] || asRow(data);
        if (row) return hydrate(name, row);
      }
    }

    const label = values[0].replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
    if (label.length >= 4) {
      for (const col of ['name', 'title'] as const) {
        for (const pattern of [label, `%${label}%`] as const) {
          const { data, error } = await withJwtRetry(() =>
            dataClient().from(name).select(selectColumns).ilike(col, pattern).limit(1)
          );
          if (error) continue;
          const row = asRows(data)[0] || asRow(data);
          if (row) return hydrate(name, row);
        }
      }
    }
  }
  return null;
}

/** Country-scoped tour cards — filter in Supabase instead of downloading all tours. */
export async function fetchToursForCountryLabel(countryLabel: string, limit = 48): Promise<RecordRow[]> {
  const label = String(countryLabel || '').trim();
  if (!label) return [];
  const capped = Math.max(1, Math.min(limit, 200));
  const { data, error } = await withJwtRetry(() =>
    dataClient()
      .from('tours')
      .select(TOUR_LIST_COLUMNS)
      .ilike('country', `%${label}%`)
      .limit(capped)
  );
  if (error) {
    console.error('[Supabase] fetchToursForCountryLabel failed:', error.message);
    return [];
  }
  return asRows(data).filter(isPublishedRecord);
}

function sanitizeIlike(value: string) {
  return String(value || '')
    .trim()
    .replace(/[%*,()'"\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

  let request = dataClient().from('tours').select(TOUR_LIST_COLUMNS);
  if (query) {
    const like = `%${query}%`;
    request = request.or(`title.ilike.${like},slug.ilike.${like},country.ilike.${like},category.ilike.${like}`);
  }
  if (country && !/^all destinations$/i.test(country)) {
    request = request.ilike('country', `%${country}%`);
  }
  if (category) {
    request = request.ilike('category', `%${category}%`);
  }

  const { data, error } = await withJwtRetry(() => request.limit(capped));
  if (error) {
    console.error('[Supabase] searchTours failed:', error.message);
    return [];
  }
  return asRows(data).filter(isPublishedRecord);
}

/** Park detail stays — filter in Supabase, never download the full accommodations table. */
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
  let selectColumns =
    'id,name,slug,seo_slug,location,country,type,image_url,social_image_url,description_title,national_park_name,national_park_id';
  const seen = new Set<string>();
  const merged: RecordRow[] = [];

  function pushRows(rows: RecordRow[]) {
    for (const row of rows) {
      const id = String(row.id || '');
      if (id && seen.has(id)) continue;
      if (id) seen.add(id);
      merged.push(row);
    }
  }

  async function queryOnce(
    run: (cols: string) => PromiseLike<{ data: unknown; error: { message?: string } | null }>
  ) {
    let cols = selectColumns;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const { data, error } = await withJwtRetry(() => run(cols));
      if (!error) {
        pushRows(asRows(data));
        selectColumns = cols;
        return;
      }
      const missing = missingSelectColumn(error.message || '');
      if (missing && cols.split(',').map((part) => part.trim()).includes(missing)) {
        const next = dropColumnFromSelect(cols, missing);
        if (next && next !== cols) {
          cols = next;
          continue;
        }
      }
      return;
    }
  }

  const id = String(parkId || '').trim();
  if (id) {
    await queryOnce((cols) =>
      dataClient().from('accommodations').select(cols).eq('national_park_id', id).limit(48)
    );
  }
  if (merged.length < capped && (shortName || name)) {
    await queryOnce((cols) =>
      dataClient().from('accommodations').select(cols).ilike('location', like).limit(48)
    );
  }
  if (merged.length < capped && (shortName || name)) {
    await queryOnce((cols) =>
      dataClient().from('accommodations').select(cols).ilike('national_park_name', like).limit(48)
    );
  }

  const needle = (shortName || name).toLowerCase();
  const fullNeedle = name.toLowerCase();
  return merged
    .filter(isPublishedRecord)
    .filter((item) => {
      if (id && String(item.national_park_id || '') === id) return true;
      if (!needle) return false;
      const parkField = pickString(item, ['national_park_name', 'park', 'park_name']).toLowerCase();
      const hay = [parkField, pickString(item, ['location']), pickString(item, ['name'])]
        .join(' ')
        .toLowerCase();
      return hay.includes(needle) || hay.includes(fullNeedle);
    })
    .slice(0, capped);
}

/** Parks in one country — capped so admin filters / country pages stay fast. */
export async function fetchParksForCountry(countryLabel: string, limit = 200): Promise<RecordRow[]> {
  const label = sanitizeIlike(countryLabel);
  if (!label) return [];
  const capped = Math.max(1, Math.min(limit, 200));
  const names = ['national_park', 'national_parks', 'parks'];
  let selectColumns =
    publicListColumnsFor('national_park', ['national_parks', 'parks']) ||
    'id,name,slug,seo_slug,location,country,image_url,social_image_url,description_title';
  for (const name of names) {
    let cols = selectColumns;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const { data, error } = await withJwtRetry(() =>
        dataClient().from(name).select(cols).ilike('country', `%${label}%`).limit(capped)
      );
      if (!error) {
        const seen = new Set<string>();
        return asRows(data).filter(isPublishedRecord).filter((row) => {
          const key = String(row.id || getRecordTitle(row)).toLowerCase();
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }
      const missing = missingSelectColumn(error.message || '');
      if (missing && cols.split(',').map((part) => part.trim()).includes(missing)) {
        const next = dropColumnFromSelect(cols, missing);
        if (next && next !== cols) {
          cols = next;
          selectColumns = next;
          continue;
        }
      }
      break;
    }
  }
  return [];
}

/** Load one full row for an admin editor — never download the whole table to find a single id. */
export async function fetchCollectionRecordById(
  table: string,
  id: string,
  aliases: string[] = []
): Promise<RecordRow | null> {
  const names = [table, ...aliases].filter(Boolean);
  for (const name of names) {
    const { data, error } = await withJwtRetry(() =>
      dataClient().from(name).select('*').eq('id', id).limit(1)
    );
    const row = asRows(data)[0] || asRow(data);
    if (!error && row) {
      rememberKnownColumns(name, Object.keys(row));
      return row;
    }
    if (error && !/no rows|PGRST116/i.test(error.message || '')) {
      console.error(`[Supabase] Fetch "${name}" id=${id} failed:`, error);
    }
  }
  return null;
}

export function getDynamicColumns(records: RecordRow[]): string[] {
  const keys = new Set<string>();
  records.forEach((record) => {
    Object.keys(record).forEach((key) => keys.add(key));
  });
  return Array.from(keys);
}

function isUsableImageUrl(value: unknown): value is string {
  return isDeployableImageUrl(value);
}

function recordStamp(record: RecordRow) {
  return String(record.updated_at || record.updatedAt || record.modified_at || record.created_at || record.id || '');
}

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
    if (isUsableImageUrl(value)) {
      found = value.trim();
      break;
    }
  }
  if (!found) {
    for (const key of Object.keys(record)) {
      if (!/image|photo|thumbnail|cover|banner|picture|avatar|featured/.test(key)) continue;
      const value = record[key];
      if (isUsableImageUrl(value)) {
        found = value.trim();
        break;
      }
    }
  }
  if (!found) {
    const html = recordBodyHtml(record);
    const fromHtml = /<img[^>]+src=["']([^"']+)["']/i.exec(html)?.[1]?.trim();
    found = fromHtml && isUsableImageUrl(fromHtml) ? fromHtml : null;
  }
  return found ? withImageCacheBust(found, recordStamp(record)) : null;
}

function readableFieldValue(value: unknown): string {
  if (typeof value === 'string') return value.trim();
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

/** Prefer a real label over a 1–2 character junk title/slug fragment (e.g. "M" vs "Madagascar"). */
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

export function getRecordSlug(record: RecordRow): string | null {
  const value = record.slug;
  if (typeof value !== 'string' || !value) return null;
  return `/${value.replace(/^\//, '')}`;
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

export function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function formatColumnLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function pickRecordId(record: RecordRow | null | undefined): string | number | null {
  if (!record) return null;
  const preferred = ['id', 'uuid', '_id', 'agent_id', 'registered_agent_id', 'pk', 'ID', 'Id'];
  for (const key of preferred) {
    const parsed = asRecordId(record[key]);
    if (parsed != null) return parsed;
  }
  for (const [key, value] of Object.entries(record)) {
    if (key.toLowerCase() === 'id') {
      const parsed = asRecordId(value);
      if (parsed != null) return parsed;
    }
  }
  return null;
}

function asRecordId(value: unknown): string | number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'bigint') return String(value);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') return null;
    return trimmed;
  }
  return null;
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

/** Prefer publish stamp, then create, then last update. Never invent "today" when reading. */
export const RECORD_DATE_KEYS = [
  'published_at',
  'publishedAt',
  'publish_date',
  'published_date',
  'date_published',
  'post_date',
  'date',
  'created_at',
  'createdAt',
  'created_date',
  'createdDate',
  'CreatedDate',
  'updated_at',
  'updatedAt',
  'updated_date',
  'updatedDate',
  'modified_at',
  'modifiedAt',
  'timestamp',
] as const;

function coerceDateString(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();

  if (typeof value === 'number' && Number.isFinite(value)) {
    const ms = value > 0 && value < 1e12 ? value * 1000 : value;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString();
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    if (typeof obj.seconds === 'number') return coerceDateString(Number(obj.seconds) * 1000);
    if (typeof obj._seconds === 'number') return coerceDateString(Number(obj._seconds) * 1000);
    if (obj.$date !== undefined) return coerceDateString(obj.$date);
    if (obj.value !== undefined) return coerceDateString(obj.value);
  }

  if (typeof value === 'string' && value.trim()) {
    const trimmed = value.trim();
    if (/^(null|undefined|—|-|n\/a|none)$/i.test(trimmed)) return '';
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
    if (dateOnly) {
      const date = new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
      if (!Number.isNaN(date.getTime())) return date.toISOString();
    }
    const parsed = Date.parse(trimmed);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
    // Keep human-readable stamps that already include a year.
    if (/\d{4}/.test(trimmed)) return trimmed;
    return '';
  }

  return '';
}

export function pickDateValue(record: RecordRow | null | undefined, keys: string[]): string {
  if (!record) return '';
  const lowerMap = new Map<string, unknown>();
  for (const [key, value] of Object.entries(record)) {
    lowerMap.set(key.toLowerCase(), value);
  }
  for (const key of keys) {
    const coerced = coerceDateString(record[key] ?? lowerMap.get(key.toLowerCase()));
    if (coerced) return coerced;
  }
  return '';
}

export function recordPublishedAt(record: RecordRow | null | undefined): string {
  if (!record) return '';
  // Prefer the original publish stamp, then create, then last update — never invent "today".
  const fromColumns = pickDateValue(record, [...RECORD_DATE_KEYS]);
  if (fromColumns) return fromColumns;

  const fields = extractEmbeddedContent(recordBodyHtml(record)).fields || {};
  for (const key of RECORD_DATE_KEYS) {
    const coerced = coerceDateString(fields[key]);
    if (coerced) return coerced;
  }

  // Last resort: any record key that looks like a date field.
  for (const [key, value] of Object.entries(record)) {
    if (!/(publish|created|updated|modified|^date$|timestamp)/i.test(key)) continue;
    if (/status|type|timezone|lifetime|duration|travel|available|expiry|expire/i.test(key)) continue;
    const coerced = coerceDateString(value);
    if (coerced) return coerced;
  }
  return '';
}

/**
 * Keep an existing publish stamp on edit; if missing (legacy rows), stamp once so public pages
 * always have a date. Callers may still pass isEdit for readability.
 */
export function publishStampForSave(existing: string | undefined, _isEdit = false): string {
  const coerced = coerceDateString(existing);
  if (coerced) return coerced;
  const trimmed = (existing || '').trim();
  if (trimmed && !/^(null|undefined|—|-|n\/a|none)$/i.test(trimmed)) return trimmed;
  return new Date().toISOString();
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

export function pickPlainText(record: RecordRow, keys: string[], fallback = ''): string {
  return stripHtml(pickString(record, keys, fallback));
}

/** Compact card copy for listings — never requires full HTML description columns. */
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

export function pickNumber(record: RecordRow, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value && !Number.isNaN(Number(value))) return Number(value);
  }
  return fallback;
}

export function isLanguagePost(record: RecordRow): boolean {
  return String(record.post_type || '').toLowerCase().includes('language');
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

export function visibleRecordHtml(record: RecordRow | null | undefined, keys: string[] = ['description', 'content', 'summary', 'excerpt', 'overview', 'about', 'body']): string {
  return stripEmbeddedContent(pickString(record || {}, keys));
}
