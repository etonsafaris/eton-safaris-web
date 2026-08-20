import { supabase } from '@/lib/supabase/client';
import { extractEmbeddedContent, recordBodyHtml, stripEmbeddedContent } from '@/lib/embedded-content';
import { decodeHtmlEntities } from '@/lib/sanitize-html';
import { rememberKnownColumns } from '@/lib/supabase-payload';
import { isDeployableImageUrl } from '@/lib/public-image';
import type { RecordRow } from '@/lib/types';

const PAGE_SIZE = 1000;
const FETCH_CACHE_MS = 5 * 60_000;
const recordCache = new Map<string, { expires: number; rows: RecordRow[] }>();
const inflight = new Map<string, Promise<RecordRow[]>>();

export async function fetchAllRecords(tableName: string): Promise<RecordRow[]> {
  const allRows: RecordRow[] = [];
  let start = 0;

  while (true) {
    const end = start + PAGE_SIZE - 1;
    const { data, error } = await supabase.from(tableName).select('*').range(start, end);

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

export async function fetchCollectionRecords(table: string, aliases: string[] = []): Promise<RecordRow[]> {
  const cacheKey = [table, ...aliases].join('|');
  const cached = recordCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.rows;
  const pending = inflight.get(cacheKey);
  if (pending) return pending;

  const request = (async () => {
    const names = [table, ...aliases];
    let lastError: unknown = null;

    for (const name of names) {
      try {
        const rows = await fetchAllRecords(name);
        recordCache.set(cacheKey, { expires: Date.now() + FETCH_CACHE_MS, rows });
        return rows;
      } catch (error) {
        lastError = error;
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
  for (const key of preferred) {
    const value = record[key];
    if (isUsableImageUrl(value)) return value.trim();
  }
  for (const key of Object.keys(record)) {
    if (!/image|photo|thumbnail|cover|banner|picture|avatar|featured/.test(key)) continue;
    const value = record[key];
    if (isUsableImageUrl(value)) return value.trim();
  }
  const html = recordBodyHtml(record);
  const fromHtml = /<img[^>]+src=["']([^"']+)["']/i.exec(html)?.[1]?.trim();
  return fromHtml && isUsableImageUrl(fromHtml) ? fromHtml : null;
}

export function getRecordTitle(record: RecordRow): string {
  const preferred = ['title', 'name', 'label', 'subject', 'heading', 'keyword', 'guest_name', 'author', 'email'];
  for (const key of preferred) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  const firstString = Object.keys(record).find((key) => typeof record[key] === 'string' && String(record[key]).length > 0);
  return firstString ? String(record[firstString]) : 'Untitled';
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
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value;
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
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

export function pickDateValue(record: RecordRow | null | undefined, keys: string[]): string {
  if (!record) return '';
  for (const key of keys) {
    const value = record[key];
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
    if (typeof value === 'number' && Number.isFinite(value)) return new Date(value).toISOString();
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

export function recordPublishedAt(record: RecordRow | null | undefined): string {
  const fromColumns = pickDateValue(record, ['published_at', 'created_at', 'updated_at']);
  if (fromColumns) return fromColumns;
  const fromEmbed = extractEmbeddedContent(recordBodyHtml(record)).fields?.published_at;
  if (fromEmbed?.trim()) return fromEmbed.trim();
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

export function isPublishedRecord(record: RecordRow): boolean {
  const status = pickString(record, ['status', 'visibility', 'publish_status']).toLowerCase();
  if (!status) return true;
  return !['draft', 'unpublished', 'deleted', 'archived', 'private', 'admin-only', 'admin only', 'hidden'].includes(
    status
  );
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

export function parseContentBlocks(value: unknown): { title: string; description: string; image_url?: string }[] {
  if (Array.isArray(value)) {
    const blocks: { title: string; description: string; image_url?: string }[] = [];
    for (const item of value) {
      if (!item || typeof item !== 'object') continue;
      const row = item as Record<string, unknown>;
      const title = String(row.title || '');
      const description = String(row.description || '');
      const image_url = String(row.image_url || row.image || '');
      if (!title && !description) continue;
      blocks.push({ title, description, image_url });
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
