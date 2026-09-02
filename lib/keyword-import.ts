import { chipsFromKeywordRows, keywordRowMatchesScope, parseKeywordList, uniqueKeywords } from '@/lib/keywords';
import { parseMissingColumn } from '@/lib/supabase-save';
type SupabaseClient = any;

export function normalizeKeywordPhrase(value: string): string {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

const JUNK_PATTERNS: RegExp[] = [
  /^https?:\/\//i,
  /rwandagorillasafari\.com/i,
  /\bjacada\b/i,
  /\bg\s*adventures\b/i,
  /\bgadventures\b/i,
  /\blonely\s*planet\b/i,
  /\bzoo\s*knoxville\b/i,
  /\bengagi\s+safaris\b/i,
  /\bkabiza\s+wilderness\b/i,
  /\blet['’]?s\s+go\s+travel\b/i,
  /gorilla safaris uganda limited/i,
  /east african playgrounds/i,
  /\baa\s+safaris\b/i,
  /\balive\s+safaris\b/i,
  /\beasygo\s+safaris\b/i,
  /\bescape\s+tours\b/i,
  /\bhome\s+to\s+africa\b/i,
  /\blifetime\s+experience\s+safaris\b/i,
  /\blove\s+uganda\s+safaris\b/i,
  /\bprime\s+safaris\b/i,
  /\branger\s+safaris\b/i,
  /\bspeedway\s+safaris\b/i,
  /\bmaranatha\s+tours\b/i,
  /\bmakula\b/i,
  /\bwonder\s+uganda\s+safaris\b/i,
  /explore\.co\.uk/i,
  /\binurl\s*:/i,
  /\bsite\s*:/i,
  /&amp/i,
];

export function isJunkKeyword(value: string): boolean {
  const phrase = normalizeKeywordPhrase(value);
  if (!phrase) return true;
  if (JUNK_PATTERNS.some((pattern) => pattern.test(phrase))) return true;
  if (/\bkenya\b/i.test(phrase) && /\bvictoria\s+falls\b/i.test(phrase) && !/\buganda\b/i.test(phrase)) {
    return true;
  }
  return false;
}

export function prepareKeywordImport(values: unknown): {
  keywords: string[];
  skippedJunk: string[];
} {
  const raw = Array.isArray(values)
    ? values.flatMap((item) =>
        typeof item === 'string' && item.includes('\n')
          ? item.split(/\r?\n/).map((line) => normalizeKeywordPhrase(line))
          : [normalizeKeywordPhrase(String(item ?? ''))]
      )
    : parseKeywordList(values).map(normalizeKeywordPhrase);

  const skippedJunk: string[] = [];
  const kept: string[] = [];

  for (const phrase of raw) {
    if (!phrase) continue;
    if (isJunkKeyword(phrase)) {
      if (!skippedJunk.some((item) => item.toLowerCase() === phrase.toLowerCase())) {
        skippedJunk.push(phrase);
      }
      continue;
    }
    kept.push(phrase);
  }

  return { keywords: uniqueKeywords(kept), skippedJunk };
}

export function mergeKeywordImport(
  existing: string[],
  incoming: string[]
): {
  keywords: string[];
  added: string[];
  skippedDuplicates: number;
} {
  const current = uniqueKeywords(existing.map(normalizeKeywordPhrase));
  const seen = new Set(current.map((item) => item.toLowerCase()));
  const added: string[] = [];
  let skippedDuplicates = 0;

  for (const phrase of uniqueKeywords(incoming.map(normalizeKeywordPhrase))) {
    const key = phrase.toLowerCase();
    if (seen.has(key)) {
      skippedDuplicates += 1;
      continue;
    }
    seen.add(key);
    added.push(phrase);
    current.push(phrase);
  }

  return { keywords: current, added, skippedDuplicates };
}

export type KeywordScopeImportResult = {
  country: string;
  category: string;
  rowId: string;
  created: boolean;
  keywords: string[];
  added: string[];
  addedCount: number;
  skippedDuplicates: number;
  skippedJunk: string[];
  totalCount: number;
};

async function writeKeywordScope(
  client: SupabaseClient,
  payload: Record<string, unknown>,
  existingId?: string
) {
  let current = { ...payload };
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const write = existingId
      ? await client.from('keywords').update(current).eq('id', existingId).select('*')
      : await client.from('keywords').insert(current).select('*');

    if (!write.error) {
      return { data: (write.data || []) as Record<string, unknown>[], error: null as { message: string } | null };
    }

    const column = parseMissingColumn(write.error.message);
    if (column && column in current) {
      delete current[column];
      continue;
    }

    if (Array.isArray(current.keywords) && /invalid input|malformed|json|array/i.test(write.error.message)) {
      current = { ...current, keywords: JSON.stringify(current.keywords) };
      continue;
    }

    if (/null value in column ["']?id["']?/i.test(write.error.message) && !current.id) {
      current = { ...current, id: crypto.randomUUID() };
      continue;
    }

    return { data: null, error: { message: write.error.message } };
  }

  return { data: null, error: { message: 'Failed to save keywords after column fallbacks.' } };
}

export async function importKeywordsForScope(
  client: SupabaseClient,
  options: {
    country: string;
    category: string;
    keywords: unknown;
    merge?: boolean;
  }
): Promise<KeywordScopeImportResult> {
  const country = normalizeKeywordPhrase(options.country);
  const category = normalizeKeywordPhrase(options.category);
  if (!country) throw new Error('Select a country first.');
  if (!category) throw new Error('Select a category first.');

  const prepared = prepareKeywordImport(options.keywords);
  const merge = options.merge === true;

  const { data: existing, error: loadError } = await client.from('keywords').select('*');
  if (loadError) throw new Error(loadError.message);

  const rows = ((existing as Record<string, unknown>[]) || []).filter((row) =>
    keywordRowMatchesScope(row, country, category)
  );
  const existingChips = chipsFromKeywordRows(rows);
  const next = merge
    ? mergeKeywordImport(existingChips, prepared.keywords)
    : { keywords: prepared.keywords, added: prepared.keywords, skippedDuplicates: 0 };

  const existingId = String(rows[0]?.id || '').trim() || undefined;
  const payload: Record<string, unknown> = {
    country,
    category,
    keywords: next.keywords,
  };
  if (!existingId) payload.id = crypto.randomUUID();

  const write = await writeKeywordScope(client, payload, existingId);
  if (write.error) throw new Error(write.error.message);

  const extraIds = rows
    .slice(1)
    .map((row) => String(row.id || '').trim())
    .filter(Boolean);
  if (extraIds.length > 0) {
    await client.from('keywords').delete().in('id', extraIds);
  }

  const saved = write.data?.[0] || {};
  const rowId = String(saved.id || existingId || '');

  return {
    country,
    category,
    rowId,
    created: !existingId,
    keywords: next.keywords,
    added: next.added,
    addedCount: next.added.length,
    skippedDuplicates: next.skippedDuplicates,
    skippedJunk: prepared.skippedJunk,
    totalCount: next.keywords.length,
  };
}
