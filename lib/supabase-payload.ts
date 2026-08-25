import { ALL_COLLECTIONS } from '@/lib/collections';
import type { FormField } from '@/lib/types';
import { packSeoSettings, type SeoValues } from '@/lib/seo';

/** Columns that must never be written (UI aliases or missing from Supabase). */
const BLOCKED_COLUMNS = new Set([
  'seo_slug',
  'focus_keyword',
]);

/** Read-only / server-managed columns. */
const READ_ONLY_COLUMNS = new Set(['id', 'created_at', 'updated_at', 'created_by']);

/** SEO columns commonly present on content tables. */
const CONTENT_SEO_COLUMNS = [
  'seo_title',
  'meta_description',
  'focus_keyphrase',
  'focus_keywords',
  'social_image_url',
  'slug',
  'seo_schema',
  'schema_type',
  'canonical_url',
  'robots_index',
  'robots_follow',
  'robots_advanced',
  'breadcrumb_title',
  'og_title',
  'og_description',
  'seo_settings',
];

export const CONTENT_TABLES = new Set([
  'tours',
  'safari_updates',
  'countries',
  'categories',
  'national_park',
  'accommodations',
  'explore',
  'pages',
  'landing_pages',
  'keywords',
]);

/** Columns used by dedicated admin forms but not listed in collection field configs. */
const TABLE_EXTRA_COLUMNS: Record<string, string[]> = {
  tours: [
    'highlights',
    'price_includes',
    'price_excludes',
    'journey_details',
    'journey_map_url',
    'featured',
    'itineraries',
    'group_size',
    'published_at',
  ],
  safari_updates: ['post_blocks', 'post_type', 'country', 'published_at'],
  national_park: ['park_blocks', 'published_at'],
  accommodations: ['accommodation_blocks', 'national_park', 'park', 'park_name', 'published_at'],
  explore: ['place_blocks', 'published_at'],
  countries: ['published_at', 'faqs', 'post_blocks', 'best_time_to_visit', 'best_time', 'status'],
  categories: ['published_at', 'faqs', 'post_blocks'],
  pages: [
    'published_at',
    'excerpt',
    'layout',
    'hero_title',
    'subtitle',
    'video_url',
    'destinations',
    'faqs',
    'status',
    'page_blocks',
    'cta_label',
    'cta_href',
  ],
  landing_pages: ['published_at', 'excerpt', 'headline', 'hero_title', 'faqs', 'status', 'offer_line', 'ready_heading', 'cta_label', 'cta_href'],
  keywords: ['keywords', 'country', 'category', 'created_date', 'updated_date'],
  registered_agents: [
    'status',
    'company',
    'bio',
    'gender',
    'company_website',
    'address',
    'username',
    'role',
    'user_id',
    'is_active',
    'approval_token',
    'allowed_modules',
  ],
  inquiries: [
    'name',
    'email',
    'message',
    'tour',
    'phone',
    'travel_date',
    'guests',
    'title',
    'status',
    'destination',
    'agent_email',
    'source',
  ],
  bookings: [
    'phone',
    'guests',
    'message',
    'agent_email',
    'travel_plans',
    'booking_code',
    'amount_paid',
    'remaining_balance',
    'final_tour_price',
    'payment_status',
    'gender',
    'travel_date',
    'country',
  ],
  pesapal_payments: [
    'payment_type',
    'total_amount',
    'remaining_balance',
    'currency',
    'tour',
    'booking_id',
    'order_tracking_id',
    'pesapal_amount',
  ],
  reviews: ['source_url', 'email', 'country'],
  profiles: ['full_name', 'phone', 'allowed_modules', 'status', 'must_change_password'],
  quotations_inquiries: [
    'base_price',
    'total_price',
    'agreed_price',
    'expiration_days',
    'guests',
    'travel_date',
    'tour',
    'phone',
    'inquiry_id',
    'accepted_by',
    'title',
    'destination',
    'agent_email',
    'source',
    'quoted_at',
  ],
  notifications: ['title', 'message', 'category', 'body', 'content', 'status', 'read', 'seen', 'is_read'],
  subscribers: ['email', 'name', 'phone', 'last_digest_at'],
};

