'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { SITE, SITE_LOGO } from '@/lib/collections';

function tabTitle(name?: string | null) {
  const clean = String(name || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return `${SITE.name} | ${SITE.tagline}`;
  if (clean.toLowerCase().includes(SITE.name.toLowerCase())) return clean;
  return `${clean} | ${SITE.name}`;
}

function applySiteLogoIcon() {
  if (typeof document === 'undefined') return;
  const rels = ['icon', 'shortcut icon', 'apple-touch-icon'];
  rels.forEach((rel) => {
    document.querySelectorAll(`link[rel="${rel}"]`).forEach((node) => node.remove());
    const link = document.createElement('link');
    link.rel = rel;
    link.href = SITE_LOGO;
    link.type = 'image/png';
    document.head.appendChild(link);
  });
}

export default function PageFavicon({ title }: { title?: string | null }) {
  const pathname = usePathname() || '/';

  useEffect(() => {
    applySiteLogoIcon();
  }, []);

  useEffect(() => {
    if (pathname === '/') {
      document.title = `${SITE.name} | ${SITE.tagline}`;
      return;
    }
    if (title) document.title = tabTitle(title);
  }, [pathname, title]);

  return null;
}
