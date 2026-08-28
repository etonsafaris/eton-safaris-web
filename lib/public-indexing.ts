import {
  getRecordImage,
  getRecordTitle,
  isPublishedRecord,
  pickPlainText,
  pickString,
  visibleRecordHtml,
} from '@/lib/data';
import { isDeployableImageUrl } from '@/lib/public-image';
import { seoValuesFromRecord } from '@/lib/seo';
import type { RecordRow } from '@/lib/types';

export type IndexableContentKind = 'tour' | 'park' | 'stay' | 'place' | 'article' | 'category' | 'country' | 'page';

const MIN_WORDS: Record<IndexableContentKind, number> = {
  tour: 80,
  park: 60,
  stay: 100,
  place: 60,
  article: 120,
  category: 40,
  country: 100,
  page: 40,
};

function wordCount(text: string): number {
  const clean = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return 0;
  return clean.split(' ').filter(Boolean).length;
}

function recordWordCount(record: RecordRow): number {
  const html = visibleRecordHtml(record);
  const plain = pickPlainText(record, ['meta_description', 'excerpt', 'summary', 'description', 'content']);
  return Math.max(wordCount(html), wordCount(plain));
}

export function hasEditorialBoost(record: RecordRow): boolean {
  return (
    record.is_featured === true ||
    record.is_popular === true ||
    record.show_on_landing === true ||
    record.featured === true
  );
}

export function indexableContentKindForTable(table: string): IndexableContentKind | null {
  const name = table.toLowerCase();
  if (name === 'tours') return 'tour';
  if (name === 'national_park' || name === 'national_parks' || name === 'parks') return 'park';
  if (name === 'accommodations') return 'stay';
  if (name === 'explore') return 'place';
  if (name === 'safari_updates') return 'article';
  if (name === 'categories') return 'category';
  if (name === 'countries') return 'country';
  if (name === 'pages') return 'page';
  return null;
}

/**
 * Quality gate for Google indexing — keeps thin programmatic stays/parks out of
 * search while allowing hand-picked or substantive pages to rank.
 */
export function meetsIndexQuality(record: RecordRow, kind: IndexableContentKind): boolean {
  if (!isPublishedRecord(record)) return false;
  if (hasEditorialBoost(record)) return true;

  const words = recordWordCount(record);
  if (words < MIN_WORDS[kind]) return false;

  const seo = seoValuesFromRecord(record);

  if (kind === 'stay') {
    const title = getRecordTitle(record);
    if (!title || title.length < 4) return false;
    if (!pickString(record, ['country'])) return false;
    if (!isDeployableImageUrl(getRecordImage(record))) return false;
    if (seo.meta_description.trim().length < 70 && words < 140) return false;
  }

  if (kind === 'park') {
    if (seo.meta_description.trim().length < 50 && words < 90) return false;
  }

  if (kind === 'place' && !pickString(record, ['country'])) return false;

  if (kind === 'tour' && seo.meta_description.trim().length < 50 && words < 120) return false;

  return true;
}

/** Final index decision: admin noindex wins; otherwise quality rules apply. */
export function shouldIndexPublicRecord(record: RecordRow, kind: IndexableContentKind): boolean {
  const seo = seoValuesFromRecord(record);
  if (!seo.robots_index) return false;
  return meetsIndexQuality(record, kind);
}

export function indexableKindForCollectionId(collectionId: string): IndexableContentKind | null {
  const map: Record<string, IndexableContentKind> = {
    tours: 'tour',
    national_park: 'park',
    accommodations: 'stay',
    explore: 'place',
    safari_updates: 'article',
    categories: 'category',
    countries: 'country',
    pages: 'page',
  };
  return map[collectionId] || null;
}

export type PublicIndexStatus = {
  indexable: boolean;
  label: 'Indexable' | 'Noindex';
  reason: string;
};

function noindexReason(record: RecordRow, kind: IndexableContentKind): string {
  const seo = seoValuesFromRecord(record);
  if (!isPublishedRecord(record)) return 'Not published — hidden from the public site.';
  if (!seo.robots_index) return 'SEO panel is set to noindex.';
  if (hasEditorialBoost(record)) return '';

  const words = recordWordCount(record);
  const minWords = MIN_WORDS[kind];
  if (words < minWords) {
    return `Needs more unique content (about ${minWords} words; currently ~${words}).`;
  }

  if (kind === 'stay') {
    const title = getRecordTitle(record);
    if (!title || title.length < 4) return 'Add a clear lodge name.';
    if (!pickString(record, ['country'])) return 'Add a country.';
    if (!isDeployableImageUrl(getRecordImage(record))) return 'Add a real cover image.';
    if (seo.meta_description.trim().length < 70 && words < 140) {
      return 'Add a meta description (70+ chars) or more body copy.';
    }
  }

  if (kind === 'park' && seo.meta_description.trim().length < 50 && words < 90) {
    return 'Add a meta description or more park description text.';
  }

  if (kind === 'place' && !pickString(record, ['country'])) return 'Add a country.';

  if (kind === 'tour' && seo.meta_description.trim().length < 50 && words < 120) {
    return 'Add a meta description or more tour detail.';
  }

  return 'Does not meet index quality rules yet.';
}

export function getPublicIndexStatus(
  record: RecordRow,
  kind: IndexableContentKind,
  options?: { forceNoindex?: boolean; forceNoindexReason?: string }
): PublicIndexStatus {
  if (options?.forceNoindex) {
    return {
      indexable: false,
      label: 'Noindex',
      reason: options.forceNoindexReason || 'Excluded from Google indexing.',
    };
  }
  const indexable = shouldIndexPublicRecord(record, kind);
  return {
    indexable,
    label: indexable ? 'Indexable' : 'Noindex',
    reason: indexable ? 'Eligible for Google search and the public sitemap.' : noindexReason(record, kind),
  };
}

export function buildIndexCheckRecord(
  base: RecordRow | null | undefined,
  patch: {
    title?: string;
    description?: string;
    imageUrl?: string;
    robotsIndex?: boolean;
    metaDescription?: string;
    country?: string;
  } = {}
): RecordRow {
  return {
    ...(base || {}),
    ...(patch.title
      ? { title: patch.title, name: patch.title }
      : {}),
    ...(patch.description
      ? { description: patch.description, content: patch.description }
      : {}),
    ...(patch.imageUrl ? { image_url: patch.imageUrl } : {}),
    ...(patch.country ? { country: patch.country } : {}),
    ...(patch.robotsIndex !== undefined ? { robots_index: patch.robotsIndex } : {}),
    ...(patch.metaDescription !== undefined ? { meta_description: patch.metaDescription } : {}),
  };
}

export function sitemapPriorityForRecord(record: RecordRow, kind: IndexableContentKind, base: number): number {
  if (hasEditorialBoost(record)) return Math.min(0.95, base + 0.15);
  if (kind === 'tour' || kind === 'country') return Math.min(0.9, base + 0.1);
  return base;
}
