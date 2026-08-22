'use client';

import { useEffect, useState } from 'react';
import CmsPageView from '@/components/public/CmsPageView';
import { inferPageLayout } from '@/lib/cms-page-model';
import { matchCmsRecord, pageAliases } from '@/lib/cms-routes';
import { fetchCollectionRecords, isPublishedRecord } from '@/lib/data';
import { hydratePublicCmsPage } from '@/lib/hydrate-cms-page';
import { useCmsLive } from '@/lib/cms-live';
import type { RecordRow } from '@/lib/types';

const SLUG = 'community-support';

export default function CommunityPageClient({ initialPage = null }: { initialPage?: RecordRow | null }) {
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
        const match = matchCmsRecord(rows, SLUG, pageAliases(SLUG));
        setPage(match && isPublishedRecord(match) ? match : null);
      })
      .catch((error) => console.error('[CMS] Community page load failed:', error))
      .finally(() => setReady(true));
  }, [live]);

  const view = hydratePublicCmsPage(page, SLUG);

  if (!ready && !page && !view.content) {
    return <div className="py-24 text-center text-gray-500">Loading…</div>;
  }

  return (
    <CmsPageView
      title={view.title || 'Our Community'}
      image={view.image}
      content={view.content}
      variant={view.layout !== 'standard' ? view.layout : inferPageLayout(SLUG)}
      subtitle={view.subtitle}
      faqs={view.faqs}
      blocks={view.blocks}
      ctaLabel={view.ctaLabel || 'Plan Your Safari'}
      ctaHref={view.ctaHref}
    />
  );
}
