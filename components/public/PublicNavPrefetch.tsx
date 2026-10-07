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
  '/contact-us',
  '/community-support',
  ...NAV_COUNTRIES.map(({ slug }) => destinationPublicPath(slug)),
];

/** Prefetch main nav targets during idle time so header clicks feel instant. */
export default function PublicNavPrefetch() {
  const router = useRouter();

  useEffect(() => {
    const run = () => {
      for (const path of WARM_ROUTES) {
        try {
          router.prefetch(path);
        } catch {
          // ignore
        }
      }
    };
    const idle = window.requestIdleCallback?.(run, { timeout: 2500 });
    if (idle == null) {
      const timer = window.setTimeout(run, 1200);
      return () => window.clearTimeout(timer);
    }
    return () => window.cancelIdleCallback?.(idle);
  }, [router]);

  return null;
}
