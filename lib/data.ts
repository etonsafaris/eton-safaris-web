// Client-side compatibility layer - redirects to server-side Aiven functions when running on server
import type { RecordRow } from '@/lib/types';
import { extractEmbeddedContent, stripEmbeddedContent } from '@/lib/embedded-content';

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

export async function fetchCollectionRecords(
  table: string,
  aliases: string[] = [],
  options?: { columns?: string; full?: boolean; unlimited?: boolean; maxRows?: number }
): Promise<RecordRow[]> {
  if (!browser()) return fetchCollectionRecordsServer(table, aliases, options);
  for (const name of [table, ...aliases]) {
    let offset = 0;
    const rows: RecordRow[] = [];
    while (true) {
      const params = new URLSearchParams({ limit: '1000', range: `${offset}-${offset + 999}` });
      if (options?.columns) params.set('select', options.columns);
      const response = await fetch(dataUrl(name, params), { cache: 'no-store' });
      if (!response.ok) break;
      const body = (await response.json()) as { data?: RecordRow[] };
      const chunk = body.data || [];
      rows.push(...chunk);
      if (chunk.length < 1000 || (options?.maxRows && rows.length >= options.maxRows)) break;
      offset += 1000;
    }
    if (rows.length > 0) return options?.maxRows ? rows.slice(0, options.maxRows) : rows;
    /* try aliases */
    /*
    if (options?.columns) params.set('select', options.columns);
    if (options?.maxRows) params.set('limit', String(options.maxRows));
    const response = await fetch(dataUrl(name, params), { cache: 'no-store' });
    if (response.ok) {
      const body = (await response.json()) as { data?: RecordRow[] };
      return body.data || [];
    }
    */
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
  if (options?.columns) params.set('select', options.columns);
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('range', `${options.offset}-${(options.offset + (options.limit || 48)) - 1}`);
  if (options?.orderBy) params.set('order', `${options.orderBy}.${options.ascending === false ? 'desc' : 'asc'}`);
  const filters = options?.filters || {};
  if (filters.country) params.set('ilike.country', `%${filters.country}%`);
  if (filters.park) params.set('ilike.national_park_name', `%${filters.park}%`);
  if (filters.category) params.set('ilike.category', `%${filters.category}%`);
  const response = await fetch(dataUrl(table, params), { cache: 'no-store' });
  const body = (await response.json().catch(() => ({}))) as { data?: RecordRow[] };
  return { rows: body.data || [], total: body.total ?? body.data?.length ?? 0 };
}

export async function fetchRecordByPublicSlug(table: string, slug: string, aliases: string[] = [], columns = '*') {
  if (!browser()) return fetchRecordByPublicSlugServer(table, slug, aliases, columns);
  for (const name of [table, ...aliases]) {
    for (const column of ['slug', 'seo_slug', 'id']) {
      const params = new URLSearchParams({ [`eq.${column}`]: slug, limit: '1' });
      const response = await fetch(dataUrl(name, params), { cache: 'no-store' });
      const body = (await response.json().catch(() => ({}))) as { data?: RecordRow[] };
      if (body.data?.[0]) return body.data[0];
    }
  }
  return null;
}

export async function fetchFeaturedTours(limit = 24) {
  if (!browser()) return fetchFeaturedToursServer(limit);
  const params = new URLSearchParams({ limit: String(limit), 'eq.is_featured': 'true' });
  const response = await fetch(dataUrl('tours', params), { cache: 'no-store' });
  const body = (await response.json().catch(() => ({}))) as { data?: RecordRow[] };
  return body.data || [];
}

export async function fetchToursForCountryLabel(countryLabel: string, limit = 48) {
  if (!browser()) return fetchToursForCountryLabelServer(countryLabel, limit);
  const params = new URLSearchParams({ limit: String(limit), 'ilike.country': `%${countryLabel}%` });
  const response = await fetch(dataUrl('tours', params), { cache: 'no-store' });
  const body = (await response.json().catch(() => ({}))) as { data?: RecordRow[] };
  return body.data || [];
}

export async function fetchParksForCountry(countryLabel: string, limit = 200) {
  if (!browser()) return fetchParksForCountryServer(countryLabel, limit);
  const rows: RecordRow[] = [];
  const seen = new Set<string>();
  for (const column of ['country', 'country_name', 'destination', 'location']) {
    const params = new URLSearchParams({ limit: String(limit), [`ilike.${column}`]: `%${countryLabel}%` });
    const response = await fetch(dataUrl('national_park', params), { cache: 'no-store' });
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
  const params = new URLSearchParams({ limit: String(limit), 'ilike.national_park_name': `%${parkName}%` });
  if (parkId) params.set('eq.national_park_id', parkId);
  const response = await fetch(dataUrl('accommodations', params), { cache: 'no-store' });
  const body = (await response.json().catch(() => ({}))) as { data?: RecordRow[] };
  return body.data || [];
}

export async function searchTours(options: { query: string; limit?: number }) {
  if (!browser()) return searchToursServer(options);
  const params = new URLSearchParams({
    limit: String(options.limit || 24),
    'ilike.title': `%${options.query}%`,
  });
  const response = await fetch(dataUrl('tours', params), { cache: 'no-store' });
  const body = (await response.json().catch(() => ({}))) as { data?: RecordRow[] };
  return body.data || [];
}

export async function fetchCollectionRecordById(table: string, id: string | number, aliases: string[] = []) {
  if (!browser()) return fetchCollectionRecordByIdServer(table, String(id), aliases);
  const params = new URLSearchParams({ 'eq.id': String(id), limit: '1' });
  const response = await fetch(dataUrl(table, params), { cache: 'no-store' });
  const body = (await response.json().catch(() => ({}))) as { data?: RecordRow[] };
  return body.data?.[0] || null;
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
  return pickString(record, keys, fallback);
}

export function recordPublishedAt(record: RecordRow | null | undefined): string {
  return pickString(record || {}, ['published_at', 'publishedAt', 'published_date']);
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