'use client';

import { useEffect, useRef, useState } from 'react';
import type { HomePageContent } from '@/lib/home-page-content';
import type { HomeHeroSlide } from '@/lib/home-hero-slides';
import { buildHomeHeroSlides } from '@/lib/home-hero-slides';
import { mergeHomePagePayload } from '@/lib/home-page-fallback';
import { normalizeHomePagePayload, safeHeroSlides, type HomePagePayload } from '@/lib/home-page-payload';
import type { PublicDestination } from '@/lib/public-destinations';
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
    const sparse =
      needsClientRefresh ||
      heroSlides.length === 0 ||
      data.tours.length === 0 ||
      data.updates.length === 0 ||
      data.countries.length === 0;
    if (!sparse || attemptedRef.current) return undefined;
    attemptedRef.current = true;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        const body = await fetchJsonSafe<HomeBundleResponse>('/api/public/home-bundle');
        if (cancelled || !body?.data) return;
        setData((current) => {
          const merged = mergeHomePagePayload(normalizeHomePagePayload(body.data), current);
          const slides = safeHeroSlides(buildHomeHeroSlides(merged.countries));
          if (slides.length) setHeroSlides(slides);
          else if (Array.isArray(body.heroSlides) && body.heroSlides.length) {
            setHeroSlides(body.heroSlides);
          }
          return merged;
        });
      })();
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [needsClientRefresh, heroSlides.length, data.tours.length, data.updates.length, data.countries.length]);

  return { data, heroSlides };
}
