import type { Metadata } from 'next';
import { SITE, SITE_LOGO } from '@/lib/collections';
import { publicCanonicalUrl } from '@/lib/seo-canonical';
import { countryHeroImage } from '@/lib/country-heroes';
import { fetchCollectionRecords, fetchRecordByPublicSlug, getRecordImage, getRecordTitle, pickString } from '@/lib/data';
import { normalizeSlug } from '@/lib/country-utils';
import { isDeployableImageUrl } from '@/lib/public-image';
import {
  buildDefaultJsonLd,
  seoValuesFromRecord,
  type SeoContentType,
  type SeoSchemaType,
  type SeoValues,
} from '@/lib/seo';
import {
  indexableContentKindForTable,
  shouldIndexPublicRecord,
  type IndexableContentKind,
} from '@/lib/public-indexing';
import { parseCmsPageExtras } from '@/lib/cms-page-model';
import { landingConversionCopy } from '@/lib/landing-page-copy';
import { mergeFaqs } from '@/lib/default-faqs';
import type { RecordRow } from '@/lib/types';

function absoluteUrl(path: string) {
  return publicCanonicalUrl(path);
}

function pathnameOf(url: string) {
  try {
    return new URL(url).pathname.replace(/\/$/, '') || '/';
  } catch {
    return publicCanonicalUrl(url).replace(SITE.url.replace(/\/$/, ''), '') || '/';
  }
}

function isPrivateSeoPath(path: string) {
  return /\/(admin|login|payment|verify|landing|quote|invite|dashboard|agents)(\/|$)/i.test(path);
}

function safeCanonical(values: SeoValues, path: string) {
  const pageUrl = absoluteUrl(path);
  const raw = (values.canonical_url || '').trim();
  if (!raw) return pageUrl;
  try {
    const resolved = /^https?:\/\//i.test(raw)
      ? new URL(raw).toString()
      : raw.startsWith('/')
        ? absoluteUrl(raw)
        : pageUrl;
    return pathnameOf(resolved) === pathnameOf(pageUrl) ? resolved : pageUrl;
  } catch {
    return pageUrl;
  }
}

