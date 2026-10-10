'use client';

import { useEffect, useRef, useState } from 'react';
import type { HomePageContent } from '@/lib/home-page-content';
import type { HomeHeroSlide } from '@/lib/home-hero-slides';
import { buildHomeHeroSlides, fallbackHomeHeroSlides } from '@/lib/home-hero-slides';
import { mergeHomePagePayload } from '@/lib/home-page-fallback';
import { normalizeHomePagePayload, safeHeroSlides, type HomePagePayload } from '@/lib/home-page-payload';
import type { PublicDestination } from '@/lib/public-destinations';
import { selectHomePopularTours } from '@/lib/home-featured-tours';
import { fetchJsonSafe } from '@/lib/safe-client-fetch';

type HomeBundleResponse = {
  data?: Partial<HomePagePayload> | null;
  content?: HomePageContent | null;
  destinations?: PublicDestination[];
  heroSlides?: HomeHeroSlide[];
};

export function useHomePageRecovery(options: {
  initialData: HomePagePayload;
  initialHeroSlides: HomeHeroSlide[];
  needsClientRefresh: boolean;
}) {
  const { initialData, initialHeroSlides, needsClientRefresh } = options;
  const [data, setData] = useState(initialData);
  const [heroSlides, setHeroSlides] = useState(initialHeroSlides);
  const attemptedRef = useRef(false);

  useEffect(() => {
    setData(initialData);
    setHeroSlides(initialHeroSlides);
  }, [initialData, initialHeroSlides]);

  useEffect(() => {
    const popularToursMissing =
      data.tours.length > 0 && selectHomePopularTours(data.tours, 1).length === 0;
    const sparse =
      needsClientRefresh ||
      data.tours.length === 0 ||
      (heroSlides.length === 0 && data.countries.length === 0) ||
      popularToursMissing;
    if (!sparse || attemptedRef.current) return undefined;
    attemptedRef.current = true;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        const body = await fetchJsonSafe<HomeBundleResponse>('/api/public/home-bundle');
        const incoming = normalizeHomePagePayload(body?.data);
        if (cancelled || incoming.tours.length === 0) return;
        setData((current) => {
          const merged = mergeHomePagePayload(incoming, current);
          const slides = safeHeroSlides(buildHomeHeroSlides(merged.countries));
          if (slides.length) setHeroSlides(slides);
          else if (Array.isArray(body?.heroSlides) && body.heroSlides.length) {
            setHeroSlides(body.heroSlides);
          } else {
            setHeroSlides(safeHeroSlides(fallbackHomeHeroSlides()));
          }
          return merged;
        });
      })();
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [needsClientRefresh, data.tours.length]);

  return { data, heroSlides };
}
