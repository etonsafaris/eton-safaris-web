'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';
import { internalPathFromHref } from '@/lib/internal-link';
import { isBlockedExternalHost, scrubLegacyMediaFromHtml } from '@/lib/legacy-media-url';
import { isPrefixedPublicPath, normalizePrefixedPublicPath } from '@/lib/public-path-utils';

const FILE_HREF = /\.(pdf|docx?|xlsx?|pptx?|zip|csv|txt)(?:$|[?#])/i;

function isDirectFileHref(href: string) {
  const value = href.trim();
  if (!value) return false;
  if (FILE_HREF.test(value.split('#')[0])) return true;
  return /\/downloads\//i.test(value);
}

type PublicHtmlProps = {
  html: string;
  className?: string;
  style?: React.CSSProperties;
};

async function resolvePathForNavigation(path: string): Promise<string> {
  const trimmed = path.trim();
  if (!trimmed || isPrefixedPublicPath(trimmed) || isDirectFileHref(trimmed)) {
    return normalizePrefixedPublicPath(trimmed || '/');
  }
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 1200);
  try {
    const response = await fetch(`/api/public/resolve-path?path=${encodeURIComponent(trimmed)}`, {
      credentials: 'same-origin',
      signal: controller.signal,
    });
    const body = (await response.json().catch(() => ({}))) as { path?: string };
    return body.path || normalizePrefixedPublicPath(trimmed);
  } catch {
    return normalizePrefixedPublicPath(trimmed);
  } finally {
    window.clearTimeout(timer);
  }
}

export default function PublicHtml({ html, className, style }: PublicHtmlProps) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const navigatingRef = useRef(false);

  const navigateInternal = useCallback(
    async (internalPath: string) => {
      if (navigatingRef.current) return;
      navigatingRef.current = true;
      try {
        const target = await resolvePathForNavigation(internalPath);
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
      if (!href || isDirectFileHref(href)) return;

      try {
        const parsed = new URL(href, window.location.origin);
        if (isBlockedExternalHost(parsed.hostname)) {
          event.preventDefault();
          return;
        }
      } catch {
        /* relative */
      }

      const pageOrigin = typeof window !== 'undefined' ? window.location.origin : undefined;
      const internal = internalPathFromHref(href, { pageOrigin });
      if (!internal || isDirectFileHref(internal)) return;

      event.preventDefault();
      if (isPrefixedPublicPath(internal)) {
        router.push(normalizePrefixedPublicPath(internal));
        return;
      }
      void navigateInternal(internal);
    },
    [navigateInternal, router]
  );

  useEffect(() => {
    const root = ref.current;
    if (!root || !html.trim()) return undefined;

    root.addEventListener('click', onClick);

    const prefetched = new Set<string>();
    root.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((anchor) => {
      const href = anchor.getAttribute('href');
      if (!href) return;
      const internal = internalPathFromHref(href, { pageOrigin: window.location.origin });
      if (!internal || isDirectFileHref(internal) || !isPrefixedPublicPath(internal)) return;
      const base = normalizePrefixedPublicPath(internal).split('#')[0];
      if (!base || prefetched.has(base)) return;
      prefetched.add(base);
      router.prefetch(base);
    });

    return () => {
      root.removeEventListener('click', onClick);
    };
  }, [html, onClick, router]);

  const safeHtml = scrubLegacyMediaFromHtml(html);
  if (!safeHtml.trim()) return null;

  return (
    <div ref={ref} className={className} style={style}>
      <div className="public-html-surface" dangerouslySetInnerHTML={{ __html: safeHtml }} />
    </div>
  );
}

export function PublicContentLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  try {
    const host = new URL(href, 'https://etonsafaris.com').hostname;
    if (isBlockedExternalHost(host)) {
      return <span className={className}>{children}</span>;
    }
  } catch {
    /* relative */
  }

  const internal = internalPathFromHref(href);
  if (!internal || isDirectFileHref(href) || isDirectFileHref(internal)) {
    return (
      <a href={href} className={className}>
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
