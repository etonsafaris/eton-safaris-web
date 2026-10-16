const FILE_HREF = /\.(pdf|docx?|xlsx?|pptx?|zip|csv|txt)(?:$|[?#])/i;

/** PDFs, Word files, and CMS uploads that must open in a new tab — never the App Router. */
export function isDirectFileHref(href: string | null | undefined): boolean {
  try {
    const value = String(href || '').trim();
    if (!value) return false;
    const pathOnly = value.split('#')[0]?.split('?')[0] || '';
    if (FILE_HREF.test(pathOnly) || FILE_HREF.test(value)) return true;
    if (/\/(?:api\/media|cms-media)\//i.test(value)) return true;
    if (/\/downloads\//i.test(value)) return true;
    return false;
  } catch {
    return false;
  }
}

export const DOCUMENT_ANCHOR_CLASS = 'text-blue-600 hover:underline font-medium';
