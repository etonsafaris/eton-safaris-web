'use client';

import {
  buildIndexCheckRecord,
  getPublicIndexStatus,
  indexableKindForCollectionId,
  type IndexableContentKind,
  type PublicIndexStatus,
} from '@/lib/public-indexing';
import type { RecordRow } from '@/lib/types';

const TONE = {
  indexable: 'bg-[#ecfdf3] text-[#047857] ring-[#a7f3d0]',
  noindex: 'bg-[#fff7ed] text-[#c2410c] ring-[#fed7aa]',
} as const;

export function IndexStatusBadge({
  status,
  size = 'sm',
  className = '',
}: {
  status: PublicIndexStatus;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const tone = status.indexable ? TONE.indexable : TONE.noindex;
  const sizeClass = size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[10px]';
  return (
    <span
      title={status.reason}
      className={`inline-flex items-center rounded-full font-bold uppercase tracking-wide ring-1 ring-inset ${tone} ${sizeClass} ${className}`}
    >
      {status.label}
    </span>
  );
}

export function indexStatusForCollectionRecord(
  record: RecordRow,
  collectionId: string,
  options?: { forceNoindex?: boolean; forceNoindexReason?: string }
): PublicIndexStatus | null {
  if (collectionId === 'landing_pages') {
    return getPublicIndexStatus(record, 'page', {
      forceNoindex: true,
      forceNoindexReason: 'Conversion landing — admin preview only; public site uses the country page.',
    });
  }
  const kind = indexableKindForCollectionId(collectionId);
  if (!kind) return null;
  return getPublicIndexStatus(record, kind, options);
}

export function indexStatusForDraft(
  kind: IndexableContentKind,
  options: {
    baseRecord?: RecordRow | null;
    title?: string;
    description?: string;
    imageUrl?: string;
    country?: string;
    robotsIndex?: boolean;
    metaDescription?: string;
    forceNoindex?: boolean;
    forceNoindexReason?: string;
  }
): PublicIndexStatus {
  const draft = buildIndexCheckRecord(options.baseRecord, {
    title: options.title,
    description: options.description,
    imageUrl: options.imageUrl,
    country: options.country,
    robotsIndex: options.robotsIndex,
    metaDescription: options.metaDescription,
  });
  return getPublicIndexStatus(draft, kind, {
    forceNoindex: options.forceNoindex,
    forceNoindexReason: options.forceNoindexReason,
  });
}

export function seoContentTypeToIndexKind(
  contentType: string
): IndexableContentKind | null {
  const map: Record<string, IndexableContentKind> = {
    tour: 'tour',
    park: 'park',
    stay: 'stay',
    place: 'place',
    article: 'article',
    category: 'category',
    country: 'country',
    page: 'page',
  };
  return map[contentType] || null;
}
