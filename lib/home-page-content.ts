import { SITE, SOCIAL_LINKS } from '@/lib/collections';
import { parseCmsPageExtras, type PageFaq } from '@/lib/cms-page-model';
import { extractEmbeddedContent } from '@/lib/embedded-content';
import { pickString } from '@/lib/data';
import { bestFaqsFor, limitFaqs } from '@/lib/best-faqs';
import type { RecordRow } from '@/lib/types';

export type SocialLink = {
  id: string;
  network: string;
  url: string;
};

export type ContactPhone = {
  id: string;
  number: string;
  call: boolean;
  whatsapp: boolean;
};

export const SOCIAL_NETWORKS = [
  { id: 'facebook', label: 'Facebook' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'x', label: 'X' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'other', label: 'Other' },
] as const;

export type HomePageContent = {
  footerAbout: string;
  contactAddress: string;
  contactEmail: string;
  contactPhone: string;
  phones: ContactPhone[];
  socials: SocialLink[];
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
  phones: [{ id: 'primary', number: SITE.phoneDisplay, call: true, whatsapp: true }],
  socials: Object.entries(SOCIAL_LINKS).map(([network, url]) => ({ id: network, network, url })),
  faqs: bestFaqsFor('home'),
  seoTitle: '',
  metaDescription: '',
};

export const HOME_PAGE_SLUG = 'home-page';

export function whatsappDigitsFromPhone(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits || SITE.whatsapp;
}

export function newContactPhone(): ContactPhone {
  return { id: `phone-${Date.now()}`, number: '', call: true, whatsapp: false };
}

export function newSocialLink(): SocialLink {
  return { id: `social-${Date.now()}`, network: 'instagram', url: '' };
}

function parseFlag(value: unknown, fallback: boolean) {
  if (typeof value === 'boolean') return value;
  const token = String(value || '').trim().toLowerCase();
  if (token === 'true' || token === 'yes' || token === '1') return true;
  if (token === 'false' || token === 'no' || token === '0') return false;
  return fallback;
}

export function parseContactPhones(value: unknown, fallbackNumber = ''): ContactPhone[] {
  let source: unknown = value;
  if (typeof source === 'string' && source.trim()) {
    try {
      source = JSON.parse(source);
    } catch {
      source = null;
    }
  }
  if (Array.isArray(source)) {
    const phones = source
      .map((item, index) => {
        if (!item || typeof item !== 'object') return null;
        const row = item as Record<string, unknown>;
        const number = String(row.number || row.phone || '').trim();
        if (!number) return null;
        return {
          id: String(row.id || `phone-${index}`),
          number,
          call: parseFlag(row.call, true),
          whatsapp: parseFlag(row.whatsapp, false),
        };
      })
      .filter((item): item is ContactPhone => Boolean(item));
    if (phones.length) return phones;
  }
  const single = String(fallbackNumber || '').trim();
  if (!single) return DEFAULT_HOME_PAGE_CONTENT.phones.map((phone) => ({ ...phone }));
  return [{ id: 'primary', number: single, call: true, whatsapp: true }];
}

export function parseSocialLinks(value: unknown): SocialLink[] {
  let source: unknown = value;
  if (typeof source === 'string' && source.trim()) {
    try {
      source = JSON.parse(source);
    } catch {
      source = null;
    }
  }
  if (Array.isArray(source)) {
    const links = source
      .map((item, index) => {
        if (!item || typeof item !== 'object') return null;
        const row = item as Record<string, unknown>;
        const url = String(row.url || row.href || '').trim();
        const network = String(row.network || row.id || 'other').trim().toLowerCase() || 'other';
        if (!url) return null;
        return { id: String(row.id || `${network}-${index}`), network, url };
      })
      .filter((item): item is SocialLink => Boolean(item));
    if (links.length) return links;
  }
  return DEFAULT_HOME_PAGE_CONTENT.socials.map((link) => ({ ...link }));
}

export function publicPhones(content: Pick<HomePageContent, 'phones' | 'contactPhone'>): ContactPhone[] {
  const phones = (content.phones || []).filter((phone) => phone.number.trim());
  if (phones.length) return phones;
  return parseContactPhones(null, content.contactPhone);
}

export function publicSocials(content: Pick<HomePageContent, 'socials'>): SocialLink[] {
  const links = (content.socials || []).filter((link) => link.url.trim());
  return links.length ? links : DEFAULT_HOME_PAGE_CONTENT.socials.map((link) => ({ ...link }));
}

export function phoneCallHref(number: string) {
  const digits = String(number || '').replace(/[^\d+]/g, '');
  return digits ? `tel:${digits}` : '';
}

export function phoneWhatsAppHref(number: string) {
  const digits = whatsappDigitsFromPhone(number);
  return digits ? `https://wa.me/${digits}` : '';
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
  const phones = parseContactPhones(fields.contact_phones || record?.contact_phones, cmsPhone);
  const socials = parseSocialLinks(fields.social_links || record?.social_links);

  return {
    footerAbout: cmsFooterAbout || DEFAULT_HOME_PAGE_CONTENT.footerAbout,
    contactAddress: cmsAddress || DEFAULT_HOME_PAGE_CONTENT.contactAddress,
    contactEmail: cmsEmail || DEFAULT_HOME_PAGE_CONTENT.contactEmail,
    contactPhone: phones[0]?.number || cmsPhone || DEFAULT_HOME_PAGE_CONTENT.contactPhone,
    phones,
    socials,
    faqs: limitFaqs(extras.faqs, bestFaqsFor('home')),
    seoTitle: pickString(record || {}, ['seo_title', 'og_title']),
    metaDescription: pickString(record || {}, ['meta_description', 'og_description']),
  };
}

export function homePageFieldPack(
  content: Pick<HomePageContent, 'footerAbout' | 'contactAddress' | 'contactEmail' | 'contactPhone' | 'phones' | 'socials'>
): Record<string, string> {
  const phones = (content.phones || []).filter((phone) => phone.number.trim());
  return {
    layout: 'home',
    footer_about: content.footerAbout,
    contact_address: content.contactAddress,
    contact_email: content.contactEmail,
    contact_phone: phones[0]?.number || content.contactPhone,
    contact_phones: JSON.stringify(phones),
    social_links: JSON.stringify((content.socials || []).filter((link) => link.url.trim())),
    status: 'published',
  };
}
