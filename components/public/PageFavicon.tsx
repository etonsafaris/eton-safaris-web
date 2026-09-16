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

function applyGorillaFavicon() {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]').forEach((node) => {
    const href = (node as HTMLLinkElement).href || '';
    if (!href.includes('eton-safaris-gorilla.png')) node.remove();
  });
  const rels = ['icon', 'shortcut icon', 'apple-touch-icon'];
  rels.forEach((rel) => {
    let link = document.querySelector(`link[rel="${rel}"][data-eton-logo="1"]`) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = rel;
      link.setAttribute('data-eton-logo', '1');
      document.head.appendChild(link);
    }
    link.type = 'image/png';
    link.href = SITE_LOGO;
  });
}

export default function PageFavicon({ title }: { title?: string | null }) {
  const pathname = usePathname() || '/';

  useEffect(() => {
    applyGorillaFavicon();
  }, [pathname]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (title) {
      document.title = tabTitle(title);
    } else if (pathname === '/') {
      document.title = `${SITE.name} | ${SITE.tagline}`;
    } else {
      document.title = SITE.name;
    }
  }, [pathname, title]);

  return null;
}
