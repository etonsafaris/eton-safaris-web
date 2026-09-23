import { publicCanonicalUrl } from '@/lib/seo-canonical';

export const SEO_SCHEMA_TYPES = [
  { value: 'TouristTrip', label: 'Safari / Tour package' },
  { value: 'TouristDestination', label: 'Country / Destination' },
  { value: 'TouristAttraction', label: 'Park / Place to visit' },
  { value: 'LodgingBusiness', label: 'Accommodation' },
  { value: 'Article', label: 'Article / Safari update' },
  { value: 'BlogPosting', label: 'Blog post' },
  { value: 'WebPage', label: 'Standard web page' },
  { value: 'AboutPage', label: 'About page' },
  { value: 'FAQPage', label: 'FAQ page' },
  { value: 'Product', label: 'Product / Priced package' },
] as const;

export type SeoSchemaType = (typeof SEO_SCHEMA_TYPES)[number]['value'];

export type SeoContentType = 'tour' | 'country' | 'category' | 'park' | 'stay' | 'place' | 'article' | 'page';

export const CONTENT_SCHEMA_DEFAULTS: Record<SeoContentType, SeoSchemaType> = {
  tour: 'TouristTrip',
  country: 'TouristDestination',
  category: 'TouristTrip',
  park: 'TouristAttraction',
  stay: 'LodgingBusiness',
  place: 'TouristAttraction',
  article: 'Article',
  page: 'WebPage',
};

export type SeoValues = {
  focus_keyphrase: string;
  seo_title: string;
  slug: string;
  meta_description: string;
  social_image_url: string;
  focus_keywords: string[];
  seo_schema: string;
  schema_type: SeoSchemaType;
  canonical_url: string;
  robots_index: boolean;
  robots_follow: boolean;
  robots_advanced: string[];
  breadcrumb_title: string;
  og_title: string;
  og_description: string;
};

export type SeoAnalysisItem = {
  type: 'error' | 'info' | 'ok';
  message: string;
};

export const ROBOTS_ADVANCED_OPTIONS = [
  { value: 'noarchive', label: 'noarchive — hide cached copy' },
  { value: 'nosnippet', label: 'nosnippet — hide text snippet' },
  { value: 'noimageindex', label: 'noimageindex — do not index images' },
] as const;

export const SEO_FIELD_KEYS = [
  'focus_keyphrase',
  'focus_keyword',
  'seo_title',
  'meta_description',
  'social_image_url',
  'focus_keywords',
  'seo_schema',
  'schema_type',
  'seo_slug',
  'canonical_url',
  'robots_index',
  'robots_follow',
  'robots_advanced',
  'breadcrumb_title',
  'og_title',
  'og_description',
  'seo_settings',
] as const;

/** Public pathname for a CMS item (no origin). */
export function publicPathForSeoContent(
  contentType: SeoContentType,
  slug: string,
  options?: { categoryLabel?: string }
): string {
  const segment = slug.trim().replace(/^\/+/, '');
  switch (contentType) {
    case 'page':
      return segment ? `/${segment}` : '/';
    case 'category': {
      const label = (options?.categoryLabel || segment).trim();
      return label ? `/tours?category=${encodeURIComponent(label)}` : '/tours';
    }
    case 'tour':
      return segment ? `/tours/${segment}` : '/tours';
    case 'country':
      return segment ? `/destinations/${segment}` : '/destinations';
    case 'park':
      return segment ? `/parks/${segment}` : '/parks';
    case 'stay':
      return segment ? `/accommodations/${segment}` : '/accommodations';
    case 'place':
      return segment ? `/explore/${segment}` : '/explore';
    case 'article':
      return segment ? `/safari-updates/${segment}` : '/safari-updates';
    default:
      return segment ? `/${segment}` : '/';
  }
}

export function canonicalUrlForSeoContent(
  contentType: SeoContentType,
  slug: string,
  options?: { categoryLabel?: string }
): string {
  return publicCanonicalUrl(publicPathForSeoContent(contentType, slug, options));
}

export type SeoAdvancedAutoSnapshot = {
  breadcrumb_title: string;
  og_title: string;
  og_description: string;
  canonical_url: string;
};

export function derivedSeoAdvancedFields(
  values: SeoValues,
  options: { pageTitle?: string; contentType: SeoContentType; categoryLabel?: string }
): SeoAdvancedAutoSnapshot {
  const title = values.seo_title.trim() || String(options.pageTitle || '').trim();
  const slug = values.slug.trim();
  const meta = values.meta_description.trim();
  const categoryLabel = options.categoryLabel || title;
  const canBuildUrl = Boolean(slug) || (options.contentType === 'category' && categoryLabel);
  const canonical = canBuildUrl
    ? canonicalUrlForSeoContent(options.contentType, slug, { categoryLabel })
    : '';

  return {
    breadcrumb_title: title,
    og_title: title,
    og_description: meta,
    canonical_url: canonical,
  };
}

export function mergeAutoSeoAdvancedFields(
  values: SeoValues,
  derived: SeoAdvancedAutoSnapshot,
  lastAuto: SeoAdvancedAutoSnapshot
): { values: SeoValues; lastAuto: SeoAdvancedAutoSnapshot; changed: boolean } {
  const next = { ...values };
  let changed = false;

  const keys: (keyof SeoAdvancedAutoSnapshot)[] = [
    'breadcrumb_title',
    'og_title',
    'og_description',
    'canonical_url',
  ];

  for (const key of keys) {
    const newVal = derived[key];
    const cur = values[key].trim();
    const last = lastAuto[key].trim();
    if (!newVal && key !== 'og_description') continue;
    if (!cur || cur === last) {
      if (next[key] !== newVal) {
        next[key] = newVal;
        changed = true;
      }
    }
  }

  const snapshot: SeoAdvancedAutoSnapshot = changed
    ? {
        breadcrumb_title: derived.breadcrumb_title,
        og_title: derived.og_title,
        og_description: derived.og_description,
        canonical_url: derived.canonical_url,
      }
    : lastAuto;

  return { values: changed ? next : values, lastAuto: snapshot, changed };
}

export function defaultSeoValues(contentType: SeoContentType = 'page'): SeoValues {
  return {
    focus_keyphrase: '',
    seo_title: '',
    slug: '',
    meta_description: '',
    social_image_url: '',
    focus_keywords: [],
    seo_schema: '',
    schema_type: CONTENT_SCHEMA_DEFAULTS[contentType],
    canonical_url: '',
    robots_index: true,
    robots_follow: true,
    robots_advanced: [],
    breadcrumb_title: '',
    og_title: '',
    og_description: '',
  };
}

export function parseFocusKeywords(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {
    // fall through
  }
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseBool(value: unknown, fallback: boolean) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (['false', '0', 'no', 'noindex', 'nofollow'].includes(normalized)) return false;
  if (['true', '1', 'yes', 'index', 'follow'].includes(normalized)) return true;
  return fallback;
}

function parseList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).map((item) => item.trim()).filter(Boolean);
  } catch {
    // fall through
  }
  return value
    .split(/[,|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parsePackedSettings(value: unknown): Partial<SeoValues> {
  if (!value) return {};
  let parsed: Record<string, unknown> = {};
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value) as Record<string, unknown>;
    } catch {
      return {};
    }
  } else if (typeof value === 'object') {
    parsed = value as Record<string, unknown>;
  }
  return {
    canonical_url: parsed.canonical_url ? String(parsed.canonical_url) : undefined,
    robots_index: parsed.robots_index === undefined ? undefined : parseBool(parsed.robots_index, true),
    robots_follow: parsed.robots_follow === undefined ? undefined : parseBool(parsed.robots_follow, true),
    robots_advanced: parsed.robots_advanced ? parseList(parsed.robots_advanced) : undefined,
    breadcrumb_title: parsed.breadcrumb_title ? String(parsed.breadcrumb_title) : undefined,
    og_title: parsed.og_title ? String(parsed.og_title) : undefined,
    og_description: parsed.og_description ? String(parsed.og_description) : undefined,
    schema_type: parsed.schema_type ? (String(parsed.schema_type) as SeoSchemaType) : undefined,
    seo_schema: parsed.seo_schema ? String(parsed.seo_schema) : undefined,
  };
}

