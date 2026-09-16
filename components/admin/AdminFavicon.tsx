'use client';

import { useEffect } from 'react';
import { SITE, SITE_LOGO } from '@/lib/collections';

export default function AdminFavicon() {
  useEffect(() => {
    document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]').forEach((node) => {
      const href = (node as HTMLLinkElement).href || '';
      if (!href.includes('eton-safaris-gorilla.png')) node.remove();
    });
    ['icon', 'shortcut icon', 'apple-touch-icon'].forEach((rel) => {
      let link = document.querySelector(`link[rel="${rel}"][data-eton-logo="1"]`) as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.rel = rel;
        link.type = 'image/png';
        link.setAttribute('data-eton-logo', '1');
        document.head.appendChild(link);
      }
      link.href = SITE_LOGO;
    });
    if (!document.title.includes(SITE.name)) {
      document.title = `${SITE.name} Admin`;
    }
  }, []);
  return null;
}
