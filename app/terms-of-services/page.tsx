import type { Metadata } from 'next';
import PolicyPageView from '@/components/public/PolicyPageView';
import JsonLd from '@/components/public/JsonLd';
import { DEFAULT_CMS_PAGES } from '@/lib/cms-defaults';
import { loadCmsPage } from '@/lib/load-public';
import { STATIC_PAGES } from '@/lib/static-pages';
import { getRecordImage, getRecordTitle, pickString } from '@/lib/data';
import { seoValuesFromRecord } from '@/lib/seo';
import { metadataFromSeo } from '@/lib/seo-public';

const SLUG = 'terms-of-services';

export { dynamic, fetchCache, revalidate } from '@/lib/public-page-config';

export async function generateMetadata(): Promise<Metadata> {
  const row = await loadCmsPage(SLUG);
  const seeded = DEFAULT_CMS_PAGES.find((item) => item.slug === SLUG);
  const values = seoValuesFromRecord((row || {}) as Record<string, unknown>);
  return metadataFromSeo(values, {
    title: values.seo_title || (row && getRecordTitle(row)) || seeded?.seo_title || STATIC_PAGES[SLUG].title,
    description:
      values.meta_description ||
      (row && pickString(row, ['excerpt', 'meta_description'])) ||
      seeded?.meta_description,
    path: `/${SLUG}`,
    image: (row && getRecordImage(row)) || seeded?.image_url,
  });
}

export default async function TermsOfServicesPage() {
  const page = await loadCmsPage(SLUG);
  return (
    <>
      <JsonLd table="pages" slug={SLUG} path={`/${SLUG}`} schemaHint="WebPage" />
      <PolicyPageView slug={SLUG} page={page} />
    </>
  );
}
