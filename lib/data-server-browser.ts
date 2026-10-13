/**
 * Browser stand-in for lib/data-server.
 * Public pages import record helpers through lib/data. The real loader opens
 * PostgreSQL and Next's server cache, which the browser bundle cannot evaluate.
 * Database calls stay on the server; this file only keeps the pure helpers.
 */
import { clearCollectionCache } from '@/lib/collection-cache';
import { blocksWithoutMedia } from '@/lib/content-blocks';
import { extractEmbeddedContent } from '@/lib/embedded-content';
import type { RecordRow } from '@/lib/types';

export { clearCollectionCache };

const SEO_INDEX_LIST_COLUMNS = 'meta_description';

export const TOUR_LIST_COLUMNS =
  `id,title,slug,seo_slug,country,category,duration_days,duration_nights,duration_label,price,image_url,social_image_url,is_featured,is_popular,show_on_landing,star_rating,review_count,created_date,updated_date,${SEO_INDEX_LIST_COLUMNS}`;

export const ADMIN_LIST_COLUMNS: Record<string, string> = {
  tours: TOUR_LIST_COLUMNS,
  accommodations:
    `id,name,seo_slug,location,country,type,image_url,social_image_url,description_title,national_park_id,national_park_name,created_date,updated_date,${SEO_INDEX_LIST_COLUMNS}`,
  national_park:
    `id,name,seo_slug,location,country,image_url,social_image_url,description_title,created_date,updated_date,${SEO_INDEX_LIST_COLUMNS}`,
  national_parks:
    `id,name,seo_slug,location,country,image_url,social_image_url,description_title,created_date,updated_date,${SEO_INDEX_LIST_COLUMNS}`,
  parks:
    `id,name,seo_slug,location,country,image_url,social_image_url,description_title,created_date,updated_date,${SEO_INDEX_LIST_COLUMNS}`,
  explore:
    `id,title,seo_slug,location,country,image_url,social_image_url,description_title,created_date,updated_date,${SEO_INDEX_LIST_COLUMNS}`,
  safari_updates:
    `id,title,slug,seo_slug,excerpt,category,image_url,social_image_url,post_type,publish_date,created_date,updated_date,${SEO_INDEX_LIST_COLUMNS}`,
  countries:
    `id,name,slug,seo_slug,tagline,image_url,social_image_url,is_popular,description_title,created_date,updated_date,${SEO_INDEX_LIST_COLUMNS}`,
  categories:
    `id,name,slug,seo_slug,country,image_url,social_image_url,description_title,created_date,updated_date,${SEO_INDEX_LIST_COLUMNS}`,
  pages: `id,title,post_title,slug,seo_slug,cover_image,social_image_url,subtitle,created_date,updated_date,${SEO_INDEX_LIST_COLUMNS}`,
  landing_pages:
    `id,title,post_title,slug,seo_slug,country,cover_image,social_image_url,subtitle,created_date,updated_date,${SEO_INDEX_LIST_COLUMNS}`,
  bookings:
    'id,customer_name,customer_email,customer_phone,tour_id,tour_title,country,status,travel_date,message,booking_code,total_amount,amount_paid,remaining_balance,payment_status,number_of_people,currency,created_date,updated_date,is_sample',
  quotations_inquiries:
    'id,client_name,email,phone,travel_destination,dates,special_requests,preferred_travel_date,number_of_guests,budget,status,created_date,updated_date,is_sample',
  quotations:
    'id,client_name,email,phone,travel_destination,dates,special_requests,preferred_travel_date,number_of_guests,budget,status,created_date,updated_date,is_sample',
  inquiries: 'id,client_name,email,phone,travel_destination,special_requests,status,created_date,updated_date',
  contact_inquiries: 'id,client_name,email,phone,special_requests,status,created_date,updated_date',
  pesapal_payments:
    'id,last_ipn_tracking_id,last_payment_status,last_verify_status,environment,last_payment_at,last_error,notification_id,created_date,updated_date,is_sample',
  reviews: 'id,customer_name,tour_title,review_text,rating,tour_id,created_date,updated_date,is_sample',
  registered_agents:
    'id,name,username,email,phone,country,company,company_website,address,bio,gender,status,role,is_active,created_at,created_date',
  notifications: 'id,title,message,type,is_read,created_date,updated_date,is_sample',
  subscribers: 'id,email,receives_newsletter,subscribed_date,last_digest_date,created_date,updated_date,is_sample',
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

function pickString(record: RecordRow, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
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

export function isPublishedRecord(record: RecordRow): boolean {
  const status = normalizePublishToken(pickString(record, ['status', 'publish_status']));
  if (!isBlankPublishToken(status)) {
    if (PUBLISHED_STATUSES.has(status)) return true;
    if (UNPUBLISHED_STATUSES.has(status)) return false;
  }

  for (const key of ['published', 'is_published', 'isPublished'] as const) {
    const flag = record[key];
    if (typeof flag === 'boolean') return flag;
  }

  const visibility = normalizePublishToken(pickString(record, ['visibility']));
  if (!isBlankPublishToken(visibility)) {
    if (PUBLISHED_STATUSES.has(visibility)) return true;
    if (UNPUBLISHED_STATUSES.has(visibility)) return false;
  }

  return true;
}

export function parseContentBlocks(value: unknown): { title: string; description: string; image_url?: string }[] {
  if (Array.isArray(value)) {
    const blocks: { title: string; description: string; image_url?: string }[] = [];
    for (const item of value) {
      if (!item || typeof item !== 'object') continue;
      const row = item as Record<string, unknown>;
      if (row.kind === 'faq' || (row.question && !row.title && !row.description)) continue;
      const title = String(row.title || '');
      const description = String(row.description || '');
      const image = String(row.image_url || row.image || '').trim();
      if (!title && !description && !image) continue;
      blocks.push({ title, description, ...(image ? { image_url: image } : {}) });
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

function recordBodyHtml(record: RecordRow | null | undefined): string {
  if (!record) return '';
  for (const key of ['description', 'content', 'body', 'html', 'text', 'overview', 'about', 'summary', 'excerpt']) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return '';
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
  return blocksWithoutMedia(extractEmbeddedContent(recordBodyHtml(record)).blocks || []);
}

export async function fetchAllRecords(): Promise<RecordRow[]> {
  return [];
}

export async function fetchCollectionRecords(): Promise<RecordRow[]> {
  return [];
}

export async function fetchCollectionPage(): Promise<{ rows: RecordRow[]; total: number }> {
  return { rows: [], total: 0 };
}

export async function fetchCollectionRecordById(): Promise<RecordRow | null> {
  return null;
}

export async function fetchFeaturedTours(): Promise<RecordRow[]> {
  return [];
}

export async function fetchParksForCountry(): Promise<RecordRow[]> {
  return [];
}

export async function fetchRecordByPublicSlug(): Promise<RecordRow | null> {
  return null;
}

export async function fetchStaysForPark(): Promise<RecordRow[]> {
  return [];
}

export async function fetchToursForCountryLabel(): Promise<RecordRow[]> {
  return [];
}

export async function resolvePublicTours(): Promise<RecordRow[]> {
  return [];
}

export async function searchTours(): Promise<RecordRow[]> {
  return [];
}

export async function countCollectionRecords(): Promise<number> {
  return 0;
}
