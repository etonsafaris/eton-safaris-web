import { supabase } from '@/lib/supabase/client';
import { extractEmbeddedContent, recordBodyHtml, stripEmbeddedContent } from '@/lib/embedded-content';
import { decodeHtmlEntities } from '@/lib/sanitize-html';
import { rememberKnownColumns } from '@/lib/supabase-payload';
import { isDeployableImageUrl, withImageCacheBust } from '@/lib/public-image';
import type { RecordRow } from '@/lib/types';

const PAGE_SIZE = 1000;
const FETCH_CACHE_MS = 60_000;
const recordCache = new Map<string, { expires: number; rows: RecordRow[] }>();
const inflight = new Map<string, Promise<RecordRow[]>>();

export async function fetchAllRecords(tableName: string, columns = '*'): Promise<RecordRow[]> {
  const allRows: RecordRow[] = [];
  let start = 0;

  while (true) {
    const end = start + PAGE_SIZE - 1;
    const { data, error } = await supabase.from(tableName).select(columns).range(start, end);

    if (error) {
      console.error(`[Supabase] Error fetching "${tableName}" (rows ${start}–${end}):`, error);
      throw error;
    }

    const chunk = (data as RecordRow[] | null) || [];
    allRows.push(...chunk);
    if (chunk[0]) rememberKnownColumns(tableName, Object.keys(chunk[0]));

    if (chunk.length < PAGE_SIZE) break;
    start += PAGE_SIZE;
  }

  return allRows;
}

export async function fetchCollectionRecords(
  table: string,
  aliases: string[] = [],
  options?: { columns?: string }
): Promise<RecordRow[]> {
  const columns = options?.columns || '*';
  const cacheKey = [table, columns, ...aliases].join('|');
  if (FETCH_CACHE_MS > 0) {
    const cached = recordCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) return cached.rows;
  }
  const pending = inflight.get(cacheKey);
  if (pending) return pending;

  const request = (async () => {
    const names = [table, ...aliases];
    let lastError: unknown = null;

    for (const name of names) {
      try {
        const rows = await fetchAllRecords(name, columns);
        if (FETCH_CACHE_MS > 0) {
          recordCache.set(cacheKey, { expires: Date.now() + FETCH_CACHE_MS, rows });
        }
        return rows;
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);
        if (columns !== '*' && /column/i.test(message)) {
          try {
            const rows = await fetchAllRecords(name, '*');
            if (FETCH_CACHE_MS > 0) {
              recordCache.set(cacheKey, { expires: Date.now() + FETCH_CACHE_MS, rows });
            }
            return rows;
          } catch (fallbackError) {
            lastError = fallbackError;
          }
        }
        console.error(`[Supabase] Table "${name}" failed, trying next alias if available.`);
      }
    }

    if (lastError) throw lastError;
    return [];
  })();

  inflight.set(cacheKey, request);
  try {
    return await request;
  } finally {
    inflight.delete(cacheKey);
  }
}

/** Lightweight columns for tour cards / listing pages (avoids huge description payloads). */
export const TOUR_LIST_COLUMNS =
  'id,title,slug,country,category,duration_days,duration_nights,price,image_url,cover_image,featured_image,social_image_url,published_at,status,is_featured,is_popular,show_on_landing';

export function clearCollectionCache(table?: string) {
  if (!table) {
    recordCache.clear();
    return;
  }
  for (const key of recordCache.keys()) {
    if (key === table || key.startsWith(`${table}|`)) recordCache.delete(key);
  }
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
      if (typeof item === 'string' && item.trim()) return item.trim();
      if (typeof item === 'number' && Number.isFinite(item)) return String(item);
    }
  }
  return '';
}

/** Prefer a real label over a 1–2 character junk title/slug fragment (e.g. "M" vs "Madagascar"). */
export function getRecordTitle(record: RecordRow): string {
  const preferred = ['title', 'name', 'label', 'subject', 'heading', 'keyword', 'guest_name', 'author', 'email'];
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

export function visibleRecordHtml(record: RecordRow | null | undefined, keys: string[] = ['description', 'content', 'summary', 'excerpt']): string {
  return stripEmbeddedContent(pickString(record || {}, keys));
}
