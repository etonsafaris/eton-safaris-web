// Client-side compatibility layer - redirects to server-side Aiven functions when running on server
import type { RecordRow } from '@/lib/types';
import { getCachedCollection, setCachedCollection } from '@/lib/collection-cache';
import { extractEmbeddedContent, stripEmbeddedContent } from '@/lib/embedded-content';
import { formatPublishedStamp } from '@/lib/public-date';
import {
  fetchCollectionRecords as fetchCollectionRecordsServer,
  fetchCollectionPage as fetchCollectionPageServer,
  fetchCollectionRecordById as fetchCollectionRecordByIdServer,
  fetchFeaturedTours as fetchFeaturedToursServer,
  fetchParksForCountry as fetchParksForCountryServer,
  fetchRecordByPublicSlug as fetchRecordByPublicSlugServer,
  fetchStaysForPark as fetchStaysForParkServer,
  fetchToursForCountryLabel as fetchToursForCountryLabelServer,
  resolvePublicTours as resolvePublicToursServer,
  searchTours as searchToursServer,
  TOUR_LIST_COLUMNS as TOUR_LIST_SELECT,
} from './data-server';

// Re-export all server-side functions from data-server.ts
export {
  clearCollectionCache,
  fetchAllRecords,
  fetchCollectionRecords as fetchCollectionRecordsServer,
  fetchCollectionPage as fetchCollectionPageServer,
  fetchCollectionRecordById as fetchCollectionRecordByIdServer,
  fetchFeaturedTours as fetchFeaturedToursServer,
  fetchParksForCountry as fetchParksForCountryServer,
  fetchRecordByPublicSlug as fetchRecordByPublicSlugServer,
  fetchStaysForPark as fetchStaysForParkServer,
  fetchToursForCountryLabel as fetchToursForCountryLabelServer,
  resolvePublicTours as resolvePublicToursServer,
  searchTours as searchToursServer,
  countCollectionRecords,
  ADMIN_LIST_COLUMNS,
  PUBLIC_LIST_COLUMNS,
  TOUR_LIST_COLUMNS,
  adminListColumnsFor,
  publicListColumnsFor,
  isPublishedRecord,
  parseContentBlocks,
  parseBlocksFromRecord,
} from './data-server';

const browser = () => typeof window !== 'undefined';
const dataUrl = (table: string, params: URLSearchParams) => `/api/data/${encodeURIComponent(table)}?${params}`;
const CLIENT_CACHE_MS = 60_000;

export async function fetchCollectionRecords(
  table: string,
  aliases: string[] = [],
  options?: { columns?: string; full?: boolean; unlimited?: boolean; maxRows?: number }
): Promise<RecordRow[]> {
  if (!browser()) return fetchCollectionRecordsServer(table, aliases, options);
  const cacheKey = ['client', table, options?.columns || '', options?.maxRows ?? '', options?.unlimited ? 'all' : '', ...aliases].join('|');
  const cached = getCachedCollection(cacheKey);
  if (cached) return cached as RecordRow[];
  for (const name of [table, ...aliases]) {
    let offset = 0;
    const rows: RecordRow[] = [];
    const pageSize = Math.min(options?.maxRows || 1000, 1000);
    while (true) {
      const params = new URLSearchParams({ limit: String(pageSize), range: `${offset}-${offset + pageSize - 1}` });
      if (options?.columns) params.set('select', options.columns);
      const response = await fetch(dataUrl(name, params), { cache: 'default', credentials: 'same-origin' });
      if (!response.ok) break;
      const body = (await response.json()) as { data?: RecordRow[] };
      const chunk = body.data || [];
      rows.push(...chunk);
      if (chunk.length < pageSize || (options?.maxRows && rows.length >= options.maxRows)) break;
      offset += pageSize;
    }
    if (rows.length > 0) {
      const result = options?.maxRows ? rows.slice(0, options.maxRows) : rows;
      setCachedCollection(cacheKey, result, CLIENT_CACHE_MS);
      return result;
    }
  }
  return [];
}

