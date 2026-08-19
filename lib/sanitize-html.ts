const MSO_BLOCK = /<!--\[if[\s\S]*?<!\[endif\]-->/gi;
const STYLE_KEEP = /^(background-color|font-size|font-family|font-weight|font-style|text-decoration|text-align|line-height|text-indent|vertical-align)$/i;
const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'a', 'table', 'thead',
  'tbody', 'tr', 'th', 'td', 'img', 'hr', 'sup', 'sub', 'span', 'div', 'font',
  'mark', 'pre', 'code',
]);

export function decodeHtmlEntities(input: string): string {
  let html = input;
  for (let i = 0; i < 3; i += 1) {
    if (!/&(?:amp|lt|gt|quot|#39|#x2f|#x27);/i.test(html)) break;
    html = html
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&#x27;/gi, "'")
      .replace(/&#x2f;/gi, '/');
  }
  return html;
}

function cleanStyleValue(style: string): string {
  return style
    .split(';')
    .map((part) => {
      const idx = part.indexOf(':');
      if (idx < 0) return '';
      const prop = part.slice(0, idx).trim();
      const value = part.slice(idx + 1).trim();
      if (!prop || !value) return '';
      if (/^mso-/i.test(prop) || !STYLE_KEEP.test(prop)) return '';
      if (/expression|javascript:/i.test(value)) return '';
      return `${prop}: ${value}`;
    })
    .filter(Boolean)
    .join('; ');
}

function attr(rest: string, name: string): string {
  const match = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i').exec(rest);
  return (match?.[2] || match?.[3] || '').trim();
}

/**
 * Strip Word/MSO junk and scripts, but keep visual formatting
 * (bold, italic, color, size, font, alignment, links, lists).
 */
export function sanitizeWordHtml(input: string): string {
  if (!input) return '';

  let html = decodeHtmlEntities(input)
    .replace(MSO_BLOCK, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<xml[\s\S]*?<\/xml>/gi, '')
    .replace(/<o:p\s*\/?>/gi, '')
    .replace(/<\/o:p>/gi, '')
    .replace(/<\/?(w|m|v|o):[^>]*>/gi, '');

  html = html.replace(/<\/?([a-zA-Z0-9:-]+)([^>]*)>/g, (match, rawTag: string, rest: string) => {
    const tag = rawTag.toLowerCase();
    const closing = match.startsWith('</');
    if (!ALLOWED_TAGS.has(tag)) return '';
    if (closing) return tag === 'font' ? '</span>' : `</${tag}>`;

    if (tag === 'br' || tag === 'hr') return `<${tag} />`;

    if (tag === 'a') {
      const href = attr(rest, 'href').replace(/"/g, '');
      if (!href || /^(javascript|data):/i.test(href)) return '<a>';
      const style = cleanStyleValue(attr(rest, 'style'));
      const target = attr(rest, 'target');
      const extras = [
        `href="${href}"`,
        style ? `style="${style}"` : '',
        target === '_blank' ? 'target="_blank" rel="noopener noreferrer"' : '',
      ]
        .filter(Boolean)
        .join(' ');
      return `<a ${extras}>`;
    }

    if (tag === 'img') {
      const src = attr(rest, 'src').replace(/"/g, '');
      if (!src || /^(javascript|data):/i.test(src)) return '';
      const alt = attr(rest, 'alt').replace(/"/g, '');
      return `<img src="${src}" alt="${alt}" />`;
    }

    if (tag === 'font') {
      const face = attr(rest, 'face');
      const size = attr(rest, 'size');
      const parts = [
        face ? `font-family: ${face}` : '',
        size ? `font-size: ${Number(size) >= 5 ? '24px' : Number(size) >= 4 ? '18px' : '16px'}` : '',
        cleanStyleValue(attr(rest, 'style')),
      ].filter(Boolean);
      return parts.length ? `<span style="${parts.join('; ')}">` : '<span>';
    }

    const style = cleanStyleValue(attr(rest, 'style'));
    const align = attr(rest, 'align');
    const merged = [style, align ? `text-align: ${align}` : ''].filter(Boolean).join('; ');
    return merged ? `<${tag} style="${merged}">` : `<${tag}>`;
  });

  html = html.replace(/<p([^>]*)>(?:\s|&nbsp;|\u00a0|<br\s*\/?>)*<\/p>/gi, '<p$1><br /></p>');
  html = html.replace(/&nbsp;/g, ' ');
  html = html.replace(/\u00a0/g, ' ');
  return applyEditorialTypography(html.trim());
}

const EDITORIAL_FONT = 'system-ui, -apple-system, Roboto, "Helvetica Neue", sans-serif';

function mergeEditorialStyle(existing: string, tag: string): string {
  const isGreenHeading = /^h[1-3]$/i.test(tag);
  const isSmallHeading = /^h[4-6]$/i.test(tag);
  const kept = existing
    .split(';')
    .map((part) => part.trim())
    .filter((part) => {
      if (!part) return false;
      const prop = part.split(':')[0]?.trim().toLowerCase();
      if (isGreenHeading || isSmallHeading) {
        return !['font-family', 'text-align', 'color', 'font-style', 'font-weight'].includes(prop);
      }
      return prop !== 'font-family' && prop !== 'text-align' && prop !== 'color';
    });
  if (isGreenHeading) {
    return [
      'font-family: Inter, system-ui, sans-serif',
      'text-align: left',
      'font-style: normal',
      'font-weight: 700',
      'color: #00A651',
      ...kept,
    ].join('; ');
  }
  if (isSmallHeading) {
    return [
      `font-family: ${EDITORIAL_FONT}`,
      'text-align: left',
      'font-style: normal',
      'font-weight: 700',
      'color: #111',
      ...kept,
    ].join('; ');
  }
  const base = [`font-family: ${EDITORIAL_FONT}`, 'text-align: justify', 'color: #000'];
  return [...base, ...kept].join('; ');
}

function restyleGreenHeadingContents(html: string): string {
  return html.replace(/<(h[1-3])(\s[^>]*)?>([\s\S]*?)<\/\1>/gi, (_match, tag: string, rest = '', inner: string) => {
    const cleaned = String(inner)
      .replace(/font-family\s*:\s*[^;"']+;?/gi, '')
      .replace(/font-style\s*:\s*italic;?/gi, '');
    return `<${tag}${rest || ''}>${cleaned}</${tag}>`;
  });
}

/** Force pasted and saved description HTML to Dav body font, justified, black body text. */
export function applyEditorialTypography(html: string): string {
  if (!html) return '';
  const withTags = html.replace(/<(p|div|li|td|blockquote|h[1-6])(\s[^>]*)?>/gi, (match, tag: string, rest = '') => {
    const closing = match.startsWith('</');
    if (closing) return match;
    const style = mergeEditorialStyle(cleanStyleValue(attr(rest, 'style')), tag);
    const withoutStyle = String(rest || '').replace(/\sstyle\s*=\s*("([^"]*)"|'([^']*)')/i, '');
    return `<${tag.toLowerCase()}${withoutStyle} style="${style}">`;
  });
  return restyleGreenHeadingContents(withTags);
}

export function wordCountFromHtml(html: string): number {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text ? text.split(' ').length : 0;
}