const NUMERIC_FIELDS = new Set([
  'duration_days',
  'rating',
  'amount',
  'total_amount',
  'remaining_balance',
  'amount_paid',
  'final_tour_price',
  'price',
]);
const BOOLEAN_FIELDS = new Set(['featured', 'must_change_password', 'robots_index', 'robots_follow']);

const knownColumnsByTable = new Map<string, Set<string>>();
const missingColumnsByTable = new Map<string, Set<string>>();

export function normalizeColumnName(key: string): string {
  return key.trim().toLowerCase();
}

function missingSet(table: string): Set<string> {
  let set = missingColumnsByTable.get(table);
  if (!set) {
    set = new Set();
    missingColumnsByTable.set(table, set);
  }
  return set;
}

export function rememberMissingColumn(table: string, column: string) {
  const name = normalizeColumnName(column);
  if (!name) return;
  missingSet(table).add(name);
  const known = knownColumnsByTable.get(table);
  known?.delete(name);
}

['registered_agents', 'Agent'].forEach((table) => {
  rememberMissingColumn(table, 'address');
});

export function getMissingColumns(table: string): Set<string> {
  return new Set(missingSet(table));
}

export function rememberKnownColumns(table: string, columns: string[]) {
  const next = knownColumnsByTable.get(table) ?? new Set<string>();
  const missing = missingSet(table);
  for (const column of columns) {
    const name = normalizeColumnName(column);
    if (!name || missing.has(name)) continue;
    next.add(name);
  }
  knownColumnsByTable.set(table, next);
}

export function getKnownColumns(table: string): string[] {
  return Array.from(knownColumnsByTable.get(table) ?? []);
}

function getCollectionForTable(table: string) {
  return ALL_COLLECTIONS.find((item) => item.table === table || item.aliases?.includes(table));
}

function getFieldTypeMap(table: string): Map<string, FormField['type']> {
  const config = getCollectionForTable(table);
  const map = new Map<string, FormField['type']>();
  config?.fields.forEach((field) => map.set(field.name, field.type));
  return map;
}

/** Static allowlist derived from collection configs + known form extras. */
export function getStaticAllowedColumns(table: string): Set<string> {
  const config = getCollectionForTable(table);
  const fieldNames = config?.fields.map((field) => field.name) ?? [];
  const extras = TABLE_EXTRA_COLUMNS[table] ?? [];
  const seo = CONTENT_TABLES.has(table) ? CONTENT_SEO_COLUMNS : [];
  return new Set([...fieldNames, ...extras, ...seo].map(normalizeColumnName));
}

export function seoValuesToTablePayload(table: string, values: SeoValues): Record<string, unknown> {
  const allowed = getStaticAllowedColumns(table);
  const raw: Record<string, unknown> = {
    focus_keyphrase: values.focus_keyphrase,
    focus_keywords: values.focus_keywords,
    social_image_url: values.social_image_url,
    seo_title: values.seo_title,
    slug: values.slug,
    meta_description: values.meta_description,
    seo_schema: values.seo_schema,
    schema_type: values.schema_type,
    canonical_url: values.canonical_url,
    robots_index: values.robots_index,
    robots_follow: values.robots_follow,
    robots_advanced: values.robots_advanced.join(','),
    breadcrumb_title: values.breadcrumb_title,
    og_title: values.og_title,
    og_description: values.og_description,
    seo_settings: packSeoSettings(values),
  };

  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!allowed.has(key) || BLOCKED_COLUMNS.has(key)) continue;
    payload[key] = value === '' || (Array.isArray(value) && value.length === 0) ? null : value;
  }
  return payload;
}

