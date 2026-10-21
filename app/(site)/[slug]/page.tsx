import type { Metadata } from 'next';
import { Suspense } from 'react';
import { permanentRedirect } from 'next/navigation';
import CmsSlugClient from '@/components/public/CmsSlugClient';
import PublicPageLoader from '@/components/public/PublicPageLoader';
import JsonLd from '@/components/public/JsonLd';
import PublicRecordUnavailable from '@/components/public/PublicRecordUnavailable';
import PublicShellServer from '@/components/public/PublicShellServer';
import { countryHeroTitle } from '@/lib/country-landing-copy';
import { countryLabelFromSlug } from '@/lib/country-utils';
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
import { metadataFromSeo } from '@/lib/seo-public';
import { hydratePublicCmsPage } from '@/lib/hydrate-cms-page';
import { loadCmsPageResilient } from '@/lib/load-public';
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
    const label = countryLabelFromSlug(slug) || slug;
    const headline = countryHeroTitle(slug, label);
    return {
      title: headline,
      description: `${headline} with Eton Safaris.`,
    };
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

async function CmsSlugReady({ params }: PageProps) {
  const resolved = resolvePublicSlugLenient(params.slug);
  if (!resolved) {
    return (
      <PublicShellServer>
        <PublicRecordUnavailable />
      </PublicShellServer>
    );
  }
  if (resolved.kind === 'country') {
    permanentRedirect(destinationPublicPath(resolved.countrySlug || resolved.canonical));
  }
  let initialPage = null;
  try {
    initialPage = await loadCmsPageResilient(resolved.canonical);
  } catch (error) {
    rethrowDynamicServerError(error);
    console.warn('[Public] CMS page load failed:', resolved.canonical, error);
    initialPage = null;
  }
  if (initialPage) {
    preloadPublicHero(hydratePublicCmsPage(initialPage, resolved.canonical).image);
  }

  return (
    <>
      <JsonLd
        table="pages"
        slug={resolved.canonical}
        path={`/${resolved.canonical}`}
        schemaHint={resolved.canonical === 'about-us' ? 'AboutPage' : 'WebPage'}
      />
      <CmsSlugClient key={params.slug} initialPage={initialPage} />
    </>
  );
}

export default function PublicCmsSlugPage({ params }: PageProps) {
  if (isReservedPublicSlug(params.slug)) permanentRedirect('/');
  const resolved = resolvePublicSlugLenient(params.slug);
  if (resolved?.kind === 'country') {
    permanentRedirect(destinationPublicPath(resolved.countrySlug || resolved.canonical));
  }
  if (!resolved) {
    return (
      <PublicShellServer>
        <PublicRecordUnavailable />
      </PublicShellServer>
    );
  }

  return (
    <Suspense fallback={<PublicPageLoader />}>
      <CmsSlugReady params={params} />
    </Suspense>
  );
}
