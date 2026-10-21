'use client';

import Link from 'next/link';
import parse, {
  attributesToProps,
  domToReact,
  type DOMNode,
  type Element,
  type HTMLReactParserOptions,
} from 'html-react-parser';
import { useMemo } from 'react';
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

function hrefFromAttribs(attribs: Record<string, string> | undefined) {
  return String(attribs?.href || '').trim();
}

function opensInNewTab(attribs: Record<string, string> | undefined) {
  const target = String(attribs?.target || '').trim().toLowerCase();
  return target === '_blank' || attribs?.download != null;
}

type PublicHtmlProps = {
  html: string;
  className?: string;
  style?: React.CSSProperties;
};

export default function PublicHtml({ html, className, style }: PublicHtmlProps) {
  const parsed = useMemo(() => {
    const safeHtml = scrubLegacyMediaFromHtml(html || '');
    if (!safeHtml.trim()) return null;

    const options: HTMLReactParserOptions = {
      replace(domNode) {
        try {
          if (!isElement(domNode) || domNode.name !== 'a') return;
          const href = hrefFromAttribs(domNode.attribs);
          if (!href) return;

          const children = domToReact((domNode.children || []) as DOMNode[], options);

          if (isDirectFileHref(href)) {
            const reactProps = attributesToProps(domNode.attribs || {});
            const props = documentAnchorProps(domNode.attribs);
            return (
              <a {...reactProps} {...props}>
                {children}
              </a>
            );
          }

          try {
            const parsedUrl = new URL(href, 'https://etonsafaris.com');
            if (isBlockedExternalHost(parsedUrl.hostname)) {
              return <span className={domNode.attribs?.class}>{children}</span>;
            }
            if (isDirectFileHref(`${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`)) {
              const reactProps = attributesToProps(domNode.attribs || {});
              const props = documentAnchorProps(domNode.attribs);
              return (
                <a {...reactProps} {...props}>
                  {children}
                </a>
              );
            }
          } catch {
            /* relative */
          }

          const internal = internalPathFromHref(href);
          if (!internal || isDirectFileHref(internal)) return;

          if (opensInNewTab(domNode.attribs)) {
            const reactProps = attributesToProps(domNode.attribs || {});
            return (
              <a
                {...reactProps}
                href={normalizePrefixedPublicPath(internal)}
                rel={domNode.attribs?.rel || 'noopener noreferrer'}
              >
                {children}
              </a>
            );
          }

          const dest = normalizePrefixedPublicPath(internal);
          const attribs = { ...(domNode.attribs || {}) };
          delete attribs.href;
          delete attribs.target;
          const reactProps = attributesToProps(attribs);
          delete (reactProps as { href?: string }).href;

          return (
            <Link href={dest} prefetch {...reactProps}>
              {children}
            </Link>
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
    <div className={className} style={style}>
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
    <Link href={isPrefixedPublicPath(internal) ? normalizePrefixedPublicPath(internal) : internal} prefetch className={className}>
      {children}
    </Link>
  );
}
