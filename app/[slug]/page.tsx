import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CmsSlugClient from '@/components/public/CmsSlugClient';
import JsonLd from '@/components/public/JsonLd';
import { destinationPublicPath, matchCmsRecord, pageAliases, resolvePublicSlug } from '@/lib/cms-routes';
import { DEFAULT_CMS_PAGES } from '@/lib/cms-defaults';
import { parseCmsPageExtras, stripHtmlText } from '@/lib/cms-page-model';
import { fetchCollectionRecords, getRecordImage, getRecordTitle, pickString } from '@/lib/data';
import { seoValuesFromRecord } from '@/lib/seo';
import { metadataFromSeo, publicRecordMetadata } from '@/lib/seo-public';

type PageProps = {
  params: { slug: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = resolvePublicSlug(params.slug);
  if (!resolved) return { title: 'Page' };

  if (resolved.kind === 'country') {
    const slug = resolved.countrySlug || resolved.canonical;
    return publicRecordMetadata('countries', slug, destinationPublicPath(slug));
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

export default function PublicCmsSlugPage({ params }: PageProps) {
  const resolved = resolvePublicSlug(params.slug);
  if (!resolved) notFound();
  const isCountryAlias = resolved.kind === 'country';
  const countrySlug = resolved.countrySlug || resolved.canonical;
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
      <CmsSlugClient />
    </>
  );
}