function coerceValue(key: string, value: unknown, fieldType?: FormField['type']): unknown {
  if (value === undefined) return undefined;
  if (value === '') {
    if (['title', 'name', 'slug', 'keyword', 'email'].includes(key)) return value;
    return null;
  }

  if (BOOLEAN_FIELDS.has(key)) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value === 'true' || value === '1';
    return Boolean(value);
  }

  if (fieldType === 'number' || NUMERIC_FIELDS.has(key)) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const parsed = Number(String(value).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return value;
}

function allowedColumnsForTable(table: string, knownColumns?: string[]): Set<string> | null {
  const missing = getMissingColumns(table);
  const discovered = knownColumns && knownColumns.length > 0 ? knownColumns : getKnownColumns(table);

  if (discovered.length > 0) {
    return new Set(
      discovered
        .map(normalizeColumnName)
        .filter((column) => column && !READ_ONLY_COLUMNS.has(column) && !BLOCKED_COLUMNS.has(column) && !missing.has(column))
    );
  }

  return new Set(
    [...getStaticAllowedColumns(table)].filter(
      (column) => !READ_ONLY_COLUMNS.has(column) && !BLOCKED_COLUMNS.has(column) && !missing.has(column)
    )
  );
}

/**
 * Strip unknown columns and coerce values before Supabase insert/update.
 * When live schema columns are known, only those columns are sent (intersect, never union extras).
 */
export function sanitizePayload(
  table: string,
  payload: Record<string, unknown>,
  knownColumns?: string[]
): Record<string, unknown> {
  const allowed = allowedColumnsForTable(table, knownColumns);
  const fieldTypes = getFieldTypeMap(table);
  const missing = getMissingColumns(table);
  const clean: Record<string, unknown> = {};

  for (const [rawKey, value] of Object.entries(payload)) {
    const key = normalizeColumnName(rawKey);
    if (!key || READ_ONLY_COLUMNS.has(key) || BLOCKED_COLUMNS.has(key) || missing.has(key)) continue;
    if (allowed && !allowed.has(key)) continue;

    const coerced = coerceValue(key, value, fieldTypes.get(key));
    if (coerced !== undefined) {
      clean[key] = coerced;
    }
  }

  return clean;
}

export function buildSavePayload(
  table: string,
  payload: Record<string, unknown>,
  options?: { seo?: SeoValues; knownColumns?: string[]; keepId?: boolean }
): Record<string, unknown> {
  const merged = options?.seo
    ? { ...payload, ...seoValuesToTablePayload(table, options.seo) }
    : { ...payload };

  const clean = sanitizePayload(table, merged, options?.knownColumns);
  if (options?.keepId && merged.id !== undefined && merged.id !== null && merged.id !== '') {
    clean.id = merged.id;
  }
  return clean;
}

/** Prefer live schema columns; if none are known yet, keep caller fields minus blocked/readonly/missing. */
export function prepareMutationPayload(
  table: string,
  payload: Record<string, unknown>,
  options?: { knownColumns?: string[]; keepId?: boolean }
): Record<string, unknown> {
  const known = options?.knownColumns?.length ? options.knownColumns : getKnownColumns(table);
  if (known.length > 0) {
    return buildSavePayload(table, payload, { knownColumns: known, keepId: options?.keepId });
  }

  const missing = getMissingColumns(table);
  const clean: Record<string, unknown> = {};
  for (const [rawKey, value] of Object.entries(payload)) {
    if (value === undefined) continue;
    const key = normalizeColumnName(rawKey);
    if (!key || BLOCKED_COLUMNS.has(key) || missing.has(key)) continue;
    if (READ_ONLY_COLUMNS.has(key) && !(options?.keepId && key === 'id')) continue;
    clean[key] = value === '' && !['title', 'name', 'slug', 'keyword', 'email'].includes(key) ? null : value;
  }
  return clean;
}
