import HomePageClient from '@/components/public/HomePageClient';
import PublicShellServer from '@/components/public/PublicShellServer';
import { countryHeroImage } from '@/lib/country-heroes';
import { buildHomeHeroSlides } from '@/lib/home-hero-slides';
import { prepareHomePageRenderState } from '@/lib/home-page-fallback';
import { safeHeroSlides } from '@/lib/home-page-payload';
import { loadHomePageBundleResilient } from '@/lib/load-public';
import { NAV_COUNTRIES } from '@/lib/collections';
import { recordMatchesCountrySlug } from '@/lib/country-match';
import { publicCanonicalUrl } from '@/lib/seo-canonical';
import { Metadata } from 'next';

/** ISR: serve cached HTML at the edge; refresh from Aiven every 15 minutes. */
export const revalidate = 900;

export const metadata: Metadata = {
  title: {
    absolute: 'Eton Safaris | Africa & Beyond',
  },
  description:
    'Premier gorilla trekking, wildlife safaris, and tailor-made luxury expeditions across Uganda, Kenya, Tanzania, Rwanda, and beyond.',
  alternates: {
    canonical: publicCanonicalUrl('/'),
  },
  robots: { index: true, follow: true },
};

export default async function HomePage() {
  const bundle = await loadHomePageBundleResilient();
  const { data, homeContent, destinations, needsClientRefresh } = prepareHomePageRenderState(bundle);
  const initialHeroSlides = safeHeroSlides(buildHomeHeroSlides(data.countries));
  const firstNav = NAV_COUNTRIES[0];
  const firstCountry = data.countries.find((row) => recordMatchesCountrySlug(row, firstNav.slug));
  const lcpHero =
    initialHeroSlides[0]?.image || countryHeroImage(firstNav.slug, firstCountry) || '/heroes/uganda.jpg';

  return (
    <>
      <link rel="preload" as="image" href={lcpHero} fetchPriority="high" />
      <PublicShellServer initialDestinations={destinations}>
      <HomePageClient
        initialHeroSlides={initialHeroSlides}
        initialCountries={data.countries}
        initialTours={data.tours}
        initialUpdates={data.updates}
        initialCategories={data.categories}
        initialHomeContent={homeContent}
        needsClientRefresh={needsClientRefresh}
      />
      </PublicShellServer>
    </>
  );
}
