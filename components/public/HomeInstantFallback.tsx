'use client';

import HomePageClient from '@/components/public/HomePageClient';
import PublicPageLoader from '@/components/public/PublicPageLoader';
import { readHomeViewSnapshot } from '@/lib/home-view-cache';
import { safeHeroSlides } from '@/lib/home-page-payload';

/**
 * Soft-nav Home fallback:
 * - Reuse the last full home paint when available (instant sections).
 * - Otherwise show the original brand loader until the server bundle arrives.
 */
export default function HomeInstantFallback() {
  const snapshot = readHomeViewSnapshot();
  if (snapshot?.tours?.length) {
    return (
      <HomePageClient
        initialHeroSlides={safeHeroSlides(snapshot.heroSlides)}
        initialCountries={snapshot.countries}
        initialTours={snapshot.tours}
        initialUpdates={snapshot.updates}
        initialCategories={snapshot.categories}
        initialHomeContent={snapshot.homeContent}
        needsClientRefresh={false}
      />
    );
  }

  return <PublicPageLoader label="Loading home" />;
}
