import { extractEmbeddedContent, recordBodyHtml } from '@/lib/embedded-content';
import type { RecordRow } from '@/lib/types';

export type ItineraryDay = {
  day?: string;
  title?: string;
  description?: string;
  mealPlan?: string;
  meal_plan?: string;
  accommodationPlan?: string;
  accommodation_plan?: string;
};

function asDays(value: unknown): ItineraryDay[] | null {
  if (!Array.isArray(value)) return null;
  return value.filter((item) => item && typeof item === 'object') as ItineraryDay[];
}

export function parseItineraries(value: unknown): ItineraryDay[] {
  const direct = asDays(value);
  if (direct) return direct;

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const nested = asDays(record.days) || asDays(record.itineraries) || asDays(record.items);
    if (nested) return nested;
  }

  if (typeof value !== 'string' || !value.trim()) return [];

  try {
    return parseItineraries(JSON.parse(value));
  } catch {
    return extractEmbeddedContent(value).itineraries || [];
  }
}

export function parseItinerariesFromRecord(record: RecordRow | null | undefined): ItineraryDay[] {
  if (!record) return [];
  const fromColumn =
    parseItineraries(record.itineraries).length > 0
      ? parseItineraries(record.itineraries)
      : parseItineraries(record.itinerary);
  const fromEmbed = extractEmbeddedContent(recordBodyHtml(record)).itineraries || [];
  const days = fromColumn.length > 0 ? fromColumn : fromEmbed;
  return sortItineraryDays(days);
}

/** Prefer explicit day numbers when present; otherwise keep saved array order. */
export function sortItineraryDays(days: ItineraryDay[]): ItineraryDay[] {
  if (days.length < 2) return days;
  const indexed = days.map((day, index) => ({ day, index, num: Number.parseInt(String(day.day ?? ''), 10) }));
  const allNumbered = indexed.every((item) => Number.isFinite(item.num) && item.num > 0);
  if (!allNumbered) return days;
  return [...indexed]
    .sort((a, b) => a.num - b.num || a.index - b.index)
    .map((item) => item.day);
}