export async function fetchCollectionPage(
  table: string,
  aliases: string[] = [],
  options?: { columns?: string; limit?: number; offset?: number; orderBy?: string; ascending?: boolean; filters?: { country?: string; park?: string; category?: string } }
): Promise<{ rows: RecordRow[]; total: number }> {
  if (!browser()) return fetchCollectionPageServer(table, aliases, options);
  const params = new URLSearchParams();
  const select = options?.columns || (table === 'tours' ? TOUR_LIST_SELECT : undefined);
  const pageLimit = options?.limit || 48;
  const pageOffset = options?.offset ?? 0;
  if (select) params.set('select', select);
  params.set('limit', String(pageLimit));
  params.set('range', `${pageOffset}-${pageOffset + pageLimit - 1}`);
  if (options?.orderBy) params.set('order', `${options.orderBy}.${options.ascending === false ? 'desc' : 'asc'}`);
  params.set('count', '1');
  const filters = options?.filters || {};
  if (filters.country) params.set('ilike.country', `%${filters.country}%`);
  if (filters.park) params.set('ilike.national_park_name', `%${filters.park}%`);
  if (filters.category) params.set('ilike.category', `%${filters.category}%`);
  const response = await fetch(dataUrl(table, params), { cache: 'no-store', credentials: 'same-origin' });
  const body = (await response.json().catch(() => ({}))) as { data?: RecordRow[]; total?: number; message?: string };
  if (!response.ok) {
    console.warn(`[Admin data] ${table} page failed:`, body.message || response.status);
    return { rows: [], total: 0 };
  }
  return { rows: body.data || [], total: body.total ?? body.data?.length ?? 0 };
}

export async function fetchRecordByPublicSlug(table: string, slug: string, aliases: string[] = [], columns = '*') {
  if (!browser()) return fetchRecordByPublicSlugServer(table, slug, aliases, columns);
  for (const name of [table, ...aliases]) {
    for (const column of ['slug', 'seo_slug', 'id']) {
      const params = new URLSearchParams({ [`eq.${column}`]: slug, limit: '1' });
      const response = await fetch(dataUrl(name, params), { cache: 'default' });
      const body = (await response.json().catch(() => ({}))) as { data?: RecordRow[] };
      if (body.data?.[0]) return body.data[0];
    }
    const label = decodeURIComponent(String(slug))
      .replace(/-/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (label.length >= 4) {
      for (const column of ['title', 'name']) {
        const params = new URLSearchParams({
          [`ilike.${column}`]: `%${label}%`,
          limit: '1',
        });
        const response = await fetch(dataUrl(name, params), { cache: 'default' });
        const body = (await response.json().catch(() => ({}))) as { data?: RecordRow[] };
        if (body.data?.[0]) return body.data[0];
      }
    }
  }
  return null;
}

async function fetchTourRows(params: URLSearchParams) {
  params.set('select', TOUR_LIST_SELECT);
  const response = await fetch(dataUrl('tours', params), { cache: 'default' });
  if (!response.ok) return [] as RecordRow[];
  const body = (await response.json().catch(() => ({}))) as { data?: RecordRow[] };
  return body.data || [];
}

export async function fetchFeaturedTours(limit = 24) {
  if (!browser()) return fetchFeaturedToursServer(limit);
  const featured = await fetchTourRows(new URLSearchParams({ limit: String(limit), 'eq.is_featured': 'true' }));
  if (featured.length) return featured;
  return fetchTourRows(new URLSearchParams({ limit: String(limit), order: 'created_date.desc' }));
}

export async function fetchToursForCountryLabel(countryLabel: string, limit = 48) {
  if (!browser()) return fetchToursForCountryLabelServer(countryLabel, limit);
  const rows = await fetchTourRows(
    new URLSearchParams({ limit: String(limit), 'ilike.country': `%${countryLabel}%` })
  );
  if (rows.length) return rows;
  return fetchFeaturedTours(Math.min(limit, 24));
}

export async function resolvePublicTours(options?: { country?: string; limit?: number; excludeId?: string }) {
  if (!browser()) return resolvePublicToursServer(options);
  const capped = Math.max(1, Math.min(options?.limit ?? 12, 48));
  const excludeId = options?.excludeId != null ? String(options.excludeId) : '';
  const keep = (rows: RecordRow[]) =>
    rows.filter((row) => !excludeId || String(row.id) !== excludeId).slice(0, capped);
  const country = String(options?.country || '').trim();
  if (country) {
    const byCountry = keep(await fetchToursForCountryLabel(country, capped));
    if (byCountry.length) return byCountry;
  }
  return keep(await fetchFeaturedTours(capped));
}

export async function fetchParksForCountry(countryLabel: string, limit = 200, countryId?: string) {
  if (!browser()) return fetchParksForCountryServer(countryLabel, limit);
  const rows: RecordRow[] = [];
  const seen = new Set<string>();
  if (countryId) {
    const params = new URLSearchParams({ limit: String(limit), 'eq.country_id': countryId });
    const response = await fetch(dataUrl('national_park', params), { cache: 'default' });
    if (response.ok) {
      const body = (await response.json().catch(() => ({}))) as { data?: RecordRow[] };
      for (const row of body.data || []) {
        const key = String(row.id || getRecordTitle(row)).toLowerCase();
        if (key && !seen.has(key)) {
          seen.add(key);
          rows.push(row);
        }
      }
    }
  }
  for (const column of ['country', 'country_name', 'destination', 'location']) {
    const params = new URLSearchParams({ limit: String(limit), [`ilike.${column}`]: `%${countryLabel}%` });
    const response = await fetch(dataUrl('national_park', params), { cache: 'default' });
    if (!response.ok) continue;
    const body = (await response.json().catch(() => ({}))) as { data?: RecordRow[] };
    for (const row of body.data || []) {
      const key = String(row.id || getRecordTitle(row)).toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        rows.push(row);
      }
    }
    if (rows.length >= limit) break;
  }
  return rows.slice(0, limit);
}

