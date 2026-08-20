'use client';

import { useEffect, useState } from 'react';
import CmsPageView from '@/components/public/CmsPageView';
import { inferPageLayout, parseCmsBlocks, parseCmsPageExtras } from '@/lib/cms-page-model';
import { matchCmsRecord, pageAliases } from '@/lib/cms-routes';
import { fetchCollectionRecords, getRecordImage, getRecordTitle, isPublishedRecord, pickString } from '@/lib/data';
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

  const extras = parseCmsPageExtras(page, SLUG);
  const title = extras.hero_title || (page ? getRecordTitle(page) : '') || 'Our Community';
  const content = page ? pickString(page, ['content', 'description', 'body']) : '';
  const image = page ? getRecordImage(page) || undefined : undefined;
  const blocks = parseCmsBlocks(page);

  if (!ready && !page) {
    return <div className="py-24 text-center text-gray-500">Loading…</div>;
  }

  return (
    <CmsPageView
      title={title}
      image={image}
      content={content}
      variant={extras.layout !== 'standard' ? extras.layout : inferPageLayout(SLUG)}
      subtitle={extras.subtitle}
      faqs={extras.faqs}
      blocks={blocks}
      ctaLabel={extras.cta_label || 'Plan Your Safari'}
      ctaHref={extras.cta_href || '/contact-us'}
    />
  );
}
