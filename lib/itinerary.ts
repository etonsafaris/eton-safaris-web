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
  const fromColumn = parseItineraries(record.itineraries);
  if (fromColumn.length > 0) return fromColumn;
  return extractEmbeddedContent(recordBodyHtml(record)).itineraries || [];
}