export async function fetchStaysForPark(parkName: string, limit = 10, parkId?: string) {
  if (!browser()) return fetchStaysForParkServer(parkName, limit, parkId);
  const rows: RecordRow[] = [];
  const seen = new Set<string>();
  if (parkId) {
    const idParams = new URLSearchParams({ limit: String(limit), 'eq.national_park_id': parkId });
    const idResponse = await fetch(dataUrl('accommodations', idParams), { cache: 'default' });
    if (idResponse.ok) {
      const body = (await idResponse.json().catch(() => ({}))) as { data?: RecordRow[] };
      for (const row of body.data || []) {
        const key = String(row.id || getRecordTitle(row)).toLowerCase();
        if (key && !seen.has(key)) {
          seen.add(key);
          rows.push(row);
        }
      }
    }
  }
  const { stayMatchesParkLoose } = await import('@/lib/park-stay-match');
  const columns = ['national_park_name', 'national_park', 'park_name', 'park'];
  for (const column of columns) {
    const params = new URLSearchParams({ limit: String(Math.max(limit, 48)), [`ilike.${column}`]: `%${parkName}%` });
    const response = await fetch(dataUrl('accommodations', params), { cache: 'default' });
    if (!response.ok) continue;
    const body = (await response.json().catch(() => ({}))) as { data?: RecordRow[] };
    for (const row of body.data || []) {
      if (!stayMatchesParkLoose(row, parkName, parkId)) continue;
      const key = String(row.id || getRecordTitle(row)).toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        rows.push(row);
      }
    }
    if (rows.length >= limit) break;
  }
  return rows.slice(0, limit);
}

export async function searchTours(options: {
  query?: string;
  country?: string;
  category?: string;
  limit?: number;
}) {
  if (!browser()) return searchToursServer(options);
  const params = new URLSearchParams({ limit: String(options.limit || 24) });
  if (options.query) params.set('ilike.title', `%${options.query}%`);
  if (options.country && !/^all destinations$/i.test(options.country)) {
    params.set('ilike.country', `%${options.country}%`);
  }
  if (options.category) params.set('ilike.category', `%${options.category}%`);
  const rows = await fetchTourRows(params);
  return rows;
}

export async function fetchCollectionRecordById(table: string, id: string | number, aliases: string[] = []) {
  if (!browser()) return fetchCollectionRecordByIdServer(table, String(id), aliases);
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
    const { loadAdminEditRecord } = await import('@/lib/admin-records-client');
    const adminRow = await loadAdminEditRecord(table, id, aliases);
    if (adminRow) return adminRow;
  }
  for (const name of [table, ...aliases]) {
    const params = new URLSearchParams({ 'eq.id': String(id), limit: '1', select: '*' });
    const response = await fetch(dataUrl(name, params), { cache: 'no-store', credentials: 'same-origin' });
    if (!response.ok) continue;
    const body = (await response.json().catch(() => ({}))) as { data?: RecordRow[] };
    if (body.data?.[0]) return body.data[0];
  }
  return null;
}

