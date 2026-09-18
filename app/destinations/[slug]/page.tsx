import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import CountryPageContent from '@/components/public/CountryPageContent';
import PublicShell from '@/components/public/PublicShell';
import { countrySlugFromLanding } from '@/lib/cms-routes';
import { countryLabelFromSlug } from '@/lib/country-utils';
import { loadCountryPageData } from '@/lib/load-public';

export { revalidate } from '@/lib/public-page-config';

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

  let data;
  try {
    data = await loadCountryPageData(slug);
  } catch (error) {
    console.error('[Destination detail] Failed to load country:', error);
    notFound();
  }
  if (!data.country) notFound();
  const country =
    data.country ||
    ({
      name: countryLabelFromSlug(slug),
      title: countryLabelFromSlug(slug),
      slug,
    } as const);

  return (
    <PublicShell>
      <CountryPageContent
        key={slug}
        slug={slug}
        country={country}
        initialCategories={data.categories}
        initialTours={data.tours}
        initialParks={data.parks}
        initialPlaces={data.places}
      />
    </PublicShell>
  );
}
