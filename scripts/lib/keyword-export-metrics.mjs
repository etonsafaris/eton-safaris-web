/** Intent + volume for keyword Excel exports (uses stored fields when present). */

const COMMERCIAL_RE =
  /\b(tour|tours|safari|safaris|package|packages|price|prices|cost|book|booking|holiday|holidays|vacation|deal|deals|permit|permits|luxury|budget|cheap|itinerary|itineraries|trip|trips|reserve|reservation|quote|quotes)\b/i;
const INFORMATIONAL_RE =
  /\b(what|when|where|why|how|best time|weather|map|facts|information|guide|tips|meaning|difference|vs\b|versus|history|culture|language|currency|visa requirements)\b/i;

export function classifyKeywordIntent(phrase) {
  const text = String(phrase || '').trim();
  if (!text) return 'Informational';
  const commercial = COMMERCIAL_RE.test(text);
  const informational = INFORMATIONAL_RE.test(text);
  if (commercial && !informational) return 'Commercial';
  if (informational && !commercial) return 'Informational';
  if (commercial) return 'Commercial';
  return 'Informational';
}

/** Plausible monthly search volume for sorting (higher = head terms / shorter phrases). */
export function estimateKeywordVolume(phrase, rankIndex = 0) {
  const text = String(phrase || '').trim();
  if (!text) return 0;
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = Math.max(1, words.length);
  const rankBoost = 1 / Math.pow(rankIndex + 1, 0.42);
  const lengthFactor = 1 / Math.pow(wordCount, 0.95);
  let volume = 22000 * rankBoost * lengthFactor;
  if (COMMERCIAL_RE.test(text)) volume *= 1.12;
  if (INFORMATIONAL_RE.test(text)) volume *= 0.88;
  if (wordCount <= 2) volume *= 1.35;
  return Math.max(10, Math.round(volume));
}

function pickObjectField(obj, keys) {
  for (const key of keys) {
    const v = obj?.[key];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return '';
}

function parseVolume(value) {
  if (value == null || value === '') return null;
  const n = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

function parseIntent(value, phrase) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower.startsWith('comm')) return 'Commercial';
  if (lower.startsWith('info')) return 'Informational';
  if (lower.includes('transaction')) return 'Commercial';
  return classifyKeywordIntent(phrase);
}

/**
 * Parse keywords column into { keyword, intent, volume, rankIndex } preserving DB order.
 */
export function parseKeywordEntries(value) {
  let raw = value;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) raw = parsed;
    } catch {
      raw = raw
        .split(/\r?\n/)
        .flatMap((line) => line.split(','))
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  if (!Array.isArray(raw)) {
    return parseKeywordEntriesFromString(String(value || ''));
  }

  const entries = [];
  for (let index = 0; index < raw.length; index += 1) {
    const item = raw[index];
    if (item == null) continue;
    if (typeof item === 'string') {
      const keyword = item.trim();
      if (!keyword) continue;
      entries.push({ keyword, intent: null, volume: null, rankIndex: index });
      continue;
    }
    if (typeof item === 'object') {
      const keyword = pickObjectField(item, ['keyword', 'phrase', 'text', 'term', 'query', 'name']);
      if (!keyword) continue;
      entries.push({
        keyword,
        intent: parseIntent(item.intent ?? item.Intent ?? item.traffic_intent, keyword),
        volume: parseVolume(item.volume ?? item.Volume ?? item.search_volume ?? item.searchVolume),
        rankIndex: index,
      });
    }
  }
  return entries;
}

function parseKeywordEntriesFromString(text) {
  return text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((keyword, index) => ({ keyword, intent: null, volume: null, rankIndex: index }));
}

export function enrichKeywordEntry(entry) {
  const keyword = String(entry.keyword || '').trim();
  const intent = entry.intent || classifyKeywordIntent(keyword);
  const volume = entry.volume ?? estimateKeywordVolume(keyword, entry.rankIndex ?? 0);
  return { keyword, intent, volume };
}

export function dedupeAndSortKeywordEntries(entries) {
  const seen = new Set();
  const unique = [];
  for (const entry of entries) {
    const enriched = enrichKeywordEntry(entry);
    const key = enriched.keyword.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(enriched);
  }
  unique.sort((a, b) => b.volume - a.volume || a.keyword.localeCompare(b.keyword));
  return unique;
}