// Keep utility functions that are used by client components
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
    if (typeof value === 'string' && value.trim()) {
      found = value.trim();
      break;
    }
  }
  return found;
}

export function getRecordTitle(record: RecordRow): string {
  const preferred = ['title', 'name', 'label', 'subject', 'heading', 'keyword', 'guest_name', 'customer_name', 'author', 'email'];
  for (const key of preferred) {
    const value = record[key];
    if (value && typeof value === 'string' && value.length >= 3) return value;
  }
  for (const key of Object.keys(record)) {
    if (preferred.includes(key) || key === 'slug' || key === 'seo_slug') continue;
    const value = record[key];
    if (value && typeof value === 'string' && value.length >= 3) return value;
  }
  return 'Untitled';
}

export function pickString(record: RecordRow, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = record[key];
    if (value && typeof value === 'string') return value;
  }
  return fallback;
}

export function pickStoredString(record: RecordRow | null | undefined, keys: string[], fallback = ''): string {
  if (!record) return fallback;
  return pickString(record, keys, fallback);
}

export function pickNumber(record: RecordRow, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value && !Number.isNaN(Number(value))) return Number(value);
  }
  return fallback;
}

export function pickRecordId(record: RecordRow | null | undefined): string | number | null {
  if (!record) return null;
  return record.id ?? record.ID ?? record.Id ?? null;
}

export function pickDateValue(record: RecordRow, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = record[key];
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
    if (typeof value === 'number' && Number.isFinite(value)) {
      const date = new Date(value > 1e12 ? value : value * 1000);
      if (!Number.isNaN(date.getTime())) return date.toISOString();
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed && !/^(null|undefined|—|-|n\/a|none)$/i.test(trimmed)) return trimmed;
    }
  }
  return fallback;
}

const PUBLISHED_DATE_KEYS = [
  'published_at',
  'publishedAt',
  'published_date',
  'publish_date',
  'publishDate',
  'created_at',
  'createdAt',
  'created_date',
  'updated_at',
  'updatedAt',
  'updated_date',
  'date',
];

function dateFromMillisId(record: RecordRow): string {
  const match = /^(\d{13})(?:-|$)/.exec(String(record.id ?? ''));
  if (!match) return '';
  const date = new Date(Number(match[1]));
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

export function recordPublishedAt(record: RecordRow | null | undefined): string {
  if (!record) return '';
  const top = pickDateValue(record, PUBLISHED_DATE_KEYS);
  if (top) return top;
  const html = ['content', 'description', 'body', 'excerpt', 'summary']
    .map((key) => (typeof record[key] === 'string' ? record[key] : ''))
    .filter(Boolean)
    .join('\n');
  const embedded = extractEmbeddedContent(html);
  const fromEmbed = pickDateValue((embedded.fields || {}) as RecordRow, PUBLISHED_DATE_KEYS);
  if (fromEmbed) return fromEmbed;
  for (const key of ['seo_schema', 'seo', 'meta', '_etonSeo']) {
    const nested = record[key];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      const value = pickDateValue(nested as RecordRow, PUBLISHED_DATE_KEYS);
      if (value) return value;
    }
  }
  return dateFromMillisId(record);
}

export function formatPublishedDate(record: RecordRow | null | undefined): string {
  return formatPublishedStamp(recordPublishedAt(record));
}

export function publishStampForSave(value: string, isEdit: boolean): string {
  return isEdit && value ? value : value || new Date().toISOString();
}

export function isLanguagePost(record: RecordRow): boolean {
  return pickString(record, ['post_type', 'type']).toLowerCase().includes('language');
}

export function formatColumnLabel(column: string): string {
  return column.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getDynamicColumns(records: RecordRow[]): string[] {
  return Array.from(new Set(records.flatMap((record) => Object.keys(record))));
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
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

export function visibleRecordHtml(record: RecordRow | null | undefined, keys: string[] = ['description', 'content', 'summary', 'excerpt', 'overview', 'about', 'body']): string {
  return stripEmbeddedContent(pickString(record || {}, keys));
}