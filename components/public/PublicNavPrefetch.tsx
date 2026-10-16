'use client';

import { NAV_COUNTRIES } from '@/lib/collections';
import { destinationPublicPath } from '@/lib/cms-routes';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const WARM_ROUTES = [
  '/',
  '/tours',
  '/destinations',
  '/safari-updates',
  '/gallery',
  '/contact-us',
  '/community-support',
  ...NAV_COUNTRIES.map(({ slug }) => destinationPublicPath(slug)),
];

/** Prefetch main nav targets during idle time so header clicks feel instant. */
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
    // Home first so the header Home click feels instant.
    warm(['/']);
    const run = () => warm(WARM_ROUTES);
    const idle = window.requestIdleCallback?.(run, { timeout: 1800 });
    if (idle == null) {
      const timer = window.setTimeout(run, 400);
      return () => window.clearTimeout(timer);
    }
    return () => window.cancelIdleCallback?.(idle);
  }, [router]);

  return null;
}
