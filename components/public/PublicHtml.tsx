'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';
import { internalPathFromHref } from '@/lib/internal-link';

type PublicHtmlProps = {
  html: string;
  className?: string;
  style?: React.CSSProperties;
};

const PREFETCH_LIMIT = 12;

export default function PublicHtml({ html, className, style }: PublicHtmlProps) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const onClick = useCallback(
    (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement | null)?.closest('a');
      if (!anchor) return;
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      const pageOrigin = typeof window !== 'undefined' ? window.location.origin : undefined;
      const internal = internalPathFromHref(href, { pageOrigin });
      if (!internal) return;

      event.preventDefault();
      router.push(internal);
    },
    [router]
  );

  useEffect(() => {
    const root = ref.current;
    if (!root || !html.trim()) return undefined;

    root.addEventListener('click', onClick);

    const prefetched = new Set<string>();
    const prefetchPath = (path: string) => {
      const base = path.split('#')[0];
      if (!base || prefetched.has(base)) return;
      prefetched.add(base);
      router.prefetch(base);
    };

    const onWarm = (event: Event) => {
      const anchor = event.currentTarget as HTMLAnchorElement;
      const href = anchor.getAttribute('href');
      if (!href) return;
      const internal = internalPathFromHref(href, { pageOrigin: window.location.origin });
      if (internal) prefetchPath(internal);
    };

    const links = root.querySelectorAll<HTMLAnchorElement>('a[href]');
    links.forEach((anchor, index) => {
      anchor.addEventListener('mouseenter', onWarm, { once: true });
      anchor.addEventListener('focus', onWarm, { once: true });
      if (index < PREFETCH_LIMIT) {
        const href = anchor.getAttribute('href');
        if (href) {
          const internal = internalPathFromHref(href, { pageOrigin: window.location.origin });
          if (internal) prefetchPath(internal);
        }
      }
    });

    return () => {
      root.removeEventListener('click', onClick);
      links.forEach((anchor) => {
        anchor.removeEventListener('mouseenter', onWarm);
        anchor.removeEventListener('focus', onWarm);
      });
    };
  }, [html, onClick, router]);

  if (!html.trim()) return null;

  return <div ref={ref} className={className} style={style} dangerouslySetInnerHTML={{ __html: html }} />;
}
