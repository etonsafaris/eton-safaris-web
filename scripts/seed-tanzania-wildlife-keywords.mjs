/**
 * Import traveler-intent wildlife / safari keywords for Tanzania.
 *
 * Links phrases to:
 *   country  = Tanzania (countries.name)
 *   category = Tanzania Wildlife Safaris (categories.name / title)
 *
 * Dedup/junk/merge logic matches lib/keyword-import.ts.
 *
 * Usage (from repo root, with .env.local present):
 *   node scripts/seed-tanzania-wildlife-keywords.mjs
 *   npm run seed:tanzania-wildlife-keywords
 *
 * Safe to re-run: existing phrases for the same country + category are skipped.
 */
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const TARGET_COUNTRY = 'Tanzania';
const TARGET_CATEGORY = 'Tanzania Wildlife Safaris';
const __dirname = dirname(fileURLToPath(import.meta.url));
const KEYWORD_FILE = resolve(__dirname, 'data/tanzania-wildlife-safari-keywords.txt');

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

function loadEnv() {
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

function normalizeKeywordPhrase(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function isJunkKeyword(value) {
  const phrase = normalizeKeywordPhrase(value);
  if (!phrase) return true;
  if (JUNK_PATTERNS.some((pattern) => pattern.test(phrase))) return true;
  if (/\bkenya\b/i.test(phrase) && /\bvictoria\s+falls\b/i.test(phrase) && !/\buganda\b/i.test(phrase)) {
    return true;
  }
  return false;
}

function uniqueKeywords(values) {
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

function parseKeywordList(value) {
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

function prepareKeywordImport(rawLines) {
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
  return { keywords: uniqueKeywords(kept), skippedJunk };
}

function mergeKeywordImport(existing, incoming) {
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

function readKeywordLines(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Keyword list file not found: ${filePath}`);
  }
  return readFileSync(filePath, 'utf8').split(/\r?\n/);
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

async function loadCountries() {
  const { data, error } = await supabase.from('countries').select('*');
  if (error) throw new Error(`Failed to load countries: ${error.message}`);
  return data || [];
}

async function loadCategories() {
  const { data, error } = await supabase.from('categories').select('*');
  if (error) throw new Error(`Failed to load categories: ${error.message}`);
  return data || [];
}

async function ensureTanzania(countries) {
  const match = findNamedRow(countries, TARGET_COUNTRY, ['name', 'title', 'country']);
  if (match) {
    return { row: match, created: false, name: pickName(match, ['name', 'title', 'country']) || TARGET_COUNTRY };
  }

  const inserted = await saveRow(supabase, 'countries', {
    id: randomUUID(),
    name: TARGET_COUNTRY,
    slug: 'tanzania',
    tagline: 'Serengeti, Ngorongoro, and Kilimanjaro',
  });
  if (inserted.error) {
    throw new Error(`Tanzania country row is missing and could not be created: ${inserted.error.message}`);
  }
  return { row: inserted.data, created: true, name: TARGET_COUNTRY };
}

async function ensureCategory(categories, countryName) {
  const tanzaniaRows = categories.filter((row) => {
    const country = pickName(row, ['country']);
    return !country || country.toLowerCase() === countryName.toLowerCase();
  });
  const match =
    findNamedRow(tanzaniaRows, TARGET_CATEGORY, ['name', 'title', 'category']) ||
    findNamedRow(categories, TARGET_CATEGORY, ['name', 'title', 'category']);

  if (match) {
    return {
      row: match,
      created: false,
      name: pickName(match, ['name', 'title', 'category']) || TARGET_CATEGORY,
    };
  }

  const inserted = await saveRow(supabase, 'categories', {
    id: randomUUID(),
    name: TARGET_CATEGORY,
    title: TARGET_CATEGORY,
    slug: 'tanzania-wildlife-safaris',
    country: countryName,
    description: 'Wildlife safari tours across Tanzania national parks, including Serengeti, Ngorongoro, and the southern circuit.',
  });
  if (inserted.error) {
    throw new Error(
      `"${TARGET_CATEGORY}" category is missing and could not be created: ${inserted.error.message}`
    );
  }
  return { row: inserted.data, created: true, name: TARGET_CATEGORY };
}

async function main() {
  const pastedLines = readKeywordLines(KEYWORD_FILE);
  const prepared = prepareKeywordImport(pastedLines);
  if (prepared.keywords.length === 0) {
    throw new Error('No importable keywords after normalize/junk filters.');
  }

  const [countries, categories] = await Promise.all([loadCountries(), loadCategories()]);
  const country = await ensureTanzania(countries);
  const category = await ensureCategory(categories, country.name);

  const { data: keywordRows, error: keywordError } = await supabase.from('keywords').select('*');
  if (keywordError) throw new Error(`Failed to load keywords: ${keywordError.message}`);

  const scoped = (keywordRows || []).filter((row) =>
    keywordRowMatchesScope(row, country.name, category.name)
  );
  const existingPhrases = uniqueKeywords(
    scoped.flatMap((row) => parseKeywordList(row.keywords ?? row.keyword ?? row.title ?? row.name))
  );
  const merged = mergeKeywordImport(existingPhrases, prepared.keywords);

  const existingId = String(scoped[0]?.id || '').trim() || undefined;
  const payload = {
    country: country.name,
    category: category.name,
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
    .eq('country', country.name);
  if (verifyError) throw new Error(`Saved, but verify read failed: ${verifyError.message}`);

  const verified = (verifyRows || []).find((row) => keywordRowMatchesScope(row, country.name, category.name));
  const verifiedPhrases = parseKeywordList(verified?.keywords ?? verified?.keyword);
  const sample = verifiedPhrases.slice(0, 8);

  console.log(
    JSON.stringify(
      {
        ok: true,
        country: country.name,
        countryId: country.row?.id || null,
        countryCreated: country.created,
        category: category.name,
        categoryId: category.row?.id || null,
        categoryCreated: category.created,
        keywordRowId: saved.data?.id || existingId || null,
        keywordRowCreated: !existingId,
        uniqueReadyToImport: prepared.keywords.length,
        added: merged.added.length,
        skippedDuplicates: merged.skippedDuplicates,
        skippedJunk: prepared.skippedJunk,
        totalForScope: merged.keywords.length,
        verifiedCount: verifiedPhrases.length,
        sample,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
