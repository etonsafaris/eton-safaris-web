import { stripPublicMoney } from '@/lib/public-money';
import { sanitizeWordHtml } from '@/lib/sanitize-html';

export type ContentBlock = {
  title: string;
  description: string;
  image_url?: string;
  caption?: string;
};

export type EmbeddedItineraryDay = {
  day?: string;
  title?: string;
  description?: string;
  mealPlan?: string;
  meal_plan?: string;
  accommodationPlan?: string;
  accommodation_plan?: string;
};

export type EmbeddedContent = {
  blocks?: ContentBlock[];
  itineraries?: EmbeddedItineraryDay[];
  fields?: Record<string, string>;
};

const MARKER = /<!--ETON_CONTENT:([\s\S]*?)-->/g;

function decodePayload(encoded: string): EmbeddedContent {
  try {
    return JSON.parse(decodeURIComponent(encoded)) as EmbeddedContent;
  } catch {
    try {
      return JSON.parse(encoded) as EmbeddedContent;
    } catch {
      return {};
    }
  }
}

export function extractEmbeddedContent(html: string): EmbeddedContent {
  if (!html) return {};
  let merged: EmbeddedContent = {};
  for (const match of html.matchAll(MARKER)) {
    const next = decodePayload(match[1] || '');
    merged = {
      blocks: next.blocks?.length ? next.blocks : merged.blocks,
      itineraries: next.itineraries?.length ? next.itineraries : merged.itineraries,
      fields: { ...merged.fields, ...next.fields },
    };
  }
  return merged;
}

export function stripEmbeddedContent(html: string): string {
  return String(html || '')
    .replace(MARKER, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function hasEmbeddedData(data: EmbeddedContent): boolean {
  if (data.blocks && data.blocks.length > 0) return true;
  if (data.itineraries && data.itineraries.length > 0) return true;
  if (data.fields && Object.values(data.fields).some((value) => String(value || '').trim())) return true;
  return false;
}

export function embedContent(html: string, data: EmbeddedContent): string {
  const clean = stripEmbeddedContent(html);
  if (!hasEmbeddedData(data)) return clean;
  const payload: EmbeddedContent = {
    blocks:
      data.blocks?.filter(
        (block) =>
          block.title.trim() ||
          block.description.trim() ||
          String(block.image_url || '').trim() ||
          String(block.caption || '').trim()
      ) || [],
    itineraries:
      data.itineraries?.filter(
        (day) =>
          Boolean(day.title?.trim() || day.description?.trim() || day.mealPlan?.trim() || day.accommodationPlan?.trim())
      ) || [],
    fields: Object.fromEntries(
      Object.entries(data.fields || {}).filter(([, value]) => String(value || '').trim())
    ),
  };
  if (!hasEmbeddedData(payload)) return clean;
  return `${clean}\n<!--ETON_CONTENT:${encodeURIComponent(JSON.stringify(payload))}-->`;
}

export function recordBodyHtml(record: Record<string, unknown> | null | undefined): string {
  if (!record) return '';
  for (const key of ['description', 'content', 'summary', 'excerpt']) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return '';
}

export function publicBodyHtml(html: string): string {
  return stripPublicMoney(sanitizeWordHtml(stripEmbeddedContent(html)));
}
