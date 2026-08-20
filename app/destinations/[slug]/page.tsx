import { notFound } from 'next/navigation';
import CountryPageContent from '@/components/public/CountryPageContent';
import PublicShell from '@/components/public/PublicShell';
import { NAV_COUNTRIES, OTHER_DESTINATIONS } from '@/lib/collections';
import { countrySlugFromLanding } from '@/lib/cms-routes';
import { countryLabelFromSlug } from '@/lib/country-utils';
import { loadCountryPageData } from '@/lib/load-public';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SEEDED = [...NAV_COUNTRIES, ...OTHER_DESTINATIONS];

export default async function DestinationCountryPage({ params }: { params: { slug: string } }) {
  const slug = countrySlugFromLanding(params.slug);
  const data = await loadCountryPageData(slug);
  const seeded = SEEDED.find((item) => item.slug === slug);
  if (!data.country && !seeded) notFound();

  const country = data.country ||
    (seeded
      ? {
          name: seeded.name,
          title: seeded.name,
          slug,
        }
      : {
          name: countryLabelFromSlug(slug),
          title: countryLabelFromSlug(slug),
          slug,
        });

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
