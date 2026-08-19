import type { Metadata } from 'next';
import { SITE, SITE_LOGO } from '@/lib/collections';
import { fetchCollectionRecords, getRecordImage, getRecordTitle, pickString } from '@/lib/data';
import { normalizeSlug } from '@/lib/country-utils';
import {
  buildDefaultJsonLd,
  seoValuesFromRecord,
  type SeoContentType,
  type SeoSchemaType,
  type SeoValues,
} from '@/lib/seo';
import { parseCmsPageExtras } from '@/lib/cms-page-model';
import type { RecordRow } from '@/lib/types';

function absoluteUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    try {
      return new URL(path).toString();
    } catch {
      return SITE.url;
    }
  }
  const base = SITE.url.replace(/\/$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

function safeCanonical(values: SeoValues, path: string) {
  const raw = (values.canonical_url || '').trim();
  if (!raw) return absoluteUrl(path);
  try {
    if (/^https?:\/\//i.test(raw)) return new URL(raw).toString();
    if (raw.startsWith('/')) return absoluteUrl(raw);
  } catch {
    return absoluteUrl(path);
  }
  return absoluteUrl(path);
}

function safeImageUrl(image?: string) {
  const raw = (image || '').trim();
  if (!raw || raw.startsWith('blob:') || raw.startsWith('data:')) return undefined;
  if (/^https?:\/\//i.test(raw) || raw.startsWith('/')) return raw;
  return undefined;
}

function robotsContent(values: SeoValues) {
  const parts = [values.robots_index ? 'index' : 'noindex', values.robots_follow ? 'follow' : 'nofollow'];
  return [...parts, ...values.robots_advanced].join(', ');
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

  return {
    title: {
      absolute: title,
    },
    description,
    keywords: values.focus_keywords?.length ? values.focus_keywords : undefined,
    robots: {
      index: values.robots_index,
      follow: values.robots_follow,
      nocache: values.robots_advanced.includes('noarchive'),
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
    other: {
      robots: robotsContent(values),
    },
  };
}

export async function findPublicRecord(table: string, slug: string, aliases: string[] = []) {
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
  const description =
    values.meta_description ||
    extras.excerpt ||
    pickString(record as RecordRow, ['excerpt', 'description', 'content']).replace(/<[^>]+>/g, ' ').trim();
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
    image: values.social_image_url || getRecordImage(record as RecordRow) || SITE_LOGO,
    siteName: SITE.name,
    siteUrl: SITE.url,
    dateModified: extras.published_at || undefined,
    faqs: extras.faqs,
  });
  return graph;
}

export async function publicRecordMetadata(
  table: string,
  slug: string,
  path: string,
  options: { aliases?: string[]; contentType?: SeoContentType } = {}
): Promise<Metadata> {
  try {
    const record = await findPublicRecord(table, slug, options.aliases || []);
    if (!record) return { title: SITE.name };
    const values = seoValuesFromRecord(record as Record<string, unknown>);
    const title = values.seo_title || getRecordTitle(record);
    const description = values.meta_description || pickString(record, ['excerpt', 'description', 'content']).replace(/<[^>]+>/g, ' ').trim();
    return metadataFromSeo(values, {
      title,
      description: description.slice(0, 160),
      path,
      image: getRecordImage(record) || undefined,
    });
  } catch {
    return { title: SITE.name };
  }
}
