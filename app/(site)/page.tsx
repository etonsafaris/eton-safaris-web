import { Suspense } from 'react';
import { preload } from 'react-dom';
import HomePageClient from '@/components/public/HomePageClient';
import PublicShellServer from '@/components/public/PublicShellServer';
import { buildHomeHeroSlides } from '@/lib/home-hero-slides';
import { fallbackHomeCountryRows, prepareHomePageRenderState } from '@/lib/home-page-fallback';
import { safeHeroSlides } from '@/lib/home-page-payload';
import { loadHomePageBundleResilient } from '@/lib/load-public';
import { heroImageSrc } from '@/lib/responsive-image';
import { mergePublicDestinations } from '@/lib/public-destinations';
import { publicCanonicalUrl } from '@/lib/seo-canonical';
import { Metadata } from 'next';

const HOME_TITLE = 'Eton Safaris | Africa & Beyond';
const HOME_DESCRIPTION =
  'Premier gorilla trekking, wildlife safaris, and tailor-made luxury expeditions across Uganda, Kenya, Tanzania, Rwanda, and beyond.';

export function generateMetadata(): Metadata {
  return {
    title: {
      absolute: HOME_TITLE,
    },
    description: HOME_DESCRIPTION,
    alternates: {
      canonical: publicCanonicalUrl('/'),
    },
    robots: { index: true, follow: true },
  };
}

function HomeScreen({
  state,
  refresh,
}: {
  state: ReturnType<typeof prepareHomePageRenderState>;
  refresh?: boolean;
}) {
  const initialHeroSlides = safeHeroSlides(buildHomeHeroSlides(state.data.countries)).map((slide) => ({
    ...slide,
    image: heroImageSrc(slide.image, 58),
  }));
  const firstHero = initialHeroSlides[0]?.image;
  if (firstHero) {
    preload(firstHero, { as: 'image', fetchPriority: 'high' });
  }

  return (
    <HomePageClient
      initialHeroSlides={initialHeroSlides}
      initialCountries={state.data.countries}
      initialTours={state.data.tours}
      initialUpdates={state.data.updates}
      initialCategories={state.data.categories}
      initialHomeContent={state.homeContent}
      needsClientRefresh={refresh || state.needsClientRefresh || initialHeroSlides.length === 0}
    />
  );
}

function HomeShell() {
  const countries = fallbackHomeCountryRows();
  const state = prepareHomePageRenderState({
    data: { countries, tours: [], updates: [], categories: [] },
    content: null,
    destinations: mergePublicDestinations(countries),
  });
  return <HomeScreen state={state} refresh />;
}

async function HomeReady() {
  const bundle = await loadHomePageBundleResilient();
  return <HomeScreen state={prepareHomePageRenderState(bundle)} />;
}

export default function HomePage() {
  return (
    <PublicShellServer>
      <Suspense fallback={<HomeShell />}>
        <HomeReady />
      </Suspense>
    </PublicShellServer>
  );
}