export function packSeoSettings(values: SeoValues): string {
  return JSON.stringify({
    canonical_url: values.canonical_url,
    robots_index: values.robots_index,
    robots_follow: values.robots_follow,
    robots_advanced: values.robots_advanced,
    breadcrumb_title: values.breadcrumb_title,
    og_title: values.og_title,
    og_description: values.og_description,
    schema_type: values.schema_type,
    seo_schema: values.seo_schema,
  });
}

export function seoValuesFromRecord(record: Record<string, unknown> = {}): SeoValues {
  const packed = parsePackedSettings(record.seo_settings);
  let schemaPacked: Partial<SeoValues> = {};
  let seoSchemaText = String(record.seo_schema || '');
  try {
    const schemaObj = seoSchemaText ? (JSON.parse(seoSchemaText) as Record<string, unknown>) : null;
    if (schemaObj && schemaObj._etonSeo) {
      schemaPacked = parsePackedSettings(schemaObj._etonSeo);
      const clone = { ...schemaObj };
      delete clone._etonSeo;
      seoSchemaText = JSON.stringify(clone);
    }
  } catch {
    /* keep raw schema */
  }
  const merged = { ...schemaPacked, ...packed };
  const schemaType = String(merged.schema_type || record.schema_type || 'WebPage') as SeoSchemaType;
  return {
    focus_keyphrase: String(record.focus_keyphrase || record.focus_keyword || ''),
    seo_title: String(record.seo_title || ''),
    slug: String(record.seo_slug || record.slug || ''),
    meta_description: String(record.meta_description || ''),
    social_image_url: String(
      record.social_image_url || record.image_url || record.cover_image || record.featured_image || ''
    ),
    focus_keywords: parseFocusKeywords(record.focus_keywords),
    seo_schema: String(merged.seo_schema || seoSchemaText || ''),
    schema_type: SEO_SCHEMA_TYPES.some((item) => item.value === schemaType) ? schemaType : 'WebPage',
    canonical_url: String(merged.canonical_url || record.canonical_url || ''),
    robots_index: parseBool(
      record.robots_index !== undefined && record.robots_index !== null && record.robots_index !== ''
        ? record.robots_index
        : merged.robots_index ?? record.robots,
      true
    ),
    robots_follow: parseBool(
      merged.robots_follow !== undefined ? merged.robots_follow : record.robots_follow,
      true
    ),
    robots_advanced: merged.robots_advanced || parseList(record.robots_advanced),
    breadcrumb_title: String(merged.breadcrumb_title || record.breadcrumb_title || ''),
    og_title: String(merged.og_title || record.og_title || ''),
    og_description: String(merged.og_description || record.og_description || ''),
  };
}

/** Safe SEO subset for persistence — excludes columns absent from Supabase tables. */
export function seoValuesToPayload(values: SeoValues): Record<string, string> {
  return {
    focus_keyphrase: values.focus_keyphrase,
    seo_title: values.seo_title,
    slug: values.slug,
    meta_description: values.meta_description,
    social_image_url: values.social_image_url,
    focus_keywords: JSON.stringify(values.focus_keywords),
    seo_schema: values.seo_schema,
    schema_type: values.schema_type,
    canonical_url: values.canonical_url,
    breadcrumb_title: values.breadcrumb_title,
    og_title: values.og_title,
    og_description: values.og_description,
    seo_settings: packSeoSettings(values),
  };
}

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function countSyllables(word: string) {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!clean) return 0;
  const groups = clean.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '').match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups?.length || 1);
}

