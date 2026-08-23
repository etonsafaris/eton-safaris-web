import { DEFAULT_CMS_PAGES } from '@/lib/cms-defaults';
import { parseCmsBlocks, parseCmsPageExtras, type CmsContentBlock, type PageFaq } from '@/lib/cms-page-model';
import { mergeFaqs } from '@/lib/default-faqs';
import { getRecordImage, getRecordTitle, pickString } from '@/lib/data';
import { publicBodyHtml } from '@/lib/embedded-content';
import { resolvePublicImage } from '@/lib/public-image';
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

export function hydratePublicCmsPage(page: RecordRow | null | undefined, slug: string) {
  const seeded = seededCmsPage(slug);
  const extras = parseCmsPageExtras(page, slug);
  const cmsContent = page ? pickString(page, ['content', 'description', 'body']) : '';
  const content = hasVisibleCopy(cmsContent) ? cmsContent : seeded?.content || '';
  const seededBlocks = (seeded?.blocks || []).map((block) => ({
    title: block.title,
    description: block.description,
    image_url: block.image_url || '',
  }));
  const cmsBlocks = parseCmsBlocks(page).filter((block) => String(block.title || '').trim());
  const usableCmsBlocks = cmsBlocks.filter(
    (block) => hasVisibleCopy(block.description) || resolvePublicImage(block.image_url)
  );
  const sourceBlocks = usableCmsBlocks.length ? usableCmsBlocks : seededBlocks;
  const blocks: CmsContentBlock[] = sourceBlocks.map((block) => {
    const match = seededBlocks.find((item) => item.title.toLowerCase() === block.title.toLowerCase());
    return {
      title: block.title,
      description: hasVisibleCopy(block.description) ? block.description : match?.description || block.description,
      image_url: resolvePublicImage(block.image_url) || match?.image_url || '',
    };
  });
  const faqs: PageFaq[] = mergeFaqs(extras.faqs, seeded?.faqs || []);

  return {
    title: extras.hero_title || (page ? getRecordTitle(page) : '') || seeded?.hero_title || seeded?.title || '',
    subtitle: extras.subtitle || seeded?.subtitle || '',
    content,
    image: resolvePublicImage(page ? getRecordImage(page) : '') || seeded?.image_url || '',
    blocks,
    faqs,
    videoUrl: extras.video_url || seeded?.video_url || '',
    destinations: extras.destinations.length ? extras.destinations : seeded?.destinations || [],
    ctaLabel: extras.cta_label || 'Talk to Us',
    ctaHref: extras.cta_href || '/contact-us',
    layout: extras.layout,
  };
}
