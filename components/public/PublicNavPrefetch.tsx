'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const WARM_ROUTES = [
  '/',
  '/tours',
  '/destinations',
  '/safari-updates',
  '/parks',
  '/accommodations',
  '/contact-us',
  '/community-support',
];

/** Prefetch main nav targets during idle time so header clicks feel instant. */
export default function PublicNavPrefetch() {
  const router = useRouter();

  useEffect(() => {
    const run = () => {
      WARM_ROUTES.forEach((path) => {
        try {
          router.prefetch(path);
        } catch {
          // ignore
        }
      });
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
