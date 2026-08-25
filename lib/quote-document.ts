import { SITE, SITE_LOGO } from '@/lib/collections';
import { extractEmbeddedContent, stripEmbeddedContent } from '@/lib/embedded-content';

export const QUOTE_TERMS_SUMMARY =
  'Quote valid for the stated period. 30% deposit secures booking; balance due 45 days before travel. Gorilla/park permits are non-refundable once issued. Prices may adjust for currency or park fee changes. Full terms apply on booking confirmation.';

export const QUOTE_SERVICES_LINE =
  'Gorilla Trekking · Wildlife Safaris · Chimpanzee Tracking · Birding · Cultural Journeys · Mountain Expeditions';

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

function escapeAttr(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeHtml(value: string) {
  return escapeAttr(value).replace(/\n/g, '<br/>');
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

export function packageOverviewFromTour(tour: Record<string, unknown> | null | undefined) {
  const full = packageDetailsForQuote(tour);
  if (!full) return '';
  return full.length > 600 ? `${full.slice(0, 600).trim()}…` : full;
}

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

/** One-page quotation HTML with Eton letterhead (inspired by classic safari banners, distinct layout). */
export function buildQuoteDocumentHtml(input: QuoteDocumentInput) {
  const origin = (input.siteOrigin || SITE.url).replace(/\/$/, '');
  const logo = `${origin}${SITE_LOGO.split('?')[0]}`;
  const accept = input.quoteId ? `${origin}/quote/${encodeURIComponent(input.quoteId)}` : '';
  const valid = input.expirationDays?.trim()
    ? `Valid for ${escapeAttr(input.expirationDays.trim())} days from issue`
    : 'Valid for 14 days from issue';
  const wa = SITE.whatsapp.startsWith('http')
    ? SITE.whatsapp
    : `https://wa.me/${SITE.whatsapp.replace(/\D/g, '')}`;

  const row = (label: string, value: string) =>
    value.trim()
      ? `<tr><td class="lbl">${escapeAttr(label)}</td><td>${escapeHtml(value)}</td></tr>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Safari Quotation — ${escapeAttr(SITE.name)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Georgia, "Times New Roman", serif; color: #1f2937; background: #eef2f0; }
    .sheet { max-width: 760px; margin: 20px auto; background: #fff; box-shadow: 0 8px 28px rgba(27,67,50,0.12); overflow: hidden; }
    .masthead { display: grid; grid-template-columns: 1.05fr 1.15fr; min-height: 132px; }
    .mast-left { position: relative; background: #ffffff; display: flex; align-items: center; gap: 14px; padding: 18px 22px 18px 24px; }
    .mast-left img { height: 72px; width: auto; object-fit: contain; }
    .mast-left .mark { font-family: Georgia, serif; font-size: 22px; font-weight: 700; color: #1B4332; letter-spacing: 0.02em; line-height: 1.15; }
    .mast-left .mark span { display: block; font-size: 11px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: #20A048; margin-top: 4px; }
    .slash { position: relative; width: 28px; margin: 0 -14px; z-index: 2; background: linear-gradient(160deg, #C9A227 0%, #E8C547 55%, #C9A227 100%); transform: skewX(-18deg); box-shadow: 0 0 0 1px rgba(201,162,39,0.35); }
    .mast-right { background: linear-gradient(135deg, #14532d 0%, #1B4332 48%, #0f3d24 100%); color: #fff; padding: 20px 26px 18px 34px; display: flex; flex-direction: column; justify-content: center; }
    .mast-right h1 { margin: 0; font-family: "Trebuchet MS", "Segoe UI", sans-serif; font-size: 28px; font-weight: 800; color: #F5D56A; letter-spacing: 0.03em; }
    .mast-right .agency { margin: 4px 0 10px; font-family: Georgia, serif; font-size: 14px; font-style: italic; color: #ffffff; opacity: 0.95; }
    .mast-right .services { margin: 0; font-family: Georgia, serif; font-size: 11.5px; line-height: 1.45; font-style: italic; color: rgba(255,255,255,0.88); }
    .body { padding: 22px 28px 10px; }
    .eyebrow { margin: 0 0 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: #20A048; font-family: "Segoe UI", sans-serif; }
    .title { margin: 0 0 16px; font-size: 24px; color: #111827; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
    td { padding: 8px 0; border-bottom: 1px solid #e8efe9; font-size: 14px; vertical-align: top; }
    td.lbl { width: 36%; color: #6b7280; }
    .fee { margin: 6px 0 16px; padding: 14px 16px; background: #f0fdf4; border-left: 4px solid #20A048; border-radius: 0 8px 8px 0; }
    .fee strong { display: block; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #166534; font-family: "Segoe UI", sans-serif; }
    .fee span { font-size: 22px; font-weight: 700; color: #14532d; }
    .notes { font-size: 13px; line-height: 1.55; color: #374151; margin: 0 0 14px; white-space: pre-wrap; }
    .terms { font-size: 12px; line-height: 1.5; color: #6b7280; background: #f7faf8; padding: 12px 14px; border-radius: 8px; margin: 0 0 14px; }
    .terms strong { color: #374151; }
    .cta { margin: 0 0 8px; font-family: "Segoe UI", sans-serif; }
    .cta a { color: #20A048; font-weight: 700; }
    .contactbar { position: relative; background: #1B4332; color: #fff; padding: 14px 22px 16px 28px; font-family: "Segoe UI", Tahoma, sans-serif; font-size: 12px; }
    .contactbar::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 10px; background: repeating-linear-gradient(-55deg, #C9A227, #C9A227 6px, #E8C547 6px, #E8C547 11px); }
    .contact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 18px; }
    .contact-item { display: flex; align-items: flex-start; gap: 8px; }
    .contact-item .ico { width: 16px; height: 16px; margin-top: 1px; flex-shrink: 0; fill: #F5D56A; }
    .contact-item a, .contact-item span { color: #fff; text-decoration: none; line-height: 1.35; }
    .contact-item small { display: block; opacity: 0.85; font-size: 11px; }
    @media print {
      body { background: #fff; }
      .sheet { margin: 0; box-shadow: none; }
    }
    @media (max-width: 640px) {
      .masthead { grid-template-columns: 1fr; }
      .slash { display: none; }
      .mast-right { padding-left: 24px; }
      .contact-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <header class="masthead">
      <div class="mast-left">
        <img src="${escapeAttr(logo)}" alt="${escapeAttr(SITE.name)}" />
        <div class="mark">${escapeAttr(SITE.name)}<span>${escapeAttr(SITE.tagline)}</span></div>
      </div>
      <div class="slash" aria-hidden="true"></div>
      <div class="mast-right">
        <h1>${escapeAttr(SITE.name)}</h1>
        <p class="agency">Tours &amp; Travel Agency</p>
        <p class="services">${escapeAttr(QUOTE_SERVICES_LINE)}</p>
      </div>
    </header>
    <div class="body">
      <p class="eyebrow">Safari quotation</p>
      <h2 class="title">${escapeAttr(input.tour || 'Tailored safari')}</h2>
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
          ? `<div class="fee"><strong>Tour fee</strong><span>${escapeAttr(input.tourFee)}</span></div>`
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
      <p class="terms"><strong>Terms (summary):</strong> ${escapeAttr(QUOTE_TERMS_SUMMARY)}</p>
      ${
        accept
          ? `<p class="cta"><a href="${escapeAttr(accept)}">View and accept this quotation online</a></p>`
          : ''
      }
    </div>
    <footer class="contactbar">
      <div class="contact-grid">
        <div class="contact-item">
          <svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.2 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1L6.6 10.8z"/></svg>
          <span>${escapeAttr(SITE.phoneDisplay)}</span>
        </div>
        <div class="contact-item">
          <svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.5 2 2 6.3 2 11.6c0 2 .6 3.8 1.7 5.4L2 22l5.2-1.6c1.5.8 3.2 1.2 4.8 1.2 5.5 0 10-4.3 10-9.6S17.5 2 12 2zm5.7 13.6c-.2.7-1.3 1.2-1.8 1.3-.5.1-1 .2-3.3-.7-2.7-1.1-4.5-4-4.6-4.2-.1-.2-1-1.3-1-2.5s.6-1.8.9-2c.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5.2.5.7 1.8.8 1.9.1.2.1.3 0 .5l-.4.6c-.1.2-.3.4-.1.7.2.4.8 1.3 1.7 2.1 1.2 1 2.2 1.3 2.5 1.5.3.1.5.1.7-.1l.8-1.1c.2-.2.4-.2.6-.1.2.1 1.5.7 1.8.8.3.2.5.2.6.4.1.3.1 1.2-.1 1.9z"/></svg>
          <span><a href="${escapeAttr(wa)}">${escapeAttr(SITE.phoneDisplay)}</a></span>
        </div>
        <div class="contact-item">
          <svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm7.9 9h-3.2c-.2-2.4-.8-4.6-1.7-6.3 2.8 1.1 4.8 3.5 4.9 6.3zM12 4c1.2 1.7 2 4.1 2.2 7H9.8C10 8.1 10.8 5.7 12 4zM4.1 13h3.2c.2 2.4.8 4.6 1.7 6.3C6.2 18.2 4.2 15.8 4.1 13zm3.2-2H4.1C4.2 8.2 6.2 5.8 9 4.7 8.1 6.4 7.5 8.6 7.3 11zM12 20c-1.2-1.7-2-4.1-2.2-7h4.4c-.2 2.9-1 5.3-2.2 7zm3-2.7c.9-1.7 1.5-3.9 1.7-6.3h3.2c-.1 2.8-2.1 5.2-4.9 6.3z"/></svg>
          <span><a href="${escapeAttr(SITE.url)}">${escapeAttr(SITE.url.replace(/^https?:\/\//, ''))}</a></span>
        </div>
        <div class="contact-item">
          <svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5c-1.4 0-2.5-1.1-2.5-2.5S10.6 6.5 12 6.5s2.5 1.1 2.5 2.5S13.4 11.5 12 11.5z"/></svg>
          <span>${escapeAttr(SITE.address)}</span>
        </div>
        <div class="contact-item" style="grid-column: 1 / -1;">
          <svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5L4 8V6l8 5 8-5v2z"/></svg>
          <span><a href="mailto:${escapeAttr(SITE.email)}">${escapeAttr(SITE.email)}</a></span>
        </div>
      </div>
    </footer>
  </div>
</body>
</html>`;
}
