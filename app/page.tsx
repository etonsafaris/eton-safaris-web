import HomePageClient from '@/components/public/HomePageClient';
import PublicShellServer from '@/components/public/PublicShellServer';
import { fallbackHomeHeroSlides } from '@/lib/home-hero-slides';
import { safeHeroSlides } from '@/lib/home-page-payload';
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

export default function HomePage() {
  const initialHeroSlides = safeHeroSlides(fallbackHomeHeroSlides());

  return (
    <>
      <PublicShellServer>
        <HomePageClient
          initialHeroSlides={initialHeroSlides}
          initialCountries={[]}
          initialTours={[]}
          initialUpdates={[]}
          initialCategories={[]}
          needsClientRefresh
        />
      </PublicShellServer>
    </>
  );
}
