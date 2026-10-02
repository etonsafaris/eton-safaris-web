/** Third-party hosts we no longer serve or link to (Base44 CDN, Supabase Storage). */
const LEGACY_MEDIA_HOST_RE = /(?:supabase\.co\/storage|media\.base44\.com|\.base44\.com)/i;

const LEGACY_MEDIA_URL_RE =
  /https?:\/\/[^\s"'<>]*(?:supabase\.co\/storage|media\.base44\.com)[^\s"'<>]*/gi;

export function isBase44MediaUrl(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return /media\.base44\.com|\.base44\.com/i.test(value.trim());
}

export function isSupabaseStorageUrl(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return /supabase\.co\/storage/i.test(value.trim());
}

/** True for Base44 or Supabase Storage image/CDN URLs stored on CMS rows. */
export function isLegacyExternalMediaUrl(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const text = value.trim();
  if (!text) return false;
  return LEGACY_MEDIA_HOST_RE.test(text);
}

export function isBlockedExternalHost(hostname: string): boolean {
  const host = hostname.replace(/^www\./i, '').toLowerCase();
  if (host.endsWith('supabase.co')) return true;
  if (host === 'base44.com' || host.endsWith('.base44.com')) return true;
  return false;
}

/** Remove legacy CDN URLs from rich text before public render (DB scrub is still recommended). */
export function scrubLegacyMediaFromHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  let out = html.replace(LEGACY_MEDIA_URL_RE, '');
  out = out.replace(/\s(?:href|src)=(["'])\s*\1/gi, '');
  return out;
}
