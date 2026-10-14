import {
  countryArticleHtml,
  isSubstantialCountryArticle,
  stripParkListFromCountryHtml,
} from '@/lib/country-landing-copy';
import { visibleRecordHtml } from '@/lib/data';
import type { RecordRow } from '@/lib/types';

function toProseHtml(value: string) {
  const cleaned = value.trim();
  if (!cleaned) return '';
  if (/<[a-z][\s\S]*>/i.test(cleaned)) return cleaned;
  return cleaned
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, '<br />')}</p>`)
    .join('');
}

/** Country body: substantial CMS copy when present, else curated fallback (Rwanda, Uganda, …). */
export function resolveCountryDescriptionHtml(slug: string, country?: RecordRow | null) {
  const cmsRaw = country ? visibleRecordHtml(country, ['description', 'content', 'about']) : '';
  const cmsHtml = stripParkListFromCountryHtml(toProseHtml(cmsRaw));
  const fallbackHtml = countryArticleHtml(slug);
  if (isSubstantialCountryArticle(cmsHtml)) return cmsHtml;
  return fallbackHtml || cmsHtml;
}
