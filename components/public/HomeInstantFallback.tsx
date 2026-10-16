'use client';

import HomePageClient from '@/components/public/HomePageClient';
import { readHomeViewSnapshot } from '@/lib/home-view-cache';
import { fallbackHomeCountryRows, prepareHomePageRenderState } from '@/lib/home-page-fallback';
import { buildHomeHeroSlides } from '@/lib/home-hero-slides';
import { safeHeroSlides } from '@/lib/home-page-payload';
import { mergePublicDestinations } from '@/lib/public-destinations';
import { heroImageSrc } from '@/lib/responsive-image';

/**
 * Soft-nav Suspense fallback: reuse the last painted home view so Home never
 * blacks out while the server bundle streams in.
 */
export default function HomeInstantFallback() {
  const snapshot = readHomeViewSnapshot();
  if (snapshot) {
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

  const countries = fallbackHomeCountryRows();
  const state = prepareHomePageRenderState({
    data: { countries, tours: [], updates: [], categories: [] },
    content: null,
    destinations: mergePublicDestinations(countries),
  });
  const initialHeroSlides = safeHeroSlides(buildHomeHeroSlides(state.data.countries)).map((slide) => ({
    ...slide,
    image: heroImageSrc(slide.image, 58),
  }));

  return (
    <HomePageClient
      initialHeroSlides={initialHeroSlides}
      initialCountries={state.data.countries}
      initialTours={state.data.tours}
      initialUpdates={state.data.updates}
      initialCategories={state.data.categories}
      initialHomeContent={state.homeContent}
      needsClientRefresh
    />
  );
}
