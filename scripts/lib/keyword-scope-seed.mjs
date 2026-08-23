/**
 * Shared keyword-scope seed runner.
 * Mirrors lib/keyword-import.ts (prepareKeywordImport, mergeKeywordImport,
 * junk filters, and column-fallback writes) for plain Node .mjs scripts.
 */
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const JUNK_PATTERNS = [
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

export function loadEnv() {
  const file = resolve(process.cwd(), '.env.local');
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

export function normalizeKeywordPhrase(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isJunkKeyword(value) {
  const phrase = normalizeKeywordPhrase(value);
  if (!phrase) return true;
  if (JUNK_PATTERNS.some((pattern) => pattern.test(phrase))) return true;
  if (/\bkenya\b/i.test(phrase) && /\bvictoria\s+falls\b/i.test(phrase) && !/\buganda\b/i.test(phrase)) {
    return true;
  }
  return false;
}

export function uniqueKeywords(values) {
  const chips = [];
  for (const value of values) {
    const keyword = normalizeKeywordPhrase(value);
    if (!keyword) continue;
    if (!chips.some((chip) => chip.toLowerCase() === keyword.toLowerCase())) {
      chips.push(keyword);
    }
  }
  return chips;
}

export function parseKeywordList(value) {
  if (Array.isArray(value)) return uniqueKeywords(value.map(String));
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return uniqueKeywords(parsed.map(String));
  } catch {
    // fall through
  }
  return uniqueKeywords(value.split(/[,;\n]+/));
}

export function prepareKeywordImport(rawLines) {
  const skippedJunk = [];
  const kept = [];
  for (const line of rawLines) {
    const phrase = normalizeKeywordPhrase(line);
    if (!phrase) continue;
    if (isJunkKeyword(phrase)) {
      if (!skippedJunk.some((item) => item.toLowerCase() === phrase.toLowerCase())) {
        skippedJunk.push(phrase);
      }
      continue;
    }
    kept.push(phrase);
  }
  return { keywords: uniqueKeywords(kept), skippedJunk, rawCount: kept.length + skippedJunk.length };
}

export function mergeKeywordImport(existing, incoming) {
  const current = uniqueKeywords(existing);
  const seen = new Set(current.map((item) => item.toLowerCase()));
  const added = [];
  let skippedDuplicates = 0;
  for (const phrase of uniqueKeywords(incoming)) {
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

function pickName(row, keys) {
  for (const key of keys) {
    const value = normalizeKeywordPhrase(String(row?.[key] ?? ''));
    if (value) return value;
  }
  return '';
}

function findNamedRow(rows, wanted, keys) {
  const target = wanted.toLowerCase();
  return (
    rows.find((row) => pickName(row, keys).toLowerCase() === target) ||
    rows.find((row) => pickName(row, keys).toLowerCase().includes(target)) ||
    null
  );
}

function missingColumn(message) {
  const match =
    message.match(/Could not find the '([^']+)' column/i) ||
    message.match(/column ["'`]([^"'`]+)["'`]/i) ||
    message.match(/column \w+\.([a-z0-9_]+) does not exist/i);
  return match?.[1] || null;
}

function keywordRowMatchesScope(row, country, category) {
  const rowCountry = String(row.country || '').trim();
  const rowCategory = String(row.category || '').trim();
  const matchesCountry = !rowCountry || rowCountry.toLowerCase() === country.toLowerCase();
  const matchesCategory = rowCategory.toLowerCase() === category.toLowerCase();
  return Boolean(category) && matchesCountry && matchesCategory;
}

async function saveRow(supabase, table, payload, id) {
  let current = { ...payload };
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const query = id
      ? supabase.from(table).update(current).eq('id', id)
      : supabase.from(table).insert(current);
    const { data, error } = await query.select('*').limit(1);
    if (!error) return { data: data?.[0] || true, error: null };

    const column = missingColumn(error.message);
    if (column && column in current) {
      delete current[column];
      continue;
    }
    if (Array.isArray(current.keywords) && /invalid input|malformed|json|array/i.test(error.message)) {
      current = { ...current, keywords: JSON.stringify(current.keywords) };
      continue;
    }
    if (/null value in column ["']?id["']?/i.test(error.message) && !current.id) {
      current.id = randomUUID();
      continue;
    }
    return { data: null, error };
  }
  return { data: null, error: { message: `Failed to save ${table} after column fallbacks.` } };
}

function readKeywordLines(filePath, required = true) {
  if (!existsSync(filePath)) {
    if (!required) return [];
    throw new Error(`Keyword list file not found: ${filePath}`);
  }
  return readFileSync(filePath, 'utf8').split(/\r?\n/);
}

function createSupabase() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export async function runKeywordScopeSeed(options) {
  const {
    country: TARGET_COUNTRY,
    category: TARGET_CATEGORY,
    countrySlug,
    countryTagline,
    categorySlug,
    categoryDescription,
    keywordFile,
    extrasFile,
  } = options;

  const pastedLines = readKeywordLines(keywordFile, true);
  const extraLines = extrasFile ? readKeywordLines(extrasFile, false) : [];
  const pasted = prepareKeywordImport(pastedLines);
  const extras = prepareKeywordImport(extraLines);
  const prepared = prepareKeywordImport([...pastedLines, ...extraLines]);
  if (prepared.keywords.length === 0) {
    throw new Error('No importable keywords after normalize/junk filters.');
  }

  const extraKeys = new Set(extras.keywords.map((item) => item.toLowerCase()));
  const extrasUniqueToImport = extras.keywords.filter(
    (item) => !pasted.keywords.some((phrase) => phrase.toLowerCase() === item.toLowerCase())
  );

  const supabase = createSupabase();
  const [{ data: countries, error: countryError }, { data: categories, error: categoryError }] =
    await Promise.all([supabase.from('countries').select('*'), supabase.from('categories').select('*')]);
  if (countryError) throw new Error(`Failed to load countries: ${countryError.message}`);
  if (categoryError) throw new Error(`Failed to load categories: ${categoryError.message}`);

  let countryMatch = findNamedRow(countries || [], TARGET_COUNTRY, ['name', 'title', 'country']);
  let countryCreated = false;
  if (!countryMatch) {
    const inserted = await saveRow(supabase, 'countries', {
      id: randomUUID(),
      name: TARGET_COUNTRY,
      slug: countrySlug,
      tagline: countryTagline || '',
    });
    if (inserted.error) {
      throw new Error(
        `${TARGET_COUNTRY} country row is missing and could not be created: ${inserted.error.message}`
      );
    }
    countryMatch = inserted.data;
    countryCreated = true;
  }
  const countryName = pickName(countryMatch, ['name', 'title', 'country']) || TARGET_COUNTRY;

  const scopedCategories = (categories || []).filter((row) => {
    const country = pickName(row, ['country']);
    return !country || country.toLowerCase() === countryName.toLowerCase();
  });
  let categoryMatch =
    findNamedRow(scopedCategories, TARGET_CATEGORY, ['name', 'title', 'category']) ||
    findNamedRow(categories || [], TARGET_CATEGORY, ['name', 'title', 'category']);
  let categoryCreated = false;
  if (!categoryMatch) {
    const inserted = await saveRow(supabase, 'categories', {
      id: randomUUID(),
      name: TARGET_CATEGORY,
      title: TARGET_CATEGORY,
      slug: categorySlug,
      country: countryName,
      description: categoryDescription || '',
    });
    if (inserted.error) {
      throw new Error(
        `"${TARGET_CATEGORY}" category is missing and could not be created: ${inserted.error.message}`
      );
    }
    categoryMatch = inserted.data;
    categoryCreated = true;
  }
  const categoryName = pickName(categoryMatch, ['name', 'title', 'category']) || TARGET_CATEGORY;

  const { data: keywordRows, error: keywordError } = await supabase.from('keywords').select('*');
  if (keywordError) throw new Error(`Failed to load keywords: ${keywordError.message}`);

  const scoped = (keywordRows || []).filter((row) =>
    keywordRowMatchesScope(row, countryName, categoryName)
  );
  const existingPhrases = uniqueKeywords(
    scoped.flatMap((row) => parseKeywordList(row.keywords ?? row.keyword ?? row.title ?? row.name))
  );
  const merged = mergeKeywordImport(existingPhrases, prepared.keywords);
  const extrasAdded = merged.added.filter((item) => extraKeys.has(item.toLowerCase()));
  const pastedAdded = merged.added.filter((item) => !extraKeys.has(item.toLowerCase()));

  const existingId = String(scoped[0]?.id || '').trim() || undefined;
  const payload = {
    country: countryName,
    category: categoryName,
    keywords: merged.keywords,
    updated_date: new Date().toISOString(),
  };
  if (!existingId) {
    payload.id = randomUUID();
    payload.created_date = payload.updated_date;
  }

  const saved = await saveRow(supabase, 'keywords', payload, existingId);
  if (saved.error) throw new Error(`Failed to save keywords: ${saved.error.message}`);

  const extraIds = scoped
    .slice(1)
    .map((row) => String(row.id || '').trim())
    .filter(Boolean);
  if (extraIds.length > 0) {
    const { error: cleanupError } = await supabase.from('keywords').delete().in('id', extraIds);
    if (cleanupError) {
      console.warn(`Could not remove extra scoped keyword rows: ${cleanupError.message}`);
    }
  }

  const { data: verifyRows, error: verifyError } = await supabase
    .from('keywords')
    .select('*')
    .eq('country', countryName);
  if (verifyError) throw new Error(`Saved, but verify read failed: ${verifyError.message}`);

  const verified = (verifyRows || []).find((row) =>
    keywordRowMatchesScope(row, countryName, categoryName)
  );
  const verifiedPhrases = parseKeywordList(verified?.keywords ?? verified?.keyword);
  const sample = verifiedPhrases.slice(0, 8);

  return {
    ok: true,
    country: countryName,
    countryId: countryMatch?.id || null,
    countryCreated,
    category: categoryName,
    categoryId: categoryMatch?.id || null,
    categoryCreated,
    keywordRowId: saved.data?.id || existingId || null,
    keywordRowCreated: !existingId,
    pastedUnique: pasted.keywords.length,
    extrasPrepared: extras.keywords.length,
    extrasUniqueVsPasted: extrasUniqueToImport.length,
    uniqueReadyToImport: prepared.keywords.length,
    added: merged.added.length,
    pastedAdded: pastedAdded.length,
    extrasAdded: extrasAdded.length,
    extrasAddedSample: extrasAdded.slice(0, 12),
    skippedDuplicates: merged.skippedDuplicates,
    skippedJunk: [...new Set([...pasted.skippedJunk, ...extras.skippedJunk])],
    totalForScope: merged.keywords.length,
    verifiedCount: verifiedPhrases.length,
    sample,
  };
}
