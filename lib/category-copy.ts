import { destinationPublicPath } from '@/lib/cms-routes';
import { getRecordTitle, pickPlainText, pickString } from '@/lib/data';
import type { RecordRow } from '@/lib/types';

function clip(text: string, max: number) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}

export function categoryCardDescription(category: RecordRow, countryName: string) {
  const stored = pickPlainText(category, ['description', 'excerpt', 'summary', 'content']);
  if (stored.length >= 40) return clip(stored, 180);
  const title = getRecordTitle(category);
  const country = countryName || pickString(category, ['country']) || 'this destination';
  return `Plan ${title} in ${country} with Eton Safaris — private guiding, park logistics, and lodges matched to your travel style.`;
}

export function categoryPageHtml(category: RecordRow, countryName: string, countrySlug: string) {
  const stored = pickPlainText(category, ['description', 'excerpt', 'summary', 'content', 'about']);
  const title = getRecordTitle(category);
  const countryHref = destinationPublicPath(countrySlug);
  const intro =
    stored.length >= 80
      ? stored
      : `${title} in ${countryName} is arranged as a focused safari style: the right parks, a realistic daily pace, and stays that fit how you like to travel. Eton Safaris builds the route around wildlife time, transfers, and the season you visit.`;
  return `<p>${intro}</p><p>Continue through <a href="${countryHref}">${countryName} safari tours</a> or request a private itinerary with our destination specialists.</p>`;
}
