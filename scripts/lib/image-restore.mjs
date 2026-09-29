/** Shared helpers: detect auto-assigned “fake” covers and recover real CMS URLs. */

export const IMAGE_COLUMNS = [
  'image_url',
  'image',
  'cover_image',
  'featured_image',
  'social_image_url',
  'thumbnail',
  'photo',
  'banner',
  'picture',
];

export const HTML_COLUMNS = ['description', 'content', 'body', 'excerpt', 'summary', 'seo_schema', 'meta_description'];

const CMS_MEDIA_RE = /\/(?:api\/media|cms-media)\/([a-f0-9]{32})/i;
const STOCK_RE = /images\.unsplash\.com|images\.pexels\.com/i;
/** WebP uploads from assign-accommodation-images / assign-park-images. */
const AUTO_ASSIGN_SUPABASE_RE =
  /supabase\.co\/storage.*\/(?:accommodations|national-parks)\/\d{10,}-[a-f0-9]{12}\.webp/i;

export function cmsMediaUrl(value) {
  if (value == null) return null;
  const match = String(value).trim().match(CMS_MEDIA_RE);
  if (!match) return null;
  return `/api/media/${match[1].toLowerCase()}`;
}

export function isAutoAssignedFakeImage(value) {
  if (value == null) return true;
  const text = String(value).trim();
  if (!text) return true;
  if (STOCK_RE.test(text)) return true;
  if (AUTO_ASSIGN_SUPABASE_RE.test(text)) return true;
  return false;
}

export function normalizeRecoveryUrl(raw) {
  if (raw == null) return null;
  const cms = cmsMediaUrl(raw);
  if (cms) return cms;
  const text = String(raw).trim();
  if (!text || isAutoAssignedFakeImage(text)) return null;
  if (/^https?:\/\//i.test(text)) {
    if (/supabase\.co\/storage/i.test(text)) return text.replace(/^http:\/\//i, 'https://');
    if (/res\.cloudinary\.com/i.test(text)) return text.replace(/^http:\/\//i, 'https://');
  }
  return null;
}

export function recoveryFromImageColumns(row, imageCols, primaryCol) {
  for (const col of imageCols) {
    if (col === primaryCol) continue;
    const found = normalizeRecoveryUrl(row[col]);
    if (found) return found;
  }
  return null;
}

export function recoveryFromHtmlFields(row, htmlCols) {
  for (const col of htmlCols) {
    const text = row[col];
    if (!text) continue;
    const fromHtml = recoveryFromText(String(text));
    if (fromHtml) return fromHtml;
  }
  return null;
}

export function recoveryFromText(text) {
  const s = String(text || '');
  if (!s) return null;

  const inlineMedia = s.match(/\/api\/media\/[a-f0-9]{32}/i);
  if (inlineMedia) return cmsMediaUrl(inlineMedia[0]);

  for (const match of s.matchAll(/https?:\/\/[^\s"'<>]+supabase\.co\/storage[^\s"'<>]*/gi)) {
    const url = match[0];
    if (!isAutoAssignedFakeImage(url)) return url.replace(/^http:\/\//i, 'https://');
  }

  for (const match of s.matchAll(/https?:\/\/res\.cloudinary\.com\/[^\s"'<>]+/gi)) {
    return match[0].replace(/^http:\/\//i, 'https://');
  }

  for (const match of s.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) {
    const found = normalizeRecoveryUrl(match[1]);
    if (found) return found;
  }

  return null;
}

export function websiteFromStay(row) {
  const embed = String(row.description || '').match(/<!--ETON_CONTENT:([\s\S]*?)-->/);
  if (embed) {
    try {
      const payload = JSON.parse(decodeURIComponent(embed[1]));
      const url = payload?.fields?.website;
      if (url) return String(url).trim();
    } catch {
      /* ignore */
    }
  }
  return String(row.website || row.website_url || '').trim();
}
