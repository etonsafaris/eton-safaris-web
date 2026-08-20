import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CmsSlugClient from '@/components/public/CmsSlugClient';
import JsonLd from '@/components/public/JsonLd';
import { resolvePublicSlug } from '@/lib/cms-routes';
import { findCategoryBySlug, findPlaceBySlug } from '@/lib/country-utils';
import { fetchCollectionRecords, getRecordImage, getRecordTitle, pickString } from '@/lib/data';
import { seoValuesFromRecord } from '@/lib/seo';
import { metadataFromSeo } from '@/lib/seo-public';

import { loadCountryPageData } from '@/lib/load-public';

type PageProps = {
  params: { slug: string; category: string };
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const path = `/${params.slug}/${params.category}`;
  const resolved = resolvePublicSlug(params.slug);
  try {
    const [categories, places] = await Promise.all([
      fetchCollectionRecords('categories'),
      fetchCollectionRecords('explore'),
    ]);
    const row =
      findCategoryBySlug(categories, params.category) ||
      findPlaceBySlug(places, params.category, resolved?.countrySlug || params.slug);
    const values = seoValuesFromRecord((row || {}) as Record<string, unknown>);
    const title = values.seo_title || (row && getRecordTitle(row)) || params.category;
    const description =
      values.meta_description || (row && pickString(row, ['description', 'content', 'summary'])) || undefined;
    return metadataFromSeo(values, {
      title,
      description: description?.replace(/<[^>]+>/g, ' ').slice(0, 160),
      path,
      image: (row && getRecordImage(row)) || undefined,
    });
  } catch {
    return { title: params.category };
  }
}

export default async function CountryCategoryPage({ params }: PageProps) {
  const resolved = resolvePublicSlug(params.slug);
  if (!resolved) notFound();

  let table: 'categories' | 'explore' = 'categories';
  let schemaHint: 'TouristTrip' | 'TouristAttraction' = 'TouristTrip';
  try {
    const [categories, places] = await Promise.all([
      fetchCollectionRecords('categories'),
      fetchCollectionRecords('explore'),
    ]);
    const category = findCategoryBySlug(categories, params.category);
    if (!category && findPlaceBySlug(places, params.category, resolved.countrySlug)) {
      table = 'explore';
      schemaHint = 'TouristAttraction';
    }
  } catch {
    table = 'categories';
  }

  const countrySlug = resolved.countrySlug || resolved.canonical;
  const countryData = await loadCountryPageData(countrySlug);
  const category = findCategoryBySlug(countryData.categories, params.category);
  const place =
    !category ? findPlaceBySlug(countryData.places, params.category, countrySlug) : null;
  if (place) {
    table = 'explore';
    schemaHint = 'TouristAttraction';
  }

  return (
    <>
      <JsonLd
        table={table}
        slug={params.category}
        path={`/${params.slug}/${params.category}`}
        schemaHint={schemaHint}
      />
      <CmsSlugClient
        initialCountry={countryData.country}
        initialCategories={countryData.categories}
        initialTours={countryData.tours}
        initialParks={countryData.parks}
        initialPlaces={countryData.places}
        initialNestedPlace={place}
        initialNestedIsCategory={Boolean(category)}
      />
    </>
  );
}
