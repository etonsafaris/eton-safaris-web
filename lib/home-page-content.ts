import { SITE } from '@/lib/collections';
import { parseCmsPageExtras, type PageFaq } from '@/lib/cms-page-model';
import { extractEmbeddedContent } from '@/lib/embedded-content';
import { pickString } from '@/lib/data';
import { bestFaqsFor, limitFaqs } from '@/lib/best-faqs';
import type { RecordRow } from '@/lib/types';

export type HomePageContent = {
  footerAbout: string;
  contactAddress: string;
  contactEmail: string;
  contactPhone: string;
  faqs: PageFaq[];
  seoTitle: string;
  metaDescription: string;
};

export const DEFAULT_HOME_PAGE_CONTENT: HomePageContent = {
  footerAbout:
    'Eton Safaris is a premier tours and travel agency based in Uganda, offering gorilla trekking, wildlife safaris, and cultural experiences across Africa. Tailor-made luxury expeditions for every clientele.',
  contactAddress: SITE.address,
  contactEmail: SITE.email,
  contactPhone: SITE.phoneDisplay,
  faqs: bestFaqsFor('home'),
  seoTitle: '',
  metaDescription: '',
};

export const HOME_PAGE_SLUG = 'home-page';

export function whatsappDigitsFromPhone(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits || SITE.whatsapp;
}

export function parseHomePageContent(record: RecordRow | null | undefined): HomePageContent {
  const extras = parseCmsPageExtras(record, HOME_PAGE_SLUG);
  const embedded = extractEmbeddedContent(
    pickString(record || {}, ['content', 'description', 'body', 'summary', 'excerpt'])
  );
  const fields = embedded.fields || {};
  const cmsFooterAbout = pickString(record || {}, ['footer_about'], fields.footer_about);
  const cmsAddress = pickString(
    record || {},
    ['contact_address', 'footer_address'],
    fields.contact_address || fields.footer_address
  );
  const cmsEmail = pickString(record || {}, ['contact_email', 'footer_email'], fields.contact_email || fields.footer_email);
  const cmsPhone = pickString(
    record || {},
    ['contact_phone', 'footer_phone', 'phone_display'],
    fields.contact_phone || fields.footer_phone
  );

  return {
    footerAbout: cmsFooterAbout || DEFAULT_HOME_PAGE_CONTENT.footerAbout,
    contactAddress: cmsAddress || DEFAULT_HOME_PAGE_CONTENT.contactAddress,
    contactEmail: cmsEmail || DEFAULT_HOME_PAGE_CONTENT.contactEmail,
    contactPhone: cmsPhone || DEFAULT_HOME_PAGE_CONTENT.contactPhone,
    faqs: limitFaqs(extras.faqs, bestFaqsFor('home')),
    seoTitle: pickString(record || {}, ['seo_title', 'og_title']),
    metaDescription: pickString(record || {}, ['meta_description', 'og_description']),
  };
}

export function homePageFieldPack(
  content: Pick<HomePageContent, 'footerAbout' | 'contactAddress' | 'contactEmail' | 'contactPhone'>
): Record<string, string> {
  return {
    layout: 'home',
    footer_about: content.footerAbout,
    contact_address: content.contactAddress,
    contact_email: content.contactEmail,
    contact_phone: content.contactPhone,
    status: 'published',
  };
}
