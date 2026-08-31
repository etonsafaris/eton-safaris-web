'use client';

import { useEffect, useState } from 'react';
import CmsPageView from '@/components/public/CmsPageView';
import { matchCmsRecord, pageAliases } from '@/lib/cms-routes';
import { fetchCollectionRecordById, fetchCollectionRecords, isPublishedRecord } from '@/lib/data';
import { hydratePublicCmsPage, resolvePolicyPageContent } from '@/lib/hydrate-cms-page';
import { useCmsLive } from '@/lib/cms-live';
import { STATIC_PAGES } from '@/lib/static-pages';
import type { RecordRow } from '@/lib/types';

type PolicyPageClientProps = {
  slug: 'terms-of-services' | 'privacy-policies';
  initialPage?: RecordRow | null;
};

export default function PolicyPageClient({ slug, initialPage = null }: PolicyPageClientProps) {
  const live = useCmsLive();
  const [page, setPage] = useState<RecordRow | null>(initialPage);

  useEffect(() => {
    setPage(initialPage);
  }, [initialPage]);

  useEffect(() => {
    if (live === 0) return;
    let mounted = true;
    (async () => {
      try {
        const rows = await fetchCollectionRecords('pages');
        const match = matchCmsRecord(rows, slug, pageAliases(slug));
        if (!match || !isPublishedRecord(match)) {
          if (mounted) setPage(null);
          return;
        }
        const id = String(match.id || '');
        const full = id ? await fetchCollectionRecordById('pages', id) : null;
        if (mounted) setPage(full && isPublishedRecord(full) ? full : null);
      } catch (error) {
        console.error(`[CMS] ${slug} page load failed:`, error);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [live, slug]);

  const fallback = STATIC_PAGES[slug];
  const view = hydratePublicCmsPage(page, slug);
  const content = resolvePolicyPageContent(page, slug) || fallback?.content || '';

  return (
    <CmsPageView
      title={view.title || fallback?.title || slug.replace(/-/g, ' ')}
      image={view.image}
      content={content}
      variant="policy"
      faqs={view.faqs}
    />
  );
}