function safeImageUrl(image?: string) {
  if (!isDeployableImageUrl(image)) return undefined;
  return image.replace(/^http:\/\//i, 'https://');
}

export function metadataFromSeo(
  values: SeoValues,
  options: {
    title?: string;
    description?: string;
    path: string;
    image?: string;
  }
): Metadata {
  const title = values.seo_title || options.title || SITE.name;
  const description = values.meta_description || options.description || SITE.about.slice(0, 155);
  const image = safeImageUrl(values.social_image_url || options.image || SITE_LOGO);
  const canonical = safeCanonical(values, options.path);
  const ogTitle = values.og_title || title;
  const ogDescription = values.og_description || description;
  const privatePath = isPrivateSeoPath(options.path);
  const index = privatePath ? false : values.robots_index !== false;
  const follow = privatePath ? false : values.robots_follow !== false;

  return {
    title: {
      absolute: title,
    },
    description,
    keywords: values.focus_keywords?.length ? values.focus_keywords : undefined,
    robots: {
      index,
      follow,
      nosnippet: values.robots_advanced.includes('nosnippet') || undefined,
      noimageindex: values.robots_advanced.includes('noimageindex') || undefined,
    },
    alternates: {
      canonical,
      languages: {
        'x-default': canonical,
      },
    },
    openGraph: {
      type: 'website',
      siteName: SITE.name,
      title: ogTitle,
      description: ogDescription,
      url: canonical,
      images: image ? [{ url: image }] : undefined,
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: ogDescription,
      images: image ? [image] : undefined,
    },
  };
}

export async function findPublicRecord(table: string, slug: string, aliases: string[] = []) {
  const direct = await fetchRecordByPublicSlug(table, slug, aliases).catch(() => null);
  if (direct) return direct;
  const rows = await fetchCollectionRecords(table, aliases);
  const needle = normalizeSlug(slug);
  return (
    rows.find((row) => {
      const candidates = [pickString(row, ['slug']), pickString(row, ['name']), pickString(row, ['title']), String(row.id || '')];
      return candidates.some((value) => normalizeSlug(value) === needle);
    }) || null
  );
}

export function jsonLdFromRecord(
  record: RecordRow | Record<string, unknown> | null,
  options: {
    path: string;
    fallbackTitle?: string;
    schemaHint?: SeoSchemaType;
  }
) {
  if (!record) {
    if (!options.fallbackTitle) return null;
    return buildDefaultJsonLd(seoValuesFromRecord({}), {
      title: options.fallbackTitle,
      description: '',
      url: absoluteUrl(options.path),
      siteName: SITE.name,
      siteUrl: SITE.url,
    });
  }
  const values = seoValuesFromRecord(record as Record<string, unknown>);
  if (options.schemaHint && (values.schema_type === 'WebPage' || !values.schema_type)) {
    values.schema_type = options.schemaHint;
  }
  if (options.schemaHint === 'TouristDestination' || options.path.endsWith('-safaris')) {
    values.schema_type = 'TouristDestination';
  }
  if (options.path.includes('about')) {
    values.schema_type = 'AboutPage';
  }
  const title = values.seo_title || options.fallbackTitle || getRecordTitle(record as RecordRow);
  const extras = parseCmsPageExtras(record as RecordRow, options.path);
  const pathSlug = options.path.replace(/^\/destinations\//, '').split('/')[0];
  const countryName = getRecordTitle(record as RecordRow);
  const description =
    values.meta_description ||
    extras.excerpt ||
    pickString(record as RecordRow, ['excerpt', 'description', 'content']).replace(/<[^>]+>/g, ' ').trim();
  const faqs =
    options.schemaHint === 'TouristDestination'
      ? mergeFaqs(extras.faqs, landingConversionCopy(pathSlug, countryName).faqs)
      : extras.faqs.length > 0
        ? extras.faqs
        : undefined;
  const custom = values.seo_schema.trim();
  if (custom) {
    try {
      return JSON.parse(custom) as unknown;
    } catch {
      // fall through to generated graph
    }
  }
  const graph = buildDefaultJsonLd(values, {
    title,
    description: description.slice(0, 220),
    url: values.canonical_url || absoluteUrl(options.path),
    image:
      values.social_image_url ||
      (options.schemaHint === 'TouristDestination'
        ? countryHeroImage(pathSlug, record as RecordRow)
        : getRecordImage(record as RecordRow)) ||
      SITE_LOGO,
    siteName: SITE.name,
    siteUrl: SITE.url,
    dateModified: extras.published_at || undefined,
    faqs,
  });
  return graph;
}

function resolveIndexableKind(table: string, contentType?: SeoContentType): IndexableContentKind | null {
  if (contentType === 'tour') return 'tour';
  if (contentType === 'park') return 'park';
  if (contentType === 'stay') return 'stay';
  if (contentType === 'place') return 'place';
  if (contentType === 'article') return 'article';
  if (contentType === 'category') return 'category';
  if (contentType === 'country') return 'country';
  if (contentType === 'page') return 'page';
  return indexableContentKindForTable(table);
}

export { publicCanonicalUrl, normalizePublicPath } from '@/lib/seo-canonical';

export async function publicRecordMetadata(
  table: string,
  slug: string,
  path: string,
  options: { aliases?: string[]; contentType?: SeoContentType } = {}
): Promise<Metadata> {
  try {
    const record = await findPublicRecord(table, slug, options.aliases || []);
    if (!record) {
      return metadataFromSeo(seoValuesFromRecord({}), {
        title: `${slug.replace(/-/g, ' ')} | ${SITE.name}`,
        description: SITE.about.slice(0, 160),
        path,
      });
    }
    const values = seoValuesFromRecord(record as Record<string, unknown>);
    const kind = resolveIndexableKind(table, options.contentType);
    if (kind) {
      const indexable = shouldIndexPublicRecord(record as RecordRow, kind);
      values.robots_index = indexable;
      if (indexable) values.robots_follow = true;
    }
    const title = values.seo_title || getRecordTitle(record);
    const description = values.meta_description || pickString(record, ['excerpt', 'description', 'content']).replace(/<[^>]+>/g, ' ').trim();
    return metadataFromSeo(values, {
      title,
      description: description.slice(0, 160),
      path,
      image:
        (table === 'countries' ? countryHeroImage(slug, record) : getRecordImage(record)) || undefined,
    });
  } catch {
    return { title: SITE.name };
  }
}
