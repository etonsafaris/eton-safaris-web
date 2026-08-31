import CmsPageView from '@/components/public/CmsPageView';
import { hydratePublicCmsPage, resolvePolicyPageContent } from '@/lib/hydrate-cms-page';
import { STATIC_PAGES } from '@/lib/static-pages';
import type { RecordRow } from '@/lib/types';

type PolicySlug = 'terms-of-services' | 'privacy-policies';

type PolicyPageViewProps = {
  slug: PolicySlug;
  page: RecordRow | null;
};

/** Server-rendered policy page — avoids client refetches that drop HTML body columns. */
export default function PolicyPageView({ slug, page }: PolicyPageViewProps) {
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
