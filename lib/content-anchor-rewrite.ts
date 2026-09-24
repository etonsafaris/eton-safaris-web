import { internalPathFromHref } from '@/lib/internal-link';
import { decodeHtmlEntities } from '@/lib/sanitize-html';

/** Rewrite same-site anchor hrefs to root-relative paths (sync). */
export function rewriteContentAnchorHrefs(html: string): string {
  if (!html || !/<a\s/i.test(html)) return html;
  return html.replace(/(<a\b[^>]*\bhref=["'])([^"']+)(["'])/gi, (_match, open: string, href: string, close: string) => {
    const decoded = decodeHtmlEntities(href);
    const internal = internalPathFromHref(decoded);
    if (!internal || internal === decoded) return `${open}${href}${close}`;
    return `${open}${internal}${close}`;
  });
}
