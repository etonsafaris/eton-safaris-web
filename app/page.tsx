import HomePageClient from '@/components/public/HomePageClient';
import PublicShellServer from '@/components/public/PublicShellServer';
import { buildHomeHeroSlides } from '@/lib/home-hero-slides';
import {
  EMPTY_HOME_PAGE_PAYLOAD,
  normalizeHomePagePayload,
  resolveHomePageContent,
  safeHeroSlides,
} from '@/lib/home-page-payload';
import { loadHomePageContent, loadHomePageData } from '@/lib/load-public';
import { publicCanonicalUrl } from '@/lib/seo-canonical';
import { Metadata } from 'next';

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
  let data = EMPTY_HOME_PAGE_PAYLOAD;
  let homeContent = resolveHomePageContent(null);
  let initialHeroSlides = safeHeroSlides([]);

  try {
    const loaded = await loadHomePageData();
    data = normalizeHomePagePayload(loaded);
  } catch (error) {
    console.error('[Public] Home page data failed:', error);
    data = EMPTY_HOME_PAGE_PAYLOAD;
  }

  try {
    const content = await loadHomePageContent();
    homeContent = resolveHomePageContent(content);
  } catch (error) {
    console.error('[Public] Home page content failed:', error);
    homeContent = resolveHomePageContent(null);
  }

  try {
    initialHeroSlides = safeHeroSlides(buildHomeHeroSlides());
  } catch (error) {
    console.error('[Public] Home hero slides failed:', error);
    initialHeroSlides = safeHeroSlides([]);
  }

  return (
    <PublicShellServer>
      <HomePageClient
        initialHeroSlides={initialHeroSlides}
        initialCountries={data?.countries ?? []}
        initialTours={data?.tours ?? []}
        initialUpdates={data?.updates ?? []}
        initialCategories={data?.categories ?? []}
        initialHomeContent={homeContent}
      />
    </PublicShellServer>
  );
}
