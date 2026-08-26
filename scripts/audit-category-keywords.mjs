/**
 * Audit categories vs keyword coverage in Supabase.
 * Usage: node scripts/audit-category-keywords.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { FIRST_COUNTRY_SCOPES, REMAINING_SCOPES } from './lib/keyword-universe.mjs';

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

function countKeywords(value) {
  if (Array.isArray(value)) return value.length;
  if (typeof value !== 'string' || !value.trim()) return 0;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.length;
  } catch {
    /* fall through */
  }
  return value.split(/[,;\n]+/).map((part) => part.trim()).filter(Boolean).length;
}

loadEnv();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Missing Supabase env');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const [{ data: cats, error: catError }, { data: kws, error: kwError }, { data: countries, error: countryError }] =
  await Promise.all([
    supabase.from('categories').select('*'),
    supabase.from('keywords').select('id,country,category,keywords'),
    supabase.from('countries').select('id,name,slug'),
  ]);

if (catError) throw new Error(catError.message);
if (kwError) throw new Error(kwError.message);
if (countryError) throw new Error(countryError.message);

const scopedFiles = [...FIRST_COUNTRY_SCOPES, ...REMAINING_SCOPES].map((scope) => ({
  country: scope.country,
  category: scope.category,
  file: scope.keywordFile,
}));

const kwIndex = new Map();
for (const row of kws || []) {
  const key = `${String(row.country || '').trim().toLowerCase()}||${String(row.category || '').trim().toLowerCase()}`;
  kwIndex.set(key, countKeywords(row.keywords));
}

const byCountry = {};
for (const cat of cats || []) {
  const country = String(cat.country || '(none)').trim() || '(none)';
  (byCountry[country] ||= []).push(cat);
}

const gaps = [];
const covered = [];
for (const [country, list] of Object.entries(byCountry).sort((a, b) => a[0].localeCompare(b[0]))) {
  for (const cat of list) {
    const name = String(cat.name || cat.title || '').trim();
    const key = `${country.toLowerCase()}||${name.toLowerCase()}`;
    const n = kwIndex.get(key) || 0;
    const row = {
      country,
      category: name,
      slug: cat.slug || '',
      status: cat.status || '',
      keywords: n,
      hasFile: scopedFiles.some(
        (scope) =>
          scope.country.toLowerCase() === country.toLowerCase() &&
          scope.category.toLowerCase() === name.toLowerCase()
      ),
    };
    if (n > 0) covered.push(row);
    else gaps.push(row);
  }
}

const countriesWithOneCategoryOnly = Object.entries(byCountry)
  .map(([country, list]) => ({ country, count: list.length, categories: list.map((c) => c.name || c.title) }))
  .filter((item) => item.count === 1);

console.log(
  JSON.stringify(
    {
      countryCount: (countries || []).length,
      categoryCount: (cats || []).length,
      keywordRowCount: (kws || []).length,
      coveredCount: covered.length,
      gapCount: gaps.length,
      gaps,
      countriesWithOneCategoryOnly,
      allByCountry: Object.fromEntries(
        Object.entries(byCountry)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([country, list]) => [
            country,
            list.map((cat) => {
              const name = String(cat.name || cat.title || '').trim();
              const key = `${country.toLowerCase()}||${name.toLowerCase()}`;
              return { category: name, slug: cat.slug || '', keywords: kwIndex.get(key) || 0 };
            }),
          ])
      ),
      keywordRows: (kws || []).map((row) => ({
        country: row.country,
        category: row.category,
        count: countKeywords(row.keywords),
      })),
    },
    null,
    2
  )
);
