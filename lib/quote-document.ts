import { SITE, SITE_LOGO } from '@/lib/collections';
import { extractEmbeddedContent, stripEmbeddedContent } from '@/lib/embedded-content';

export const QUOTE_TERMS_SUMMARY =
  'Quote valid for the stated period. 30% deposit secures booking; balance due 45 days before travel. Gorilla/park permits are non-refundable once issued. Prices may adjust for currency or park fee changes. Full terms apply on booking confirmation.';

export type QuoteDocumentInput = {
  guest: string;
  email: string;
  phone?: string;
  tour: string;
  country?: string;
  duration?: string;
  guests: string;
  travelDate: string;
  tourFee: string;
  notes?: string;
  highlights?: string;
  expirationDays?: string;
  quoteId?: string;
  siteOrigin?: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br/>');
}

function plainText(value: unknown, max = 0) {
  const text = String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  if (max > 0 && text.length > max) return `${text.slice(0, max).trim()}…`;
  return text;
}

function section(label: string, body: string) {
  if (!body.trim()) return '';
  return `${label}\n${body.trim()}`;
}

/**
 * Full package details for a quotation — description, highlights, includes/excludes,
 * category, group size, journey notes. Never includes day-by-day itinerary.
 */
export function packageDetailsForQuote(tour: Record<string, unknown> | null | undefined) {
  if (!tour) return '';

  const rawDescription = String(tour.description || '');
  const embedded = extractEmbeddedContent(rawDescription);
  const description = plainText(stripEmbeddedContent(rawDescription));
  const highlights = plainText(tour.highlights || embedded.fields?.highlights || '');
  const includes = plainText(tour.price_includes || embedded.fields?.price_includes || '');
  const excludes = plainText(tour.price_excludes || embedded.fields?.price_excludes || '');
  const journey = plainText(tour.journey_details || embedded.fields?.journey_details || '');
  const summary = plainText(tour.summary || tour.excerpt || '');
  const category = plainText(tour.category || '');
  const groupSize = plainText(tour.group_size || '');
  const country = plainText(tour.country || tour.destination || '');
  const duration = plainText(tour.duration_days || tour.duration || '');
  const title = plainText(tour.title || tour.name || '');

  const blockText = (embedded.blocks || [])
    .map((block) => {
      const heading = plainText(block.title);
      const body = plainText(block.description);
      if (!heading && !body) return '';
      return heading && body ? `${heading}: ${body}` : heading || body;
    })
    .filter(Boolean)
    .join('\n');

  const parts = [
    title ? `Package: ${title}` : '',
    [
      country && `Country: ${country}`,
      duration && `Duration: ${duration} days`,
      category && `Category: ${category}`,
      groupSize && `Group size: ${groupSize}`,
    ]
      .filter(Boolean)
      .join(' · '),
    section('Overview', summary || description),
    summary && description && summary !== description ? section('Description', description) : '',
    section('Highlights', highlights),
    section('Includes', includes),
    section('Excludes', excludes),
    section('Journey notes', journey),
    section('Additional details', blockText),
  ].filter(Boolean);

  return parts.join('\n\n');
}

/** Short preview helper. */
export function packageOverviewFromTour(tour: Record<string, unknown> | null | undefined) {
  const full = packageDetailsForQuote(tour);
  if (!full) return '';
  return full.length > 600 ? `${full.slice(0, 600).trim()}…` : full;
}

/** Pull structured guest fields out of composed inquiry messages. */
export function parseInquiryGuestFields(message: string) {
  const text = String(message || '');
  const read = (label: string) => {
    const match = text.match(new RegExp(`${label}\\s*:\\s*(.+)`, 'i'));
    return match?.[1]?.trim() || '';
  };
  const destination = read('Safari destination') || read('Destination');
  const residence = read('Country of residence');
  const duration = read('Duration of stay') || read('Duration');
  const travellers = read('Travellers') || read('Guests');
  const travelDate = read('Travel date');
  const tour = read('Tour');

  const split = text.split(
    /\n(?=Safari destination:|Country of residence:|Duration of stay:|Travellers:|Travel date:|Tour:)/i
  );
  const guestNotes = (split[0] || text).trim();

  return {
    destination,
    residence,
    duration,
    travellers: travellers.replace(/[^\d].*$/, '').trim() || travellers,
    travelDate: travelDate.slice(0, 10),
    tour,
    guestNotes,
  };
}

