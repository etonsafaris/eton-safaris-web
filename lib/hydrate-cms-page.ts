import { DEFAULT_CMS_PAGES } from '@/lib/cms-defaults';
import { PUBLIC_SITE_LABELS } from '@/lib/collections';
import { mergeCommunityInitiativeBlocks } from '@/lib/community-initiatives';
import { parseCmsBlocks, parseCmsPageExtras, type CmsContentBlock, type PageFaq } from '@/lib/cms-page-model';
import { bestFaqsFor, limitFaqs } from '@/lib/best-faqs';
import { mergeFaqs } from '@/lib/default-faqs';
import { getRecordImage, getRecordTitle, pickStoredString, pickString, recordPublishedAt } from '@/lib/data';
import { extractEmbeddedContent, publicBodyHtml, recordBodyHtml } from '@/lib/embedded-content';
import { resolvePublicImage } from '@/lib/public-image';
import { STATIC_PAGES } from '@/lib/static-pages';
import type { RecordRow } from '@/lib/types';

function hasVisibleCopy(html: string) {
  return publicBodyHtml(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim().length > 0;
}

export function seededCmsPage(slug: string) {
  return DEFAULT_CMS_PAGES.find((item) => item.slug === slug);
}

/** Policy pages must always resolve visible HTML — CMS body first, then seeded/static fallback. */
export function resolvePolicyPageContent(page: RecordRow | null | undefined, slug: string): string {
  const cmsContent =
    (page ? pickStoredString(page, ['content', 'description', 'body']) : '') ||
    (page ? recordBodyHtml(page) : '');
  if (hasVisibleCopy(cmsContent)) return cmsContent;

  const blocks = parseCmsBlocks(page);
  if (blocks.length) {
    const blockHtml = blocks
      .map((block) => {
        const title = String(block.title || '').trim();
        const body = String(block.description || '').trim();
        if (!title && !body) return '';
        return `${title ? `<h4>${title}</h4>` : ''}${body}`;
      })
      .filter(Boolean)
      .join('');
    if (hasVisibleCopy(blockHtml)) return blockHtml;
  }

  const seeded = seededCmsPage(slug);
  if (seeded?.content && hasVisibleCopy(seeded.content)) return seeded.content;
  return STATIC_PAGES[slug]?.content || '';
}

function pageHeroImage(page: RecordRow | null | undefined, seeded: string) {
  const embedded = extractEmbeddedContent(pickString(page || {}, ['content', 'description', 'body']));
  const raw = pickString(
    page || {},
    ['image_url', 'cover_image', 'featured_image', 'social_image_url'],
    embedded.fields?.image_url || ''
  );
  return resolvePublicImage(raw) || resolvePublicImage(page ? getRecordImage(page) : '') || resolvePublicImage(seeded) || raw || seeded || '';
}

export function hydratePublicCmsPage(page: RecordRow | null | undefined, slug: string) {
  const seeded = seededCmsPage(slug);
  const extras = parseCmsPageExtras(page, slug);
  const isPolicy = extras.layout === 'policy' || /privacy|terms/i.test(slug);
  const cmsContent = page ? pickString(page, ['content', 'description', 'body']) : '';
  const seededBlocks = (seeded?.blocks || []).map((block) => ({
    title: block.title,
    description: block.description,
    image_url: String(block.image_url || '').trim(),
  }));
  const cmsBlocks = parseCmsBlocks(page);
  const usableCmsBlocks = cmsBlocks.filter(
    (block) => Boolean(String(block.title || '').trim()) && hasVisibleCopy(block.description)
  );
  const isCommunity = extras.layout === 'community' || /community/i.test(slug);
  const isStoryPage =
    extras.layout === 'about' ||
    extras.layout === 'agency' ||
    /about-us|travel-agency|agency/i.test(slug);
  const content = isPolicy
    ? resolvePolicyPageContent(page, slug)
    : hasVisibleCopy(cmsContent)
      ? cmsContent
      : isStoryPage || isCommunity || usableCmsBlocks.length
        ? ''
        : seeded?.content || '';

  let sourceBlocks: CmsContentBlock[];
  if (usableCmsBlocks.length) {
    sourceBlocks = usableCmsBlocks;
  } else if (isCommunity) {
    sourceBlocks = mergeCommunityInitiativeBlocks(seededBlocks);
  } else if (isStoryPage) {
    sourceBlocks = seededBlocks;
  } else {
    sourceBlocks = seededBlocks;
  }

  const blocks: CmsContentBlock[] = sourceBlocks.map((block) => ({
    title: block.title,
    description: block.description,
    image_url: String(block.image_url || '').trim(),
  }));
  const cmsFallback = /contact/i.test(slug) ? bestFaqsFor('contact') : bestFaqsFor('home');
  const faqs: PageFaq[] = limitFaqs(mergeFaqs(extras.faqs, seeded?.faqs || []), cmsFallback);

  return {
    title: extras.hero_title || (page ? getRecordTitle(page) : '') || seeded?.hero_title || seeded?.title || '',
    subtitle: extras.subtitle || seeded?.subtitle || '',
    content,
    image: pageHeroImage(page, seeded?.image_url || ''),
    blocks,
    faqs,
    videoUrl: extras.video_url || seeded?.video_url || '',
    destinations: extras.destinations.length ? extras.destinations : seeded?.destinations || [],
    ctaLabel: extras.cta_label || PUBLIC_SITE_LABELS.getInTouch,
    ctaHref: extras.cta_href || '/contact-us',
    layout: extras.layout,
    published: extras.published_at || (page ? recordPublishedAt(page) : ''),
  };
}
