/**
 * Temporary diagnostic: list countries, categories, and keyword counts.
 * Safe to delete after the import pass.
 */
import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

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

function normalize(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function pickName(row, keys) {
  for (const key of keys) {
    const value = normalize(String(row?.[key] ?? ''));
    if (value) return value;
  }
  return '';
}

function parseKeywordList(value) {
  if (Array.isArray(value)) return value.map((item) => normalize(String(item))).filter(Boolean);
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map((item) => normalize(String(item))).filter(Boolean);
  } catch {
    // fall through
  }
  return value.split(/[,;\n]+/).map(normalize).filter(Boolean);
}

function isPublished(row) {
  const status = pickName(row, ['status', 'visibility', 'publish_status']).toLowerCase();
  if (!status) return true;
  return !['draft', 'unpublished', 'deleted', 'archived', 'private', 'admin-only', 'admin only', 'hidden'].includes(
    status
  );
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const [countriesRes, categoriesRes, keywordsRes] = await Promise.all([
  supabase.from('countries').select('*'),
  supabase.from('categories').select('*'),
  supabase.from('keywords').select('*'),
]);

if (countriesRes.error) throw new Error(countriesRes.error.message);
if (categoriesRes.error) throw new Error(categoriesRes.error.message);
if (keywordsRes.error) throw new Error(keywordsRes.error.message);

const countries = (countriesRes.data || []).map((row) => ({
  id: row.id,
  name: pickName(row, ['name', 'title', 'country']),
  published: isPublished(row),
  status: pickName(row, ['status', 'visibility', 'publish_status']) || '(empty)',
}));

const categories = (categoriesRes.data || []).map((row) => ({
  id: row.id,
  name: pickName(row, ['name', 'title', 'category']),
  country: pickName(row, ['country']),
  published: isPublished(row),
  status: pickName(row, ['status', 'visibility', 'publish_status']) || '(empty)',
}));

const keywordRows = (keywordsRes.data || []).map((row) => {
  const phrases = parseKeywordList(row.keywords ?? row.keyword ?? row.title ?? row.name);
  const unique = [];
  const seen = new Set();
  for (const phrase of phrases) {
    const key = phrase.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(phrase);
  }
  return {
    id: row.id,
    country: pickName(row, ['country']),
    category: pickName(row, ['category']),
    count: unique.length,
  };
});

console.log(
  JSON.stringify(
    {
      countries,
      categories,
      keywordRows,
      totals: {
        countries: countries.length,
        publishedCountries: countries.filter((item) => item.published).length,
        categories: categories.length,
        publishedCategories: categories.filter((item) => item.published).length,
        keywordRows: keywordRows.length,
        phrases: keywordRows.reduce((sum, row) => sum + row.count, 0),
      },
    },
    null,
    2
  )
);
