import { Suspense } from 'react';
import ContactPageClient from '@/components/public/ContactPageClient';
import PublicPageLoader from '@/components/public/PublicPageLoader';
import { hydratePublicCmsPage } from '@/lib/hydrate-cms-page';
import { loadCmsPageResilient } from '@/lib/load-public';
import { preloadPublicHero } from '@/lib/preload-public-hero';

export const revalidate = 900;

async function ContactReady() {
  const row = await loadCmsPageResilient('contact-us').catch(() => null);
  const view = hydratePublicCmsPage(row, 'contact-us');
  preloadPublicHero(view.image || '');
  return <ContactPageClient heroImage={view.image || ''} />;
}

export default function ContactPage() {
  return (
    <Suspense fallback={<PublicPageLoader />}>
      <ContactReady />
    </Suspense>
  );
}
