'use client';

import { useEffect, useState } from 'react';
import CmsPageView from '@/components/public/CmsPageView';
import { matchCmsRecord, pageAliases } from '@/lib/cms-routes';
import { STATIC_PAGES } from '@/lib/static-pages';
import { fetchCollectionRecords, isPublishedRecord } from '@/lib/data';
import { hydratePublicCmsPage } from '@/lib/hydrate-cms-page';
import { useCmsLive } from '@/lib/cms-live';
import type { RecordRow } from '@/lib/types';

type PolicyPageClientProps = {
  slug: 'terms-of-services' | 'privacy-policies';
  initialPage?: RecordRow | null;
};

export default function PolicyPageClient({ slug, initialPage = null }: PolicyPageClientProps) {
  const live = useCmsLive();
  const [page, setPage] = useState<RecordRow | null>(initialPage);
  const [ready, setReady] = useState(true);

  useEffect(() => {
    setPage(initialPage);
  }, [initialPage]);

  useEffect(() => {
    if (live === 0) return;
    fetchCollectionRecords('pages')
      .then((rows) => {
        const match = matchCmsRecord(rows, slug, pageAliases(slug));
        setPage(match && isPublishedRecord(match) ? match : null);
      })
      .catch((error) => console.error(`[CMS] ${slug} page load failed:`, error))
      .finally(() => setReady(true));
  }, [live, slug]);

  const fallback = STATIC_PAGES[slug];
  const view = hydratePublicCmsPage(page, slug);

  if (!ready && !page && !fallback) {
    return <div className="py-24 text-center text-gray-500">Loading…</div>;
  }

  return (
    <CmsPageView
      title={view.title || fallback?.title || slug.replace(/-/g, ' ')}
      image={view.image}
      content={view.content || fallback?.content || ''}
      variant="policy"
      faqs={view.faqs}
    />
  );
}
