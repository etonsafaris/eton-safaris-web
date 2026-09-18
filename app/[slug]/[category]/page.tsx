import type { Metadata } from 'next';
import CategoryPageContent from '@/components/public/CategoryPageContent';
import CmsSlugClient from '@/components/public/CmsSlugClient';
import JsonLd from '@/components/public/JsonLd';
import PublicShellServer from '@/components/public/PublicShellServer';
import { countrySlugFromLanding, resolvePublicSlug } from '@/lib/cms-routes';
import { countryLabelFromSlug, filterToursByCategory, findCategoryBySlug, findPlaceBySlug } from '@/lib/country-utils';
import { fetchCollectionRecords, getRecordImage, getRecordTitle, pickString, publicRecordSlug } from '@/lib/data';
import { seoValuesFromRecord } from '@/lib/seo';
import { metadataFromSeo, publicRecordMetadata } from '@/lib/seo-public';

import { loadCountryPageData } from '@/lib/load-public';
import type { RecordRow } from '@/lib/types';

type PageProps = {
  params: { slug: string; category: string };
};

export const revalidate = 900;
export const dynamicParams = true;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const path = `/${params.slug}/${params.category}`;
  const resolved = resolvePublicSlug(params.slug);
  const countryKey = resolved?.countrySlug || countrySlugFromLanding(params.slug) || params.slug;
  try {
    const [categories, places] = await Promise.all([
      fetchCollectionRecords('categories'),
      fetchCollectionRecords('explore'),
    ]);
    const category = findCategoryBySlug(categories, params.category, countryKey);
    const place = findPlaceBySlug(places, params.category, countryKey);
    if (place && !category) {
      const placeSlug = publicRecordSlug(place) || params.category;
      return publicRecordMetadata('explore', placeSlug, `/explore/${placeSlug}`, { contentType: 'place' });
    }
    const row = category || place;
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
  const countrySlug = resolved?.countrySlug || countrySlugFromLanding(params.slug) || params.slug;

  let countryData: Awaited<ReturnType<typeof loadCountryPageData>>;
  try {
    countryData = await loadCountryPageData(countrySlug);
  } catch (error) {
    console.error('[Category page] Failed to load country data:', error);
    countryData = {
      country: null,
      categories: [],
      tours: [],
      parks: [],
      places: [],
    };
  }

  const category = findCategoryBySlug(countryData.categories, params.category, countrySlug);
  const place = !category ? findPlaceBySlug(countryData.places, params.category, countrySlug) : null;

  let table: 'categories' | 'explore' = 'categories';
  let schemaHint: 'TouristTrip' | 'TouristAttraction' = 'TouristTrip';
  if (place) {
    table = 'explore';
    schemaHint = 'TouristAttraction';
  }

  const fallbackName = countryLabelFromSlug(countrySlug);
  const country: RecordRow =
    countryData.country ||
    ({
      name: fallbackName,
      title: fallbackName,
      slug: countrySlug,
    } as RecordRow);

  if (place) {
    return (
      <>
        <JsonLd
          table={table}
          slug={params.category}
          path={`/${params.slug}/${params.category}`}
          schemaHint={schemaHint}
        />
        <CmsSlugClient
          key={`${params.slug}/${params.category}`}
          initialCountry={country}
          initialCategories={countryData.categories}
          initialTours={countryData.tours}
          initialParks={countryData.parks}
          initialPlaces={countryData.places}
          initialNestedPlace={place}
          initialNestedIsCategory={false}
        />
      </>
    );
  }

  const filteredTours = filterToursByCategory(countryData.tours, category, params.category);

  return (
    <>
      <JsonLd
        table={table}
        slug={params.category}
        path={`/${params.slug}/${params.category}`}
        schemaHint={schemaHint}
      />
      <PublicShellServer>
        <CategoryPageContent
          slug={countrySlug}
          country={country}
          categorySlug={params.category}
          initialCategories={countryData.categories}
          initialTours={filteredTours.length ? filteredTours : countryData.tours}
          initialCategory={category}
          serverPreloaded
        />
      </PublicShellServer>
    </>
  );
}
