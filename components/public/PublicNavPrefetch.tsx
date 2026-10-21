'use client';

import { writeHomeViewSnapshot } from '@/lib/home-view-cache';
import { buildHomeHeroSlides } from '@/lib/home-hero-slides';
import { prepareHomePageRenderState } from '@/lib/home-page-fallback';
import { safeHeroSlides, normalizeHomePagePayload } from '@/lib/home-page-payload';
import { heroImageSrc } from '@/lib/responsive-image';
import { isDirectFileHref } from '@/lib/document-href';
import { internalPathFromHref } from '@/lib/internal-link';
import { isPrefixedPublicPath, normalizePrefixedPublicPath } from '@/lib/public-path-utils';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const WARM_ROUTES = ['/', '/tours', '/destinations'];

/** Prefetch main nav targets + warm the home snapshot so Home is instant on first click. */
export default function PublicNavPrefetch() {
  const router = useRouter();

  useEffect(() => {
    const warm = (paths: string[]) => {
      for (const path of paths) {
        try {
          router.prefetch(path);
        } catch {
          // ignore
        }
      }
    };

    warm(['/']);

    const warmHomeBundle = () => {
      void fetch('/api/public/home-bundle', { cache: 'force-cache' })
        .then((response) => (response.ok ? response.json() : null))
        .then((body) => {
          if (!body?.data) return;
          const state = prepareHomePageRenderState(body);
          const tours = normalizeHomePagePayload(state.data).tours;
          if (!tours.length) return;
          const built = safeHeroSlides(body.heroSlides || buildHomeHeroSlides(state.data.countries)).map(
            (slide) => ({
              ...slide,
              image: heroImageSrc(slide.image, 58),
            })
          );
          writeHomeViewSnapshot({
            heroSlides: built,
            countries: state.data.countries,
            tours: state.data.tours,
            updates: state.data.updates,
            categories: state.data.categories,
            homeContent: state.homeContent,
          });
        })
        .catch(() => {
          /* ignore */
        });
    };

    const run = () => {
      warm(WARM_ROUTES);
      warmHomeBundle();
    };

    const idle = window.requestIdleCallback?.(run, { timeout: 1200 });
    const onHover = (event: PointerEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest?.('a[href]');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || isDirectFileHref(href)) return;
      const internal = internalPathFromHref(href, { pageOrigin: window.location.origin });
      if (!internal || !isPrefixedPublicPath(internal)) return;
      try {
        router.prefetch(normalizePrefixedPublicPath(internal));
      } catch {
        /* ignore */
      }
    };
    document.addEventListener('pointerover', onHover, { capture: true, passive: true });
    if (idle == null) {
      const timer = window.setTimeout(run, 200);
      return () => {
        window.clearTimeout(timer);
        document.removeEventListener('pointerover', onHover, true);
      };
    }
    return () => {
      window.cancelIdleCallback?.(idle);
      document.removeEventListener('pointerover', onHover, true);
    };
  }, [router]);

  return null;
}
