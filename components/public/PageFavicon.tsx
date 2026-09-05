'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { SITE } from '@/lib/collections';

function tabTitle(name?: string | null) {
  const clean = String(name || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return `${SITE.name} | ${SITE.tagline}`;
  if (clean.toLowerCase().includes(SITE.name.toLowerCase())) return clean;
  return `${clean} | ${SITE.name}`;
}

export default function PageFavicon({ title }: { title?: string | null }) {
  const pathname = usePathname() || '/';

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (title) {
      document.title = tabTitle(title);
    } else if (pathname === '/') {
      document.title = `${SITE.name} | ${SITE.tagline}`;
    } else {
      // Never leave the previous route's title behind after client navigation.
      document.title = SITE.name;
    }
  }, [pathname, title]);

  return null;
}
