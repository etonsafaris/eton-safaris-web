import { SITE } from '@/lib/collections';
import {
  getRecordImage,
  getRecordTitle,
  pickPlainText,
  pickString,
  publicRecordSlug,
  slugify,
  visibleRecordHtml,
} from '@/lib/data';
import { isDeployableImageUrl } from '@/lib/public-image';
import {
  buildDefaultJsonLd,
  CONTENT_SCHEMA_DEFAULTS,
  defaultSeoValues,
  seoValuesFromRecord,
  type SeoContentType,
  type SeoValues,
} from '@/lib/seo';
import { indexableContentKindForTable, type IndexableContentKind } from '@/lib/public-indexing';
import { resolvePublicSiteOrigin } from '@/lib/site-origin';
import type { RecordRow } from '@/lib/types';

const MIN_BODY_WORDS: Record<IndexableContentKind, number> = {
  tour: 80,
  park: 60,
  stay: 100,
  place: 60,
  article: 120,
  category: 40,
  country: 100,
  page: 40,
};

function clip(text: string, max: number) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}

function wordCount(text: string) {
  const clean = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return 0;
  return clean.split(' ').filter(Boolean).length;
}

export function publicSiteBaseUrl() {
  return resolvePublicSiteOrigin();
}

function kindToContentType(kind: IndexableContentKind): SeoContentType {
  return kind;
}

function defaultMetaDescription(record: RecordRow, title: string, country: string) {
  const plain = pickPlainText(record, ['excerpt', 'summary', 'description', 'content', 'tagline']);
  if (plain.length >= 70) return clip(plain, 155);
  const base = `Discover ${title}${country ? ` in ${country}` : ''} with Eton Safaris — expert safari planning, trusted guides, and tailor-made itineraries across Africa.`;
  return clip(base, 155);
}

function ensureBodyCopy(record: RecordRow, kind: IndexableContentKind, title: string, country: string) {
  const current = visibleRecordHtml(record);
  const plain = pickPlainText(record, ['description', 'content', 'excerpt', 'summary']);
  const words = Math.max(wordCount(current), wordCount(plain));
  if (words >= MIN_BODY_WORDS[kind]) return undefined;

  const filler = `${title}${country ? ` in ${country}` : ''} with Eton Safaris. We arrange lodges, park permits, transport, and guided safaris with experienced local teams. Share your travel dates and interests for a tailored itinerary.`;
  if (current.trim()) {
    if (/<[a-z][\s\S]*>/i.test(current)) {
      return `${current}\n<p>${filler}</p>`;
    }
    return `${current}\n\n${filler}`;
  }
  return `<p>${filler}</p>`;
}

export type AutoIndexSeoResult = {
  recordPatch: Record<string, unknown>;
  seo: SeoValues;
};

export function applyAutoIndexSeo(
  record: RecordRow,
  kind: IndexableContentKind,
  options?: { publicPath?: string; enableGoogle?: boolean }
): AutoIndexSeoResult {
  const contentType = kindToContentType(kind);
  const existing = seoValuesFromRecord(record);
  const title = getRecordTitle(record) || 'Untitled';
  const country = pickString(record, ['country']);
  const slug = publicRecordSlug(record) || pickString(record, ['slug', 'seo_slug']) || slugify(title);
  const path = options?.publicPath || `/${kind === 'stay' ? 'accommodations' : kind === 'park' ? 'parks' : `${kind}s`}/${slug}`;
  const canonical = existing.canonical_url.trim() || `${publicSiteBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  const image = existing.social_image_url || getRecordImage(record) || '';
  const metaDescription =
    existing.meta_description.trim().length >= 70
      ? clip(existing.meta_description, 155)
      : defaultMetaDescription(record, title, country);
  const seoTitle = existing.seo_title.trim() || clip(`${title}${country ? ` | ${country}` : ''} | Eton Safaris`, 60);
  const focusKeyphrase =
    existing.focus_keyphrase.trim() ||
    `${title}${country ? ` ${country}` : ''}`.toLowerCase().replace(/\s+/g, ' ').trim();
  const enableGoogle = true;

  const seo: SeoValues = {
    ...defaultSeoValues(contentType),
    ...existing,
    seo_title: seoTitle,
    slug,
    meta_description: metaDescription,
    social_image_url: image,
    schema_type: existing.schema_type || CONTENT_SCHEMA_DEFAULTS[contentType],
    canonical_url: canonical,
    robots_index: enableGoogle,
    robots_follow: true,
    focus_keyphrase: focusKeyphrase,
    og_title: existing.og_title.trim() || clip(title, 70),
    og_description: existing.og_description.trim() || metaDescription,
    breadcrumb_title: existing.breadcrumb_title.trim() || title,
    focus_keywords:
      existing.focus_keywords.length > 0
        ? existing.focus_keywords
        : [focusKeyphrase, `${country} safari`.trim(), 'Eton Safaris'].filter(Boolean),
  };

  if (!seo.seo_schema.trim()) {
    seo.seo_schema = JSON.stringify(
      buildDefaultJsonLd(seo, {
        title: seoTitle,
        description: metaDescription,
        url: canonical,
        image: isDeployableImageUrl(image) ? image : undefined,
        siteName: SITE.name,
        siteUrl: publicSiteBaseUrl(),
      }),
      null,
      2
    );
  }

  const recordPatch: Record<string, unknown> = {
    seo_title: seo.seo_title,
    meta_description: seo.meta_description,
    canonical_url: seo.canonical_url,
    robots_index: seo.robots_index,
    robots_follow: seo.robots_follow,
    focus_keyphrase: seo.focus_keyphrase,
    focus_keyword: seo.focus_keyphrase,
    focus_keywords: seo.focus_keywords,
    schema_type: seo.schema_type,
    social_image_url: seo.social_image_url,
    og_title: seo.og_title,
    og_description: seo.og_description,
    breadcrumb_title: seo.breadcrumb_title,
    seo_schema: seo.seo_schema,
    slug: slug || undefined,
  };

  const description = ensureBodyCopy(record, kind, title, country);
  if (description) {
    recordPatch.description = description;
  }

  return { recordPatch, seo };
}

export function collectionIdToTable(collectionId: string): string | null {
  const map: Record<string, string> = {
    tours: 'tours',
    safari_updates: 'safari_updates',
    countries: 'countries',
    categories: 'categories',
    national_park: 'national_park',
    accommodations: 'accommodations',
    explore: 'explore',
    pages: 'pages',
    landing_pages: 'landing_pages',
  };
  return map[collectionId] || null;
}

export function autoIndexSeoForTable(
  table: string,
  payload: Record<string, unknown>,
  seo: SeoValues | undefined,
  options?: { existingRecord?: RecordRow | null; publicPath?: string | null }
): { payload: Record<string, unknown>; seo: SeoValues | undefined } {
  if (table === 'landing_pages' || table === 'keywords') {
    return { payload, seo };
  }
  const kind = indexableContentKindForTable(table);
  if (!kind) return { payload, seo };

  const base = { ...(options?.existingRecord || {}), ...payload } as RecordRow;
  const enableGoogle = true;
  const result = applyAutoIndexSeo(base, kind, {
    publicPath: options?.publicPath || undefined,
    enableGoogle,
  });
  return {
    payload: { ...payload, ...result.recordPatch },
    seo: result.seo,
  };
}
