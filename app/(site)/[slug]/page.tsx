import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import CmsSlugClient from '@/components/public/CmsSlugClient';
import JsonLd from '@/components/public/JsonLd';
import PublicRecordUnavailable from '@/components/public/PublicRecordUnavailable';
import PublicShellServer from '@/components/public/PublicShellServer';
import {
  destinationPublicPath,
  matchCmsRecord,
  pageAliases,
  resolvePublicSlugLenient,
} from '@/lib/cms-routes';
import { DEFAULT_CMS_PAGES } from '@/lib/cms-defaults';
import { parseCmsPageExtras, stripHtmlText } from '@/lib/cms-page-model';
import { fetchCollectionRecords, getRecordImage, getRecordTitle, pickString } from '@/lib/data';
import { seoValuesFromRecord } from '@/lib/seo';
import { metadataFromSeo, publicRecordMetadata } from '@/lib/seo-public';
import { hydratePublicCmsPage } from '@/lib/hydrate-cms-page';
import { loadCmsPageResilient, loadCountryPageDataResilient } from '@/lib/load-public';
import { preloadPublicHero } from '@/lib/preload-public-hero';
import { rethrowDynamicServerError } from '@/lib/safe-public-load';

type PageProps = {
  params: { slug: string };
};

export const revalidate = 900;
export const dynamicParams = true;

function isReservedPublicSlug(slug: string): boolean {
  return slug.toLowerCase() === 'api';
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  if (isReservedPublicSlug(params.slug)) {
    return { title: 'Eton Safaris', robots: { index: false, follow: false } };
  }
  const resolved = resolvePublicSlugLenient(params.slug);
  if (!resolved) return { title: 'Eton Safaris', robots: { index: false, follow: false } };

  if (resolved.kind === 'country') {
    const slug = resolved.countrySlug || resolved.canonical;
    try {
      return await publicRecordMetadata('countries', slug, destinationPublicPath(slug), { contentType: 'country' });
    } catch (error) {
      rethrowDynamicServerError(error);
      return { title: 'Destination | Eton Safaris' };
    }
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
  } catch (error) {
    rethrowDynamicServerError(error);
    return { title: seeded?.seo_title || 'Page', description: seeded?.meta_description };
  }
}

export default async function PublicCmsSlugPage({ params }: PageProps) {
  if (isReservedPublicSlug(params.slug)) permanentRedirect('/');
  const resolved = resolvePublicSlugLenient(params.slug);
  if (!resolved) {
    return (
      <PublicShellServer>
        <PublicRecordUnavailable />
      </PublicShellServer>
    );
  }
  const isCountryAlias = resolved.kind === 'country';
  const countrySlug = resolved.countrySlug || resolved.canonical;
  let countryData: Awaited<ReturnType<typeof loadCountryPageDataResilient>> | null = null;
  if (isCountryAlias) {
    countryData = await loadCountryPageDataResilient(countrySlug);
  }
  let initialPage = null;
  if (!isCountryAlias) {
    try {
      initialPage = await loadCmsPageResilient(resolved.canonical);
    } catch (error) {
      rethrowDynamicServerError(error);
      console.warn('[Public] CMS page load failed:', resolved.canonical, error);
      initialPage = null;
    }
  }
  if (!isCountryAlias && initialPage) {
    preloadPublicHero(hydratePublicCmsPage(initialPage, resolved.canonical).image);
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
