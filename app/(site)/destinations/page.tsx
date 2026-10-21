import { Suspense } from 'react';
import DestinationsIndexClient from '@/components/public/DestinationsIndexClient';
import PublicPageLoader from '@/components/public/PublicPageLoader';
import PublicShellServer from '@/components/public/PublicShellServer';
import { countryHeroImage } from '@/lib/country-heroes';
import { publicCountrySlug } from '@/lib/country-utils';
import { pickString } from '@/lib/data-server';
import { fallbackHomeCountryRows } from '@/lib/home-page-fallback';
import { loadDestinationsIndexCountries } from '@/lib/load-public';
import { preloadPublicHero } from '@/lib/preload-public-hero';
import { destinationListingRows } from '@/lib/public-destinations';
import { rethrowDynamicServerError } from '@/lib/safe-public-load';
import { Metadata } from 'next';

export { revalidate } from '@/lib/public-page-config';

export const metadata: Metadata = {
  title: 'Safari Destinations | Eton Safaris',
  description: 'Explore our African safari destinations including Uganda, Kenya, Tanzania, and Rwanda. Discover gorilla trekking, wildlife, and cultural experiences.',
  alternates: {
    canonical: 'https://etonsafaris.com/destinations',
  },
};

async function DestinationsReady() {
  let countries: Awaited<ReturnType<typeof loadDestinationsIndexCountries>> = [];
  try {
    countries = await loadDestinationsIndexCountries();
  } catch (error) {
    rethrowDynamicServerError(error);
    console.warn('[Public] Destinations index failed:', error);
  }
  const rows = countries.length ? countries : fallbackHomeCountryRows();
  const first = destinationListingRows(rows)[0];
  preloadPublicHero(countryHeroImage(publicCountrySlug(first || {}) || pickString(first || {}, ['name']), first));
  return <DestinationsIndexClient initialCountries={rows} />;
}

export default function DestinationsIndexPage() {
  return (
    <PublicShellServer>
      <Suspense fallback={<PublicPageLoader />}>
        <DestinationsReady />
      </Suspense>
    </PublicShellServer>
  );
}
