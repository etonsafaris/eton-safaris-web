import { Suspense } from 'react';
import { permanentRedirect } from 'next/navigation';
import CountryPageContent from '@/components/public/CountryPageContent';
import PublicShellServer from '@/components/public/PublicShellServer';
import { countrySlugFromLanding, isDedicatedLandingCountry, publicSlugFromInput } from '@/lib/cms-routes';
import { countryHeroTitle } from '@/lib/country-landing-copy';
import { countryHeroImage } from '@/lib/country-heroes';
import { countryLabelFromSlug } from '@/lib/country-utils';
import { loadDestinationCountryPage, loadStaticDestinationParams } from '@/lib/load-public';
import { preloadPublicHero } from '@/lib/preload-public-hero';
import { rethrowDynamicServerError } from '@/lib/safe-public-load';
import type { RecordRow } from '@/lib/types';

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

async function DestinationReady({ slug }: { slug: string }) {
  const name = countryLabelFromSlug(slug) || slug;
  let data = {
    country: {
      name,
      title: countryHeroTitle(slug, name),
      slug,
      status: 'published',
    } as RecordRow,
    categories: [] as RecordRow[],
    tours: [] as RecordRow[],
    parks: [] as RecordRow[],
    places: [] as RecordRow[],
  };
  try {
    data = await loadDestinationCountryPage(slug);
  } catch (error) {
    rethrowDynamicServerError(error);
    console.warn('[Public] Destination page failed:', slug, error);
  }
  const country =
    data.country ||
    ({
      name,
      title: countryHeroTitle(slug, name),
      slug,
      status: 'published',
    } as RecordRow);
  preloadPublicHero(countryHeroImage(slug, country));

  return (
    <CountryPageContent
      key={slug}
      slug={slug}
      country={country}
      heroImage={countryHeroImage(slug, country) || ''}
      initialCategories={data.categories ?? []}
      initialTours={data.tours ?? []}
      initialParks={data.parks ?? []}
      initialPlaces={data.places ?? []}
    />
  );
}

export default function DestinationCountryPage({ params }: { params: { slug: string } }) {
  const slug = countrySlugFromLanding(params.slug) || publicSlugFromInput(params.slug);
  if (!slug || !isDedicatedLandingCountry(slug)) permanentRedirect('/destinations');
  const name = countryLabelFromSlug(slug) || slug;
  const shell = {
    name,
    title: countryHeroTitle(slug, name),
    slug,
    status: 'published',
  } as RecordRow;

  return (
    <PublicShellServer>
      <Suspense
        fallback={
          <CountryPageContent
            key={`${slug}-shell`}
            slug={slug}
            country={shell}
            heroImage={countryHeroImage(slug, shell) || ''}
          />
        }
      >
        <DestinationReady slug={slug} />
      </Suspense>
    </PublicShellServer>
  );
}