/** Compact one-page professional quotation HTML (print + email + guest view). */
export function buildQuoteDocumentHtml(input: QuoteDocumentInput) {
  const origin = (input.siteOrigin || SITE.url).replace(/\/$/, '');
  const logo = `${origin}${SITE_LOGO.split('?')[0]}`;
  const accept = input.quoteId ? `${origin}/quote/${encodeURIComponent(input.quoteId)}` : '';
  const valid = input.expirationDays?.trim()
    ? `Valid for ${escapeHtml(input.expirationDays.trim())} days from issue`
    : 'Valid for 14 days from issue';

  const row = (label: string, value: string) =>
    value.trim()
      ? `<tr><td class="lbl">${escapeHtml(label).replace(/<br\/>/g, '')}</td><td>${escapeHtml(value)}</td></tr>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Safari Quotation — ${escapeHtml(SITE.name).replace(/<br\/>/g, '')}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Georgia, "Times New Roman", serif; color: #1f2937; background: #f3f4f6; }
    .sheet { max-width: 720px; margin: 24px auto; background: #fff; border: 1px solid #e5e7eb; }
    .header { display: flex; align-items: center; gap: 16px; padding: 22px 28px; border-bottom: 3px solid #20A048; }
    .header img { height: 56px; width: auto; }
    .brand h1 { margin: 0; font-size: 22px; color: #14532d; letter-spacing: 0.02em; }
    .brand p { margin: 4px 0 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.12em; }
    .body { padding: 24px 28px 8px; }
    .eyebrow { margin: 0 0 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: #20A048; }
    .title { margin: 0 0 18px; font-size: 26px; color: #111827; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    td { padding: 9px 0; border-bottom: 1px solid #eef2f0; font-size: 14px; vertical-align: top; }
    td.lbl { width: 38%; color: #6b7280; }
    .fee { margin: 8px 0 18px; padding: 14px 16px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; }
    .fee strong { display: block; font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; color: #166534; }
    .fee span { font-size: 22px; font-weight: 700; color: #14532d; }
    .notes { font-size: 13px; line-height: 1.55; color: #374151; margin: 0 0 16px; white-space: pre-wrap; }
    .terms { font-size: 12px; line-height: 1.5; color: #6b7280; background: #f9fafb; padding: 12px 14px; border-radius: 8px; margin: 0 0 16px; }
    .terms strong { color: #374151; }
    .cta { margin: 0 0 8px; }
    .cta a { color: #20A048; font-weight: 700; }
    .footer { padding: 16px 28px 22px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; line-height: 1.55; }
    .footer strong { color: #14532d; }
    @media print {
      body { background: #fff; }
      .sheet { margin: 0; border: 0; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <header class="header">
      <img src="${escapeHtml(logo).replace(/<br\/>/g, '')}" alt="${escapeHtml(SITE.name).replace(/<br\/>/g, '')}" />
      <div class="brand">
        <h1>${escapeHtml(SITE.name).replace(/<br\/>/g, '')}</h1>
        <p>${escapeHtml(SITE.tagline).replace(/<br\/>/g, '')}</p>
      </div>
    </header>
    <div class="body">
      <p class="eyebrow">Safari quotation</p>
      <h2 class="title">${escapeHtml(input.tour || 'Tailored safari').replace(/<br\/>/g, '')}</h2>
      <table>
        ${row('Guest', `${input.guest}${input.email ? ` · ${input.email}` : ''}`)}
        ${row('Phone', input.phone || '')}
        ${row('Country / destination', input.country || '')}
        ${row('Duration', input.duration || '')}
        ${row('Travellers', input.guests || '')}
        ${row('Travel date', input.travelDate || 'Flexible')}
        ${row('Validity', valid.replace(/<br\/>/g, ''))}
      </table>
      ${
        input.tourFee.trim()
          ? `<div class="fee"><strong>Tour fee</strong><span>${escapeHtml(input.tourFee).replace(/<br\/>/g, '')}</span></div>`
          : ''
      }
      ${
        input.highlights?.trim()
          ? `<div class="notes"><strong>Package details</strong><br/>${escapeHtml(input.highlights.trim())}</div>`
          : ''
      }
      ${
        input.notes?.trim()
          ? `<div class="notes"><strong>Guest notes</strong><br/>${escapeHtml(input.notes.trim())}</div>`
          : ''
      }
      <p class="terms"><strong>Terms (summary):</strong> ${escapeHtml(QUOTE_TERMS_SUMMARY).replace(/<br\/>/g, ' ')}</p>
      ${
        accept
          ? `<p class="cta"><a href="${escapeHtml(accept).replace(/<br\/>/g, '')}">View and accept this quotation online</a></p>`
          : ''
      }
    </div>
    <footer class="footer">
      <strong>${escapeHtml(SITE.name).replace(/<br\/>/g, '')}</strong><br/>
      ${escapeHtml(SITE.address).replace(/<br\/>/g, '')}<br/>
      ${escapeHtml(SITE.email).replace(/<br\/>/g, '')} · ${escapeHtml(SITE.phoneDisplay).replace(/<br\/>/g, '')} · ${escapeHtml(SITE.url).replace(/<br\/>/g, '')}
    </footer>
  </div>
</body>
</html>`;
}
