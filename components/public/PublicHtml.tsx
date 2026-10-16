'use client';

import Link from 'next/link';
import parse, {
  attributesToProps,
  domToReact,
  type DOMNode,
  type Element,
  type HTMLReactParserOptions,
} from 'html-react-parser';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { DOCUMENT_ANCHOR_CLASS, isDirectFileHref } from '@/lib/document-href';
import { internalPathFromHref } from '@/lib/internal-link';
import { isBlockedExternalHost, scrubLegacyMediaFromHtml } from '@/lib/legacy-media-url';
import { isPrefixedPublicPath, normalizePrefixedPublicPath } from '@/lib/public-path-utils';

function mergeClassName(...parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(' ').trim();
}

function isElement(node: DOMNode): node is Element {
  return Boolean(node && (node as Element).type === 'tag' && (node as Element).name);
}

function documentAnchorProps(attribs: Record<string, string> | undefined) {
  const href = String(attribs?.href || '').trim();
  const existing = mergeClassName(attribs?.class, attribs?.className, DOCUMENT_ANCHOR_CLASS);
  return {
    href,
    target: '_blank' as const,
    rel: 'noopener noreferrer',
    className: existing || DOCUMENT_ANCHOR_CLASS,
    title: attribs?.title || 'Open document',
  };
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
  const router = useRouter();

  const navigateInternal = useCallback(
    async (internalPath: string) => {
      try {
        const target = await resolvePathForNavigation(internalPath);
        router.push(target);
      } catch {
        /* keep the current page if navigation fails */
      }
    },
    [router]
  );

  const onClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      try {
        if (event.defaultPrevented) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const anchor = (event.target as HTMLElement | null)?.closest?.('a');
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
          if (isDirectFileHref(`${parsed.pathname}${parsed.search}${parsed.hash}`)) return;
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
      } catch {
        /* leave native click */
      }
    },
    [navigateInternal, router]
  );

  const parsed = useMemo(() => {
    const safeHtml = scrubLegacyMediaFromHtml(html || '');
    if (!safeHtml.trim()) return null;

    const options: HTMLReactParserOptions = {
      replace(domNode) {
        try {
          if (!isElement(domNode) || domNode.name !== 'a') return;
          const href = String(domNode.attribs?.href || '').trim();
          if (!href || !isDirectFileHref(href)) return;

          const reactProps = attributesToProps(domNode.attribs || {});
          const props = documentAnchorProps(domNode.attribs);
          return (
            <a {...reactProps} {...props}>
              {domToReact((domNode.children || []) as DOMNode[], options)}
            </a>
          );
        } catch {
          return undefined;
        }
      },
    };

    try {
      return parse(safeHtml, options);
    } catch (error) {
      console.error('[PublicHtml] Parser fallback to raw HTML:', error);
      return <div className="public-html-surface" dangerouslySetInnerHTML={{ __html: safeHtml }} />;
    }
  }, [html]);

  if (!parsed) return null;

  return (
    <div className={className} style={style} onClick={onClick}>
      <div className="public-html-surface">{parsed}</div>
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
      <a
        href={href}
        className={mergeClassName(className, DOCUMENT_ANCHOR_CLASS)}
        target="_blank"
        rel="noopener noreferrer"
      >
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
