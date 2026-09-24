import HomePageClient from '@/components/public/HomePageClient';
import PublicShellServer from '@/components/public/PublicShellServer';
import { buildHomeHeroSlides } from '@/lib/home-hero-slides';
import {
  EMPTY_HOME_PAGE_PAYLOAD,
  normalizeHomePagePayload,
  resolveHomePageContent,
  safeHeroSlides,
} from '@/lib/home-page-payload';
import { loadHomePageBundle } from '@/lib/load-public';
import type { PublicDestination } from '@/lib/public-destinations';
import { publicCanonicalUrl } from '@/lib/seo-canonical';
import { Metadata } from 'next';

/** Render on demand so `next build` does not fan out DB connections. */
export const dynamic = 'force-dynamic';

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
  let data = EMPTY_HOME_PAGE_PAYLOAD;
  let homeContent = resolveHomePageContent(null);
  let initialHeroSlides = safeHeroSlides([]);

  let navDestinations: PublicDestination[] | undefined;
  try {
    const bundle = await loadHomePageBundle();
    data = normalizeHomePagePayload(bundle.data);
    homeContent = resolveHomePageContent(bundle.content);
    navDestinations = bundle.destinations;
  } catch (error) {
    console.error('[Public] Home page bundle failed:', error);
    data = EMPTY_HOME_PAGE_PAYLOAD;
    homeContent = resolveHomePageContent(null);
  }

  try {
    initialHeroSlides = safeHeroSlides(buildHomeHeroSlides(data.countries));
  } catch (error) {
    console.error('[Public] Home hero slides failed:', error);
    initialHeroSlides = safeHeroSlides([]);
  }

  const countries = data?.countries ?? [];
  const tours = data?.tours ?? [];
  const updates = data?.updates ?? [];
  const categories = data?.categories ?? [];

  return (
    <PublicShellServer initialDestinations={navDestinations}>
      <HomePageClient
        initialHeroSlides={initialHeroSlides ?? []}
        initialCountries={countries}
        initialTours={tours}
        initialUpdates={updates}
        initialCategories={categories}
        initialHomeContent={homeContent}
      />
    </PublicShellServer>
  );
}
