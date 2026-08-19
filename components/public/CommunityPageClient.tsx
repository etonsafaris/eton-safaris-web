'use client';

import { useEffect, useState } from 'react';
import CmsPageView from '@/components/public/CmsPageView';
import { DEFAULT_CMS_PAGES } from '@/lib/cms-defaults';
import { inferPageLayout, parseCmsBlocks, parseCmsPageExtras } from '@/lib/cms-page-model';
import { matchCmsRecord, pageAliases } from '@/lib/cms-routes';
import { fetchCollectionRecords, getRecordImage, getRecordTitle, isPublishedRecord, pickString } from '@/lib/data';
import { STATIC_PAGES } from '@/lib/static-pages';
import type { RecordRow } from '@/lib/types';

const SLUG = 'community-support';

export default function CommunityPageClient() {
  const seeded = DEFAULT_CMS_PAGES.find((item) => item.slug === SLUG);
  const [page, setPage] = useState<RecordRow | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetchCollectionRecords('pages')
      .then((rows) => {
        const match = matchCmsRecord(rows, SLUG, pageAliases(SLUG));
        setPage(match && isPublishedRecord(match) ? match : null);
      })
      .catch((error) => console.error('[CMS] Community page load failed:', error))
      .finally(() => setReady(true));
  }, []);

  const fallback = STATIC_PAGES[SLUG];
  const extras = parseCmsPageExtras(page, SLUG);
  const title = extras.hero_title || (page ? getRecordTitle(page) : '') || seeded?.title || fallback?.title || 'Our Community';
  const content = pickString(page || {}, ['content', 'description', 'body']) || seeded?.content || fallback?.content || '';
  const image = (page ? getRecordImage(page) : '') || seeded?.image_url;
  const blocks = parseCmsBlocks(page).length ? parseCmsBlocks(page) : seeded?.blocks || [];

  if (!ready && !seeded && !fallback) return null;

  return (
    <CmsPageView
      title={title}
      image={image}
      content={content}
      variant={extras.layout !== 'standard' ? extras.layout : inferPageLayout(SLUG)}
      subtitle={extras.subtitle || seeded?.subtitle}
      faqs={extras.faqs.length ? extras.faqs : seeded?.faqs || []}
      blocks={blocks}
      ctaLabel={extras.cta_label || 'Plan Your Safari'}
      ctaHref={extras.cta_href || '/contact-us'}
    />
  );
}
