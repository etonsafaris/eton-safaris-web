// Client-side compatibility layer - redirects to server-side Aiven functions when running on server
import type { RecordRow } from '@/lib/types';
import { extractEmbeddedContent, stripEmbeddedContent } from '@/lib/embedded-content';

// Re-export all server-side functions from data-server.ts
export {
  clearCollectionCache,
  fetchAllRecords,
  fetchCollectionRecords,
  fetchCollectionPage,
  fetchCollectionRecordById,
  fetchFeaturedTours,
  fetchParksForCountry,
  fetchRecordByPublicSlug,
  fetchStaysForPark,
  fetchToursForCountryLabel,
  searchTours,
  countCollectionRecords,
  ADMIN_LIST_COLUMNS,
  PUBLIC_LIST_COLUMNS,
  TOUR_LIST_COLUMNS,
  adminListColumnsFor,
  publicListColumnsFor,
  isPublishedRecord,
} from './data-server';

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