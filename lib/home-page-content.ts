import { SITE, SOCIAL_LINKS } from '@/lib/collections';
import { parseCmsPageExtras, type PageFaq } from '@/lib/cms-page-model';
import { embedContent, extractEmbeddedContent } from '@/lib/embedded-content';
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

export type ContactEmail = {
  id: string;
  address: string;
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

export type ReviewPlatformId =
  | 'tripadvisor'
  | 'google'
  | 'safaribookings'
  | 'trustpilot'
  | 'travelstride'
  | 'safaripicked'
  | 'tourradar'
  | 'getyourguide'
  | 'viator'
  | 'facebook'
  | 'booking'
  | 'trip';

export type ReviewPlatformLink = {
  id: ReviewPlatformId;
  url: string;
};

export const REVIEW_PLATFORM_FIELDS: { id: ReviewPlatformId; label: string; placeholder: string }[] = [
  { id: 'tripadvisor', label: 'Tripadvisor', placeholder: 'https://www.tripadvisor.com/Attraction_Review-...' },
  { id: 'google', label: 'Google', placeholder: 'https://www.google.com/maps/place/...' },
  { id: 'safaribookings', label: 'SafariBookings', placeholder: 'https://www.safaribookings.com/p...' },
  { id: 'trustpilot', label: 'Trustpilot', placeholder: 'https://www.trustpilot.com/review/...' },
  { id: 'travelstride', label: 'Travelstride', placeholder: 'https://www.travelstride.com/operators/...' },
  { id: 'safaripicked', label: 'SafariPicked', placeholder: 'https://www.safaripicked.com/...' },
  { id: 'tourradar', label: 'TourRadar', placeholder: 'https://www.tourradar.com/o/...' },
  { id: 'getyourguide', label: 'GetYourGuide', placeholder: 'https://www.getyourguide.com/...' },
  { id: 'viator', label: 'Viator', placeholder: 'https://www.viator.com/...' },
  { id: 'facebook', label: 'Facebook', placeholder: 'https://www.facebook.com/.../reviews' },
  { id: 'booking', label: 'Booking.com', placeholder: 'https://www.booking.com/hotel/...' },
  { id: 'trip', label: 'Trip.com', placeholder: 'https://www.trip.com/...' },
];

export type HomePageContent = {
  footerAbout: string;
  contactAddress: string;
  contactEmail: string;
  emails: ContactEmail[];
  contactPhone: string;
  phones: ContactPhone[];
  socials: SocialLink[];
  reviewPlatforms: ReviewPlatformLink[];
  faqs: PageFaq[];
  seoTitle: string;
  metaDescription: string;
};

export const DEFAULT_HOME_PAGE_CONTENT: HomePageContent = {
  footerAbout:
    'Eton Safaris is a premier tours and travel agency based in Uganda, offering gorilla trekking, wildlife safaris, and cultural experiences across Africa. Tailor-made luxury expeditions for every clientele.',
  contactAddress: SITE.address,
  contactEmail: SITE.email,
  emails: [{ id: 'primary', address: SITE.email }],
  contactPhone: SITE.phoneDisplay,
  phones: [{ id: 'primary', number: SITE.phoneDisplay, call: true, whatsapp: true }],
  socials: Object.entries(SOCIAL_LINKS).map(([network, url]) => ({ id: network, network, url })),
  reviewPlatforms: [],
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

export function newContactEmail(): ContactEmail {
  return { id: `email-${Date.now()}`, address: '' };
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

export function parseContactEmails(value: unknown, fallbackAddress = ''): ContactEmail[] {
  let source: unknown = value;
  if (typeof source === 'string' && source.trim()) {
    try {
      source = JSON.parse(source);
    } catch {
      source = null;
    }
  }
  if (Array.isArray(source)) {
    const emails = source
      .map((item, index) => {
        if (!item || typeof item !== 'object') return null;
        const row = item as Record<string, unknown>;
        const address = String(row.address || row.email || '').trim();
        if (!address) return null;
        return { id: String(row.id || `email-${index}`), address };
      })
      .filter((item): item is ContactEmail => Boolean(item));
    if (emails.length) return emails;
  }
  const single = String(fallbackAddress || '').trim();
  if (!single) return DEFAULT_HOME_PAGE_CONTENT.emails.map((email) => ({ ...email }));
  return [{ id: 'primary', address: single }];
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

export function publicEmails(content: Pick<HomePageContent, 'emails' | 'contactEmail'>): ContactEmail[] {
  const emails = (content.emails || []).filter((email) => email.address.trim());
  if (emails.length) return emails;
  return parseContactEmails(null, content.contactEmail);
}

export function parseReviewPlatforms(value: unknown): ReviewPlatformLink[] {
  let source: unknown = value;
  if (typeof source === 'string' && source.trim()) {
    try {
      source = JSON.parse(source);
    } catch {
      source = null;
    }
  }
  const allowed = new Set(REVIEW_PLATFORM_FIELDS.map((item) => item.id));
  const rows = Array.isArray(source) ? source : [];
  return rows
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const id = String(row.id || '').trim().toLowerCase() as ReviewPlatformId;
      const url = String(row.url || row.href || '').trim();
      if (!allowed.has(id) || !/^https?:\/\//i.test(url)) return null;
      return { id, url };
    })
    .filter((item): item is ReviewPlatformLink => Boolean(item));
}

export function linkedReviewPlatforms(content: Pick<HomePageContent, 'reviewPlatforms'>): ReviewPlatformLink[] {
  return (content.reviewPlatforms || []).filter((item) => /^https?:\/\//i.test(item.url));
}

/** Keep the rest of the Home page and replace only the review-platform links. */
export function homeContentWithReviewPlatforms(record: RecordRow, links: ReviewPlatformLink[]): string {
  const html = pickString(record, ['content', 'description', 'body', 'summary', 'excerpt']);
  const embedded = extractEmbeddedContent(html);
  const packed = homePageFieldPack({ ...parseHomePageContent(record), reviewPlatforms: links });
  return embedContent(html, {
    blocks: embedded.blocks,
    itineraries: embedded.itineraries,
    fields: { ...(embedded.fields || {}), ...packed },
  });
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
  const savedFooter = savedHomeFooter(record);
  const cmsFooterAbout = savedFooter.footerAbout;
  const cmsAddress = savedFooter.contactAddress;
  const cmsEmail = pickString(record || {}, ['contact_email', 'footer_email'], fields.contact_email || fields.footer_email);
  const cmsPhone = pickString(
    record || {},
    ['contact_phone', 'footer_phone', 'phone_display'],
    fields.contact_phone || fields.footer_phone
  );
  const phones = parseContactPhones(fields.contact_phones || record?.contact_phones, cmsPhone);
  const emails = parseContactEmails(fields.contact_emails || record?.contact_emails, cmsEmail);
  const socials = parseSocialLinks(fields.social_links || record?.social_links);
  const reviewPlatforms = parseReviewPlatforms(fields.review_platforms || record?.review_platforms);

  return {
    footerAbout: cmsFooterAbout || DEFAULT_HOME_PAGE_CONTENT.footerAbout,
    contactAddress: cmsAddress,
    contactEmail: emails[0]?.address || cmsEmail || DEFAULT_HOME_PAGE_CONTENT.contactEmail,
    emails,
    contactPhone: phones[0]?.number || cmsPhone || DEFAULT_HOME_PAGE_CONTENT.contactPhone,
    phones,
    socials,
    reviewPlatforms,
    faqs: limitFaqs(extras.faqs, bestFaqsFor('home')),
    seoTitle: pickString(record || {}, ['seo_title', 'og_title']),
    metaDescription: pickString(record || {}, ['meta_description', 'og_description']),
  };
}

function embeddedHomeFields(record: RecordRow | null | undefined): Record<string, string> {
  const embedded = extractEmbeddedContent(
    pickString(record || {}, ['content', 'description', 'body', 'summary', 'excerpt'])
  );
  return embedded.fields || {};
}

function firstSavedText(...values: Array<string | undefined>): string {
  for (const value of values) {
    const text = String(value || '').trim();
    if (text) return text;
  }
  return '';
}

/** The editor writes the latest footer into the page body. Prefer that over an older column. */
export function savedHomeFooter(record: RecordRow | null | undefined): { footerAbout: string; contactAddress: string } {
  const fields = embeddedHomeFields(record);
  return {
    footerAbout: firstSavedText(fields.footer_about, pickString(record || {}, ['footer_about'])),
    contactAddress: firstSavedText(
      fields.contact_address,
      fields.footer_address,
      pickString(record || {}, ['contact_address', 'footer_address'])
    ),
  };
}

export function homeFieldPresent(record: RecordRow | null | undefined, key: string): boolean {
  if (!record) return false;
  if (Object.prototype.hasOwnProperty.call(record, key) && String(record[key] ?? '').trim()) return true;
  return Object.prototype.hasOwnProperty.call(embeddedHomeFields(record), key);
}

export function homePageFieldPack(
  content: Pick<
    HomePageContent,
    'footerAbout' | 'contactAddress' | 'contactEmail' | 'emails' | 'contactPhone' | 'phones' | 'socials' | 'reviewPlatforms'
  >
): Record<string, string> {
  const phones = (content.phones || []).filter((phone) => phone.number.trim());
  const emails = (content.emails || []).filter((email) => email.address.trim());
  return {
    layout: 'home',
    footer_about: content.footerAbout,
    contact_address: content.contactAddress,
    contact_email: emails[0]?.address || content.contactEmail,
    contact_emails: JSON.stringify(emails),
    contact_phone: phones[0]?.number || content.contactPhone,
    contact_phones: JSON.stringify(phones),
    social_links: JSON.stringify((content.socials || []).filter((link) => link.url.trim())),
    review_platforms: JSON.stringify(
      (content.reviewPlatforms || []).filter((item) => /^https?:\/\//i.test(item.url))
    ),
    status: 'published',
  };
}
