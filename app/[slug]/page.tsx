import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CmsSlugClient from '@/components/public/CmsSlugClient';
import JsonLd from '@/components/public/JsonLd';
import { destinationPublicPath, matchCmsRecord, pageAliases, resolvePublicSlug } from '@/lib/cms-routes';
import { DEFAULT_CMS_PAGES } from '@/lib/cms-defaults';
import { parseCmsPageExtras, stripHtmlText } from '@/lib/cms-page-model';
import { fetchCollectionRecords, getRecordImage, getRecordTitle, isPublishedRecord, pickString } from '@/lib/data';
import { seoValuesFromRecord } from '@/lib/seo';
import { metadataFromSeo, publicRecordMetadata } from '@/lib/seo-public';
import { loadCountryPageData } from '@/lib/load-public';

type PageProps = {
  params: { slug: string };
};

export { revalidate } from '@/lib/public-page-config';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = resolvePublicSlug(params.slug);
  if (!resolved) return { title: 'Eton Safaris', robots: { index: false, follow: false } };

  if (resolved.kind === 'country') {
    const slug = resolved.countrySlug || resolved.canonical;
    return publicRecordMetadata('countries', slug, destinationPublicPath(slug), { contentType: 'country' });
  }

  const path = `/${resolved.canonical}`;
  const seeded = DEFAULT_CMS_PAGES.find((item) => item.slug === resolved.canonical);
  try {
    const rows = await fetchCollectionRecords('pages');
    const row = matchCmsRecord(rows, resolved.canonical, pageAliases(resolved.canonical));
    const extras = parseCmsPageExtras(row, resolved.canonical);
    const values = seoValuesFromRecord((row || {}) as Record<string, unknown>);
    const title = values.seo_title || extras.hero_title || (row && getRecordTitle(row)) || seeded?.seo_title || seeded?.title;
    const description =
      values.meta_description ||
      extras.excerpt ||
      (row && pickString(row, ['meta_description', 'excerpt', 'content', 'description'])) ||
      seeded?.meta_description;
    return metadataFromSeo(values, {
      title: title || 'Page',
      description: stripHtmlText(description || '', 160),
      path,
      image: (row && getRecordImage(row)) || seeded?.image_url,
    });
  } catch {
    return { title: seeded?.seo_title || 'Page', description: seeded?.meta_description };
  }
}

export default async function PublicCmsSlugPage({ params }: PageProps) {
  const resolved = resolvePublicSlug(params.slug);
  if (!resolved) notFound();
  const isCountryAlias = resolved.kind === 'country';
  const countrySlug = resolved.countrySlug || resolved.canonical;
  const countryData = isCountryAlias ? await loadCountryPageData(countrySlug) : null;
  let initialPage = null;
  if (!isCountryAlias) {
    const rows = await fetchCollectionRecords('pages').catch(() => []);
    const match = matchCmsRecord(rows, resolved.canonical, pageAliases(resolved.canonical));
    initialPage = match && isPublishedRecord(match) ? match : null;
  }

  return (
    <>
      <JsonLd
        table={isCountryAlias ? 'countries' : 'pages'}
        slug={isCountryAlias ? countrySlug : resolved.canonical}
        path={isCountryAlias ? destinationPublicPath(countrySlug) : `/${resolved.canonical}`}
        schemaHint={
          isCountryAlias ? 'TouristDestination' : resolved.canonical === 'about-us' ? 'AboutPage' : 'WebPage'
        }
      />
      <CmsSlugClient
        key={params.slug}
        initialCountry={countryData?.country || null}
        initialPage={initialPage}
        initialCategories={countryData?.categories || []}
        initialTours={countryData?.tours || []}
        initialParks={countryData?.parks || []}
        initialPlaces={countryData?.places || []}
      />
    </>
  );
}
