import { SITE, SITE_LOGO } from '@/lib/collections';

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
    .replace(/"/g, '&quot;');
}

/** Compact one-page professional quotation HTML (print + email + guest view). */
export function buildQuoteDocumentHtml(input: QuoteDocumentInput) {
  const origin = (input.siteOrigin || SITE.url).replace(/\/$/, '');
  const logo = `${origin}${SITE_LOGO.split('?')[0]}`;
  const accept =
    input.quoteId ? `${origin}/quote/${encodeURIComponent(input.quoteId)}` : '';
  const valid =
    input.expirationDays?.trim()
      ? `Valid for ${escapeHtml(input.expirationDays.trim())} days from issue`
      : 'Valid for 14 days from issue';

  const row = (label: string, value: string) =>
    value.trim()
      ? `<tr><td class="lbl">${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Safari Quotation — ${escapeHtml(SITE.name)}</title>
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
    .notes { font-size: 14px; line-height: 1.55; color: #374151; margin: 0 0 16px; }
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
      <img src="${escapeHtml(logo)}" alt="${escapeHtml(SITE.name)}" />
      <div class="brand">
        <h1>${escapeHtml(SITE.name)}</h1>
        <p>${escapeHtml(SITE.tagline)}</p>
      </div>
    </header>
    <div class="body">
      <p class="eyebrow">Safari quotation</p>
      <h2 class="title">${escapeHtml(input.tour || 'Tailored safari')}</h2>
      <table>
        ${row('Guest', `${input.guest}${input.email ? ` · ${input.email}` : ''}`)}
        ${row('Phone', input.phone || '')}
        ${row('Country / destination', input.country || '')}
        ${row('Duration', input.duration || '')}
        ${row('Travellers', input.guests || '')}
        ${row('Travel date', input.travelDate || 'Flexible')}
        ${row('Validity', valid)}
      </table>
      ${
        input.tourFee.trim()
          ? `<div class="fee"><strong>Tour fee</strong><span>${escapeHtml(input.tourFee)}</span></div>`
          : ''
      }
      ${
        input.highlights?.trim()
          ? `<p class="notes"><strong>Package overview</strong><br/>${escapeHtml(input.highlights.trim())}</p>`
          : ''
      }
      ${
        input.notes?.trim()
          ? `<p class="notes"><strong>Notes</strong><br/>${escapeHtml(input.notes.trim())}</p>`
          : ''
      }
      <p class="terms"><strong>Terms (summary):</strong> ${escapeHtml(QUOTE_TERMS_SUMMARY)}</p>
      ${
        accept
          ? `<p class="cta"><a href="${escapeHtml(accept)}">View and accept this quotation online</a></p>`
          : ''
      }
    </div>
    <footer class="footer">
      <strong>${escapeHtml(SITE.name)}</strong><br/>
      ${escapeHtml(SITE.address)}<br/>
      ${escapeHtml(SITE.email)} · ${escapeHtml(SITE.phoneDisplay)} · ${escapeHtml(SITE.url)}
    </footer>
  </div>
</body>
</html>`;
}

/** Plain-text package overview from a tour row — never includes itinerary. */
export function packageOverviewFromTour(tour: Record<string, unknown> | null | undefined) {
  if (!tour) return '';
  const parts: string[] = [];
  const summary = String(tour.summary || tour.excerpt || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const description = String(tour.description || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const highlights = String(tour.highlights || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (summary) parts.push(summary.slice(0, 280));
  else if (description) parts.push(description.slice(0, 280));
  if (highlights) parts.push(highlights.slice(0, 220));
  return parts.join(' · ');
}
