'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';
import { internalPathFromHref } from '@/lib/internal-link';
import { resolvePublicContentPath, warmResolvePublicContentPath } from '@/lib/public-content-link';

type PublicHtmlProps = {
  html: string;
  className?: string;
  style?: React.CSSProperties;
};

const PREFETCH_LIMIT = 12;

export default function PublicHtml({ html, className, style }: PublicHtmlProps) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const navigatingRef = useRef(false);

  const navigateInternal = useCallback(
    async (internalPath: string) => {
      if (navigatingRef.current) return;
      navigatingRef.current = true;
      try {
        const target = await resolvePublicContentPath(internalPath);
        router.push(target);
      } finally {
        window.setTimeout(() => {
          navigatingRef.current = false;
        }, 300);
      }
    },
    [router]
  );

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
      void navigateInternal(internal);
    },
    [navigateInternal]
  );

  useEffect(() => {
    const root = ref.current;
    if (!root || !html.trim()) return undefined;

    root.addEventListener('click', onClick);

    const prefetched = new Set<string>();
    const prefetchPath = (path: string) => {
      void warmResolvePublicContentPath(path).then((resolved) => {
        const base = resolved.split('#')[0];
        if (!base || prefetched.has(base)) return;
        prefetched.add(base);
        router.prefetch(base);
      });
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
      const href = anchor.getAttribute('href');
      if (href) {
        const pageOrigin = window.location.origin;
        const internal = internalPathFromHref(href, { pageOrigin });
        if (internal) {
          void warmResolvePublicContentPath(internal).then((resolved) => {
            if (resolved && resolved !== href) anchor.setAttribute('href', resolved);
          });
        }
      }

      anchor.addEventListener('mouseenter', onWarm, { once: true });
      anchor.addEventListener('focus', onWarm, { once: true });
      if (index < PREFETCH_LIMIT && href) {
        const internal = internalPathFromHref(href, { pageOrigin: window.location.origin });
        if (internal) prefetchPath(internal);
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

  return (
    <div ref={ref} className={className} style={style}>
      <div className="public-html-surface" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

/** Next.js Link wrapper for a resolved in-app path (used where we build links in React). */
export function PublicContentLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const internal = internalPathFromHref(href);
  if (!internal) {
    return (
      <a href={href} className={className} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  return (
    <Link href={internal} prefetch className={className}>
      {children}
    </Link>
  );
}
