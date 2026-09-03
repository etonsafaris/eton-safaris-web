import { notFound } from 'next/navigation';
import CountryPageContent from '@/components/public/CountryPageContent';
import PublicShell from '@/components/public/PublicShell';
import { countrySlugFromLanding } from '@/lib/cms-routes';
import { countryLabelFromSlug } from '@/lib/country-utils';
import { loadCountryPageData } from '@/lib/load-public';

export { dynamic, fetchCache, revalidate } from '@/lib/public-page-config';

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
