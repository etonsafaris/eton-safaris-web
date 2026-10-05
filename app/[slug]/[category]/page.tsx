import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CategoryPageContent from '@/components/public/CategoryPageContent';
import JsonLd from '@/components/public/JsonLd';
import PlacePageContent from '@/components/public/PlacePageContent';
import PublicShellServer from '@/components/public/PublicShellServer';
import { countrySlugFromLanding, landingSlugForCountry, resolvePublicSlug } from '@/lib/cms-routes';
import { findCategoryBySlug, findPlaceBySlug, matchesCountry } from '@/lib/country-utils';
import { fetchCollectionRecords, getRecordImage, getRecordTitle, isPublishedRecord, pickString, publicRecordSlug } from '@/lib/data';
import { loadCategoryPageData, loadCountryPageData, loadStaticCategoryParams } from '@/lib/load-public';
import { seoValuesFromRecord } from '@/lib/seo';
import { metadataFromSeo, publicRecordMetadata } from '@/lib/seo-public';
import type { RecordRow } from '@/lib/types';

type PageProps = {
  params: { slug: string; category: string };
};

export const revalidate = 900;
export const dynamicParams = true;

export async function generateStaticParams() {
  return loadStaticCategoryParams();
}

function isReservedPublicSlug(slug: string): boolean {
  return slug.toLowerCase() === 'api';
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  if (isReservedPublicSlug(params.slug)) notFound();
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
  if (isReservedPublicSlug(params.slug)) notFound();
  const resolved = resolvePublicSlug(params.slug);
  const countrySlug = resolved?.countrySlug || countrySlugFromLanding(params.slug) || params.slug;
  const landingSlug = params.slug.includes('-safaris') ? params.slug : landingSlugForCountry(countrySlug);

  const { country, category, categories, tours } = await loadCategoryPageData(countrySlug, params.category);

  if (category) {
    return (
      <>
        <JsonLd
          table="categories"
          slug={params.category}
          path={`/${landingSlug}/${params.category}`}
          schemaHint="TouristTrip"
        />
        <PublicShellServer>
          <CategoryPageContent
            slug={countrySlug}
            country={country}
            categorySlug={params.category}
            initialCategories={categories}
            initialTours={tours}
            initialCategory={category}
            serverPreloaded
          />
        </PublicShellServer>
      </>
    );
  }

  let place: RecordRow | null = null;
  let placeOthers: RecordRow[] = [];
  let placeTours: RecordRow[] = [];
  try {
    const countryPeek = await loadCountryPageData(countrySlug);
    place = findPlaceBySlug(countryPeek.places, params.category, countrySlug);
    if (place) {
      placeOthers = (countryPeek.places ?? [])
        .filter(isPublishedRecord)
        .filter((row) => String(row?.id) !== String(place?.id || ''))
        .filter((row) => matchesCountry(row, countrySlug))
        .slice(0, 20);
      placeTours = (countryPeek.tours ?? []).filter((row) => matchesCountry(row, countrySlug)).slice(0, 12);
    }
  } catch (error) {
    console.warn('[Category page] Place load failed:', error);
  }

  if (place) {
    return (
      <>
        <JsonLd
          table="explore"
          slug={params.category}
          path={`/${landingSlug}/${params.category}`}
          schemaHint="TouristAttraction"
        />
        <PublicShellServer>
          <PlacePageContent
            slug={countrySlug}
            placeSlug={params.category}
            country={country}
            place={place}
            initialOthers={placeOthers}
            initialTours={placeTours}
          />
        </PublicShellServer>
      </>
    );
  }

  notFound();
}
