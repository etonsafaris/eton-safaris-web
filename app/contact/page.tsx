import ContactPageClient from '@/components/public/ContactPageClient';
import { hydratePublicCmsPage } from '@/lib/hydrate-cms-page';
import { loadCmsPageResilient } from '@/lib/load-public';

export const revalidate = 900;

export default async function ContactPage() {
  const row = await loadCmsPageResilient('contact-us').catch(() => null);
  const view = hydratePublicCmsPage(row, 'contact-us');
  return <ContactPageClient heroImage={view.image || ''} />;
}
