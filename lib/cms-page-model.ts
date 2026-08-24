import { extractEmbeddedContent } from '@/lib/embedded-content';
import { parseContentBlocks, pickDateValue, pickString } from '@/lib/data';
import type { RecordRow } from '@/lib/types';

export const PAGE_LAYOUTS = [
  { value: 'about', label: 'About (boxed hero, dark story)' },
  { value: 'policy', label: 'Policy (Terms / Privacy)' },
  { value: 'community', label: 'Community support' },
  { value: 'agency', label: 'Travel agency' },
  { value: 'standard', label: 'Standard article' },
] as const;

export type CmsPageLayout = (typeof PAGE_LAYOUTS)[number]['value'];

export type PageFaq = {
  question: string;
  answer: string;
};

export type CmsContentBlock = {
  title: string;
  description: string;
  image_url?: string;
};

export type CmsPageExtras = {
  layout: CmsPageLayout;
  hero_title: string;
  subtitle: string;
  excerpt: string;
  video_url: string;
  destinations: string[];
  faqs: PageFaq[];
  status: 'published' | 'draft';
  cta_label: string;
  cta_href: string;
  offer_line: string;
  ready_heading: string;
  published_at: string;
  best_time_to_visit: string;
};

const LAYOUTS = new Set<string>(PAGE_LAYOUTS.map((item) => item.value));

export function inferPageLayout(slug: string): CmsPageLayout {
  const key = slug.toLowerCase().replace(/^\/+/, '');
  if (key.includes('privacy') || key.includes('terms')) return 'policy';
  if (key.includes('community')) return 'community';
  if (key.includes('agency') || key.includes('travel-agency')) return 'agency';
  if (key.includes('about')) return 'about';
  return 'standard';
}

export function serializeFaqs(faqs: PageFaq[]) {
  return JSON.stringify(faqRowsForStorage(faqs));
}

export function faqRowsForStorage(faqs: PageFaq[]) {
  return faqs
    .map((faq) => ({
      kind: 'faq' as const,
      question: String(faq.question || '').trim(),
      answer: String(faq.answer || '').trim(),
    }))
    .filter((faq) => faq.question && faq.answer);
}

export function parseFaqList(value: unknown): PageFaq[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const row = item as Record<string, unknown>;
        const isFaq = row.kind === 'faq' || 'question' in row || 'answer' in row;
        if (!isFaq) return null;
        const question = String(row.question || row.title || '').trim();
        const answer = String(row.answer || row.description || '').trim();
        if (!question || !answer) return null;
        return { question, answer };
      })
      .filter((item): item is PageFaq => Boolean(item));
  }
  if (typeof value === 'string' && value.trim()) {
    try {
      return parseFaqList(JSON.parse(value));
    } catch {
      return [];
    }
  }
  return [];
}

function firstFaqList(...values: unknown[]) {
  for (const value of values) {
    const parsed = parseFaqList(value);
    if (parsed.length) return parsed;
  }
  return [];
}

export function parseDestinationList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }
  if (typeof value === 'string' && value.trim()) {
    if (value.trim().startsWith('[')) {
      try {
        return parseDestinationList(JSON.parse(value));
      } catch {
        // fall through to comma split
      }
    }
    return value
      .split(/[,|\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function parseLayout(value: string, slug = ''): CmsPageLayout {
  const key = value.toLowerCase().trim();
  if (LAYOUTS.has(key)) return key as CmsPageLayout;
  return inferPageLayout(slug);
}

export function parseCmsPageExtras(record: RecordRow | null | undefined, slugFallback = ''): CmsPageExtras {
  const embedded = extractEmbeddedContent(
    pickString(record || {}, ['content', 'description', 'body', 'summary', 'excerpt'])
  );
  const fields = embedded.fields || {};
  const slug = pickString(record || {}, ['slug']) || slugFallback;
  const statusRaw = pickString(record || {}, ['status'], fields.status || 'published').toLowerCase();

  return {
    layout: parseLayout(pickString(record || {}, ['layout'], fields.layout), slug),
    hero_title: pickString(record || {}, ['hero_title', 'headline'], fields.hero_title || fields.headline),
    subtitle: pickString(record || {}, ['subtitle'], fields.subtitle),
    excerpt: pickString(record || {}, ['excerpt', 'summary'], fields.excerpt || fields.summary),
    video_url: pickString(record || {}, ['video_url'], fields.video_url),
    destinations: parseDestinationList(record?.destinations ?? fields.destinations),
    faqs: firstFaqList(record?.faqs, fields.faqs, record?.post_blocks),
    status: statusRaw === 'draft' ? 'draft' : 'published',
    cta_label: pickString(record || {}, ['cta_label'], fields.cta_label),
    cta_href: pickString(record || {}, ['cta_href'], fields.cta_href),
    offer_line: pickString(record || {}, ['offer_line', 'subtitle'], fields.offer_line),
    ready_heading: pickString(record || {}, ['ready_heading'], fields.ready_heading),
    published_at:
      pickDateValue(record || {}, ['published_at', 'updated_at', 'created_at']) || fields.published_at || '',
    best_time_to_visit: pickString(
      record || {},
      ['best_time_to_visit', 'best_time'],
      fields.best_time_to_visit || fields.best_time
    ),
  };
}

export function parseCmsBlocks(record: RecordRow | null | undefined): CmsContentBlock[] {
  const fromColumns = parseContentBlocks(record?.page_blocks || record?.blocks) as CmsContentBlock[];
  if (fromColumns.length > 0) {
    return fromColumns.map((block) => ({
      title: block.title,
      description: block.description,
      image_url: block.image_url || '',
    }));
  }
  const embedded = extractEmbeddedContent(pickString(record || {}, ['content', 'description', 'body']));
  return (embedded.blocks || []).map((block) => ({
    title: block.title,
    description: block.description,
    image_url: 'image_url' in block ? String((block as CmsContentBlock).image_url || '') : '',
  }));
}

export function cmsPageFieldPack(extras: Partial<CmsPageExtras>): Record<string, string> {
  return {
    layout: extras.layout || 'standard',
    hero_title: extras.hero_title || '',
    subtitle: extras.subtitle || '',
    excerpt: extras.excerpt || '',
    video_url: extras.video_url || '',
    destinations: (extras.destinations || []).join(', '),
    faqs: JSON.stringify(extras.faqs || []),
    status: extras.status || 'published',
    cta_label: extras.cta_label || '',
    cta_href: extras.cta_href || '',
    offer_line: extras.offer_line || '',
    ready_heading: extras.ready_heading || '',
    published_at: extras.published_at || '',
    best_time_to_visit: extras.best_time_to_visit || '',
  };
}

export function stripHtmlText(value: string, max = 160) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}
