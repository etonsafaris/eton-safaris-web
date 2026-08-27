import { notFound } from 'next/navigation';
import CountryPageContent from '@/components/public/CountryPageContent';
import PublicShell from '@/components/public/PublicShell';
import { NAV_COUNTRIES, OTHER_DESTINATIONS } from '@/lib/collections';
import { countrySlugFromLanding } from '@/lib/cms-routes';
import { countryLabelFromSlug } from '@/lib/country-utils';

export const revalidate = 60;

const SEEDED = [...NAV_COUNTRIES, ...OTHER_DESTINATIONS];

export default function DestinationCountryPage({ params }: { params: { slug: string } }) {
  const slug = countrySlugFromLanding(params.slug);
  if (!slug) notFound();
  const seeded = SEEDED.find((item) => item.slug === slug);
  const country = seeded
    ? {
        name: seeded.name,
        title: seeded.name,
        slug,
      }
    : {
        name: countryLabelFromSlug(slug),
        title: countryLabelFromSlug(slug),
        slug,
      };

  return (
    <PublicShell>
      <CountryPageContent
        slug={slug}
        country={country}
        initialCategories={[]}
        initialTours={[]}
        initialParks={[]}
        initialPlaces={[]}
      />
    </PublicShell>
  );
}
