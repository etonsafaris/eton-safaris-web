import { preload } from 'react-dom';
import HomePageClient from '@/components/public/HomePageClient';
import PublicShellServer from '@/components/public/PublicShellServer';
import { buildHomeHeroSlides } from '@/lib/home-hero-slides';
import { prepareHomePageRenderState } from '@/lib/home-page-fallback';
import { safeHeroSlides } from '@/lib/home-page-payload';
import { loadHomePageBundleResilient } from '@/lib/load-public';
import { heroImageSrc } from '@/lib/responsive-image';
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

export default async function HomePage() {
  const bundle = await loadHomePageBundleResilient();
  const state = prepareHomePageRenderState(bundle);
  const initialHeroSlides = safeHeroSlides(buildHomeHeroSlides(state.data.countries)).map((slide) => ({
    ...slide,
    image: heroImageSrc(slide.image, 58),
  }));
  const firstHero = initialHeroSlides[0]?.image;
  if (firstHero) {
    preload(firstHero, { as: 'image', fetchPriority: 'high' });
  }

  return (
    <PublicShellServer>
      <HomePageClient
        initialHeroSlides={initialHeroSlides}
        initialCountries={state.data.countries}
        initialTours={state.data.tours}
        initialUpdates={state.data.updates}
        initialCategories={state.data.categories}
        initialHomeContent={state.homeContent}
        needsClientRefresh={state.needsClientRefresh || initialHeroSlides.length === 0}
      />
    </PublicShellServer>
  );
}