function sentencesOf(text: string) {
  return text
    .split(/[.!?]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function paragraphsOf(html: string) {
  const chunks = html
    .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .split(/\n{2,}/)
    .map((item) => stripHtml(item))
    .filter(Boolean);
  return chunks.length ? chunks : stripHtml(html) ? [stripHtml(html)] : [];
}

function headingCount(html: string) {
  return (html.match(/<h[2-4][^>]*>/gi) || []).length + (html.match(/^#{2,4}\s/gm) || []).length;
}

const TRANSITION_WORDS =
  /\b(however|therefore|furthermore|moreover|meanwhile|consequently|additionally|similarly|instead|otherwise|finally|first|second|then|next|also|because|although|while|besides|indeed|for example|in addition|as a result)\b/gi;

export function fleschReadingEase(html: string) {
  const text = stripHtml(html);
  const words = text ? text.split(/\s+/).filter(Boolean) : [];
  const sentences = sentencesOf(text);
  if (words.length < 5 || sentences.length === 0) return 0;
  const syllables = words.reduce((sum, word) => sum + countSyllables(word), 0);
  return Math.max(
    0,
    Math.min(100, Math.round(206.835 - 1.015 * (words.length / sentences.length) - 84.6 * (syllables / words.length)))
  );
}

export function analyzeSeo(values: SeoValues, content = ''): SeoAnalysisItem[] {
  const items: SeoAnalysisItem[] = [];
  const keyphrase = values.focus_keyphrase.trim();
  const title = values.seo_title.trim();
  const description = values.meta_description.trim();
  const body = stripHtml(content).toLowerCase();
  const key = keyphrase.toLowerCase();
  const slug = values.slug.trim().toLowerCase();

  if (!keyphrase) {
    items.push({ type: 'error', message: 'Add a focus keyphrase.' });
  } else {
    items.push({ type: 'ok', message: 'Focus keyphrase is set.' });
    if (title.toLowerCase().includes(key)) {
      items.push({ type: 'ok', message: 'The focus keyphrase appears in the SEO title.' });
    } else {
      items.push({ type: 'error', message: 'The focus keyphrase does not appear in the SEO title.' });
    }
    if (description.toLowerCase().includes(key)) {
      items.push({ type: 'ok', message: 'The focus keyphrase appears in the meta description.' });
    } else {
      items.push({ type: 'error', message: 'The focus keyphrase does not appear in the meta description.' });
    }
    if (slug && (slug.replace(/-/g, ' ').includes(key.replace(/\s+/g, ' ')) || slug.includes(key.replace(/\s+/g, '-')))) {
      items.push({ type: 'ok', message: 'The focus keyphrase is reflected in the slug.' });
    } else if (slug) {
      items.push({ type: 'info', message: 'The slug does not contain the focus keyphrase.' });
    }
    if (body.includes(key)) {
      items.push({ type: 'ok', message: 'The focus keyphrase appears in the page content.' });
    } else if (body) {
      items.push({ type: 'error', message: 'The focus keyphrase does not appear in the page content.' });
    }
  }

  if (!title) {
    items.push({ type: 'error', message: 'Please provide an SEO title.' });
  } else if (title.length < 30) {
    items.push({ type: 'info', message: 'SEO title is a bit short. Aim for 50–60 characters.' });
  } else if (title.length > 60) {
    items.push({ type: 'info', message: 'SEO title may be truncated in search results.' });
  } else {
    items.push({ type: 'ok', message: 'SEO title length looks good.' });
  }

  if (!description) {
    items.push({ type: 'error', message: 'Please provide a meta description.' });
  } else if (description.length < 70) {
    items.push({ type: 'info', message: 'Meta description is short. Aim for 120–155 characters.' });
  } else if (description.length > 160) {
    items.push({ type: 'info', message: 'Meta description may be truncated in search results.' });
  } else {
    items.push({ type: 'ok', message: 'Meta description length looks good.' });
  }

  if (!values.slug.trim()) {
    items.push({ type: 'error', message: 'Add a URL slug for better SEO-friendly links.' });
  } else {
    items.push({ type: 'ok', message: 'URL slug is set.' });
  }

  if (values.focus_keywords.length === 0) {
    items.push({ type: 'error', message: 'Add focus keyword tags to strengthen topical relevance.' });
  } else {
    items.push({ type: 'ok', message: `${values.focus_keywords.length} focus keyword tags are set.` });
  }

  if (values.social_image_url) {
    items.push({ type: 'ok', message: 'A social / Open Graph image is set.' });
  } else {
    items.push({ type: 'error', message: 'Add a social image so shares look complete on Facebook and X.' });
  }

  if (values.canonical_url) {
    items.push({ type: 'ok', message: 'A canonical URL is set.' });
  } else {
    items.push({ type: 'info', message: 'Set a canonical URL for cleaner indexing.' });
  }

  if (!values.robots_index) {
    items.push({ type: 'error', message: 'This page is set to noindex and will stay out of Google.' });
  } else {
    items.push({ type: 'ok', message: 'Robots indexing is enabled.' });
  }

  if (values.robots_follow) {
    items.push({ type: 'ok', message: 'Robots follow is enabled.' });
  } else {
    items.push({ type: 'info', message: 'Robots follow is disabled.' });
  }

  if (values.og_title && values.og_description) {
    items.push({ type: 'ok', message: 'Open Graph title and description are set.' });
  } else {
    items.push({ type: 'info', message: 'Fill Open Graph title and description in Advanced SEO.' });
  }

  if (values.schema_type || values.seo_schema) {
    items.push({ type: 'ok', message: 'Structured data / schema is configured.' });
  } else {
    items.push({ type: 'info', message: 'Add schema markup for richer search results.' });
  }

  return items;
}

/** Percentage SEO score (0–100). Errors weigh more than info warnings. */
export function seoScorePercent(values: SeoValues, content = ''): number {
  const items = analyzeSeo(values, content);
  if (!items.length) return 0;
  let score = 100;
  for (const item of items) {
    if (item.type === 'error') score -= 12;
    else if (item.type === 'info') score -= 4;
  }
  return Math.max(0, Math.min(100, score));
}

export function seoScore(values: SeoValues, content = ''): 'good' | 'needs-work' {
  return seoScorePercent(values, content) >= 90 ? 'good' : 'needs-work';
}

export function analyzeReadability(html: string): SeoAnalysisItem[] {
  const text = stripHtml(html);
  if (!text) {
    return [{ type: 'info', message: 'Add more copy so readability can be measured.' }];
  }

  const words = text.split(/\s+/).filter(Boolean);
  const sentences = sentencesOf(text);
  const paragraphs = paragraphsOf(html);
  const headings = headingCount(html);
  const flesch = fleschReadingEase(html);
  const items: SeoAnalysisItem[] = [];

  if (flesch >= 60) {
    items.push({ type: 'ok', message: `Flesch reading ease is ${flesch}. The copy is easy to read.` });
  } else if (flesch >= 40) {
    items.push({ type: 'info', message: `Flesch reading ease is ${flesch}. Shorten some sentences to make it easier.` });
  } else {
    items.push({ type: 'error', message: `Flesch reading ease is ${flesch}. Use shorter sentences and simpler words.` });
  }

  const longSentences = sentences.filter((sentence) => sentence.split(/\s+/).length > 20).length;
  const longRatio = sentences.length ? longSentences / sentences.length : 0;
  if (longRatio <= 0.25) {
    items.push({ type: 'ok', message: 'Sentence length is good. Most sentences stay under 20 words.' });
  } else {
    items.push({
      type: 'error',
      message: `${Math.round(longRatio * 100)}% of sentences are over 20 words. Aim for 25% or less.`,
    });
  }

  const longParagraphs = paragraphs.filter((paragraph) => paragraph.split(/\s+/).length > 150).length;
  if (longParagraphs === 0) {
    items.push({ type: 'ok', message: 'Paragraphs are a readable length.' });
  } else {
    items.push({ type: 'error', message: `${longParagraphs} paragraph(s) are longer than 150 words. Split them up.` });
  }

  if (words.length > 300 && headings < 1) {
    items.push({ type: 'error', message: 'This is a long text without subheadings. Add H2 or H3 headings.' });
  } else if (headings > 0) {
    items.push({ type: 'ok', message: 'Subheadings are used to break up the text.' });
  } else {
    items.push({ type: 'info', message: 'Add subheadings if this page grows longer.' });
  }

  const transitions = text.match(TRANSITION_WORDS)?.length || 0;
  const transitionRatio = sentences.length ? transitions / sentences.length : 0;
  if (transitionRatio >= 0.3) {
    items.push({ type: 'ok', message: 'Enough transition words are used.' });
  } else {
    items.push({
      type: 'info',
      message: 'Use more transition words (however, therefore, for example) to guide the reader.',
    });
  }

  const passive = text.match(/\b(is|are|was|were|be|been|being)\s+\w+ed\b/gi)?.length || 0;
  const passiveRatio = sentences.length ? passive / sentences.length : 0;
  if (passiveRatio <= 0.1) {
    items.push({ type: 'ok', message: 'Passive voice is used sparingly.' });
  } else {
    items.push({ type: 'info', message: 'Too much passive voice. Prefer active phrasing where you can.' });
  }

  if (words.length < 40) {
    items.push({ type: 'info', message: 'The copy is quite short. Add more useful detail for searchers.' });
  } else {
    items.push({ type: 'ok', message: `Content length is ${words.length} words.` });
  }

  return items;
}

export function readabilityNotes(content: string): string[] {
  return analyzeReadability(content).map((item) => item.message);
}

export function validateSeoSchema(raw: string): { ok: boolean; message: string; parsed?: unknown } {
  if (!raw.trim()) return { ok: true, message: 'No custom schema yet. Generate one or paste JSON-LD.' };
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, message: 'Schema must be a JSON object.' };
    }
    const data = parsed as Record<string, unknown>;
    if (!data['@context'] && !data['@type'] && !data['@graph']) {
      return { ok: false, message: 'JSON-LD should include @context and @type (or @graph).' };
    }
    return { ok: true, message: 'Schema JSON-LD is valid.', parsed };
  } catch {
    return { ok: false, message: 'Schema is not valid JSON.' };
  }
}

export function buildDefaultJsonLd(
  values: SeoValues,
  context: {
    title: string;
    description: string;
    url: string;
    image?: string;
    siteName: string;
    siteUrl: string;
    dateModified?: string;
    faqs?: { question: string; answer: string }[];
  }
): Record<string, unknown> {
  const name = values.seo_title || context.title;
  const description = values.meta_description || context.description;
  const image = values.social_image_url || context.image || '';
  const url = values.canonical_url || context.url;
  let pageUrl = url;
  try {
    if (url && /^https?:\/\//i.test(url)) pageUrl = new URL(url).toString();
  } catch {
    pageUrl = context.url;
  }
  const type = values.schema_type || 'WebPage';

  const node: Record<string, unknown> = {
    '@type': type,
    name,
    description,
    url: pageUrl,
  };
  if (image) node.image = image;
  if (context.dateModified) {
    node.dateModified = context.dateModified;
    node.datePublished = context.dateModified;
  }

  if (type === 'TouristTrip' || type === 'Product') {
    node.provider = { '@type': 'TravelAgency', name: context.siteName, url: context.siteUrl };
  }
  if (type === 'Article' || type === 'BlogPosting') {
    node.headline = name;
    node.author = { '@type': 'Organization', name: context.siteName };
    node.publisher = { '@type': 'Organization', name: context.siteName, url: context.siteUrl };
  }
  if (type === 'LodgingBusiness') {
    node.address = { '@type': 'PostalAddress', addressCountry: 'UG' };
  }
  if (type === 'TouristDestination') {
    node.touristType = 'Safari traveller';
  }

  const graph: unknown[] = [
    {
      '@type': 'Organization',
      name: context.siteName,
      url: context.siteUrl,
    },
    {
      '@type': 'WebSite',
      name: context.siteName,
      url: context.siteUrl,
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: context.siteUrl },
        { '@type': 'ListItem', position: 2, name: values.breadcrumb_title || name, item: pageUrl },
      ],
    },
    node,
  ];

  if (context.faqs && context.faqs.length > 0) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: context.faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: { '@type': 'Answer', text: faq.answer },
      })),
    });
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}
