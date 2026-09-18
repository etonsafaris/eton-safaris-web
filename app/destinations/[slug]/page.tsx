import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import CountryPageContent from '@/components/public/CountryPageContent';
import PublicShell from '@/components/public/PublicShell';
import { countrySlugFromLanding } from '@/lib/cms-routes';
import { countryLabelFromSlug } from '@/lib/country-utils';
import { loadCountryPageData } from '@/lib/load-public';

export { dynamic, fetchCache, revalidate } from '@/lib/public-page-config';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const slug = countrySlugFromLanding(params.slug);
  if (!slug) {
    return {
      title: 'Destination Not Found | Eton Safaris',
    };
  }

  const countryName = countryLabelFromSlug(slug);
  return {
    title: `${countryName} Safaris | Eton Safaris`,
    description: `Discover amazing safari tours, national parks, and wildlife experiences in ${countryName} with Eton Safaris. Book your dream African adventure today.`,
    alternates: {
      canonical: `https://etonsafaris.com/destinations/${slug}`,
    },
  };
}

export default async function DestinationCountryPage({ params }: { params: { slug: string } }) {
  const slug = countrySlugFromLanding(params.slug);
  if (!slug) notFound();

  let data: Awaited<ReturnType<typeof loadCountryPageData>> = {
    country: null,
    categories: [],
    tours: [],
    parks: [],
    places: [],
  };
  try {
    data = await loadCountryPageData(slug);
  } catch (error) {
    console.error('[Destination detail] Failed to load country:', error);
  }

  return (
    <PublicShell>
      <CountryPageContent
        key={slug}
        slug={slug}
        country={data.country}
        initialCategories={data.categories}
        initialTours={data.tours}
        initialParks={data.parks}
        initialPlaces={data.places}
      />
    </PublicShell>
  );
}
