'use client';

import { useEffect, useRef, useState } from 'react';
import type { HomePageContent } from '@/lib/home-page-content';
import type { HomeHeroSlide } from '@/lib/home-hero-slides';
import { mergeHomePagePayload } from '@/lib/home-page-fallback';
import { normalizeHomePagePayload, type HomePagePayload } from '@/lib/home-page-payload';
import type { PublicDestination } from '@/lib/public-destinations';
import type { RecordRow } from '@/lib/types';

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
      needsClientRefresh || data.tours.length === 0 || data.updates.length === 0 || data.countries.length === 0;
    if (!sparse || attemptedRef.current) return undefined;
    attemptedRef.current = true;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      fetch('/api/public/home-bundle', { credentials: 'same-origin' })
        .then((res) => (res.ok ? res.json() : null))
        .then((body: HomeBundleResponse | null) => {
          if (cancelled || !body?.data) return;
          setData((current) =>
            mergeHomePagePayload(normalizeHomePagePayload(body.data), current)
          );
          if (Array.isArray(body.heroSlides) && body.heroSlides.length) {
            setHeroSlides(body.heroSlides);
          }
        })
        .catch(() => undefined);
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [needsClientRefresh, data.tours.length, data.updates.length, data.countries.length]);

  return { data, heroSlides };
}
