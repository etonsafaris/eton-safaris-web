import { Metadata } from 'next';
import PublicRecordUnavailable from '@/components/public/PublicRecordUnavailable';
import CountryPageContent from '@/components/public/CountryPageContent';
import PublicShellServer from '@/components/public/PublicShellServer';
import { countrySlugFromLanding, destinationPublicPath, publicSlugFromInput } from '@/lib/cms-routes';
import { countryLabelFromSlug } from '@/lib/country-utils';
import { countryHeroImage } from '@/lib/country-heroes';
import { loadCountryPageDataResilient, loadStaticDestinationParams } from '@/lib/load-public';
import { publicRecordMetadata } from '@/lib/seo-public';

export const revalidate = 900;
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    return await loadStaticDestinationParams();
  } catch (error) {
    console.warn('[Public] Destination static params failed:', error);
    return [];
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const slug = countrySlugFromLanding(params.slug);
  if (!slug) {
    return {
      title: 'Destination Not Found | Eton Safaris',
      robots: { index: false, follow: false },
    };
  }

  try {
    return await publicRecordMetadata('countries', slug, destinationPublicPath(slug), { contentType: 'country' });
  } catch (error) {
    console.warn('[Public] Destination metadata failed:', slug, error);
    return { title: `${slug} | Eton Safaris`, robots: { index: false, follow: false } };
  }
}

export default async function DestinationCountryPage({ params }: { params: { slug: string } }) {
  const slug = countrySlugFromLanding(params.slug) || publicSlugFromInput(params.slug);
  if (!slug) {
    return (
      <PublicShellServer>
        <PublicRecordUnavailable title="Destination not found" />
      </PublicShellServer>
    );
  }

  const fallbackName = countryLabelFromSlug(slug);
  let data: Awaited<ReturnType<typeof loadCountryPageDataResilient>>;
  try {
    data = await loadCountryPageDataResilient(slug);
  } catch (error) {
    console.warn('[Public] Destination page data failed:', slug, error);
    data = {
      country: null,
      categories: [],
      tours: [],
      parks: [],
      places: [],
    };
  }

  const country =
    data?.country ||
    ({
      name: fallbackName,
      title: fallbackName,
      slug,
      status: 'published',
    } as const);
  const heroSrc = countryHeroImage(slug, country);
  const initialCategories = Array.isArray(data?.categories) ? data.categories : [];
  const initialTours = Array.isArray(data?.tours) ? data.tours : [];
  const initialParks = Array.isArray(data?.parks) ? data.parks : [];
  const initialPlaces = Array.isArray(data?.places) ? data.places : [];

  return (
    <>
      {heroSrc ? <link rel="preload" as="image" href={heroSrc} fetchPriority="high" /> : null}
      <PublicShellServer>
      <CountryPageContent
        key={slug}
        slug={slug}
        country={country}
        initialCategories={initialCategories}
        initialTours={initialTours}
        initialParks={initialParks}
        initialPlaces={initialPlaces}
      />
    </PublicShellServer>
    </>
  );
}
