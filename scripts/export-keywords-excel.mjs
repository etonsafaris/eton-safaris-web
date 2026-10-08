/**
 * Export saved SEO keywords: one folder per country, one .xlsx per tour category (no hyperlinks).
 *
 * Usage: node scripts/export-keywords-excel.mjs
 * Output: exports/keywords-by-country/{country-slug}/{category-slug}.xlsx
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import * as XLSX from 'xlsx';
import { parseEnvFile } from './lib/parse-env-file.mjs';
import {
  dedupeAndSortKeywordEntries,
  parseKeywordEntries,
} from './lib/keyword-export-metrics.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const OUT_ROOT = resolve(scriptDir, '..', 'exports', 'keywords-by-country');
const PUBLIC_ROOT = resolve(scriptDir, '..', 'public', 'downloads', 'keywords-by-country');

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function pickString(row, keys) {
  for (const key of keys) {
    const v = row?.[key];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return '';
}

function mergeKeywordEntries(existing, incoming) {
  const normalizedExisting = existing.map((item, index) =>
    typeof item === 'string'
      ? { keyword: item, intent: null, volume: null, rankIndex: index }
      : { ...item, rankIndex: item.rankIndex ?? index }
  );
  const start = normalizedExisting.length;
  const normalizedIncoming = incoming.map((item, index) => ({
    ...item,
    rankIndex: item.rankIndex ?? start + index,
  }));
  return dedupeAndSortKeywordEntries([...normalizedExisting, ...normalizedIncoming]);
}

function groupKeywordRows(rows) {
  const groups = new Map();
  for (const row of rows) {
    const country = pickString(row, ['country']) || 'Other';
    const category = pickString(row, ['category']) || 'Uncategorized';
    const scope = `${country.toLowerCase()}::${category.toLowerCase()}`;
    const current = groups.get(scope) || { country, category, keywords: [] };
    const incoming = parseKeywordEntries(row.keywords ?? row.keyword ?? row.title ?? row.name);
    current.keywords = mergeKeywordEntries(current.keywords, incoming);
    groups.set(scope, current);
  }
  return [...groups.values()].filter((g) => g.keywords.length > 0);
}

async function loadKeywordRows(pool) {
  const columnSets = [
    'id, keywords, keyword, country, category',
    'id, keywords, country, category',
    'id, keyword, country, category',
  ];
  let lastError;
  for (const cols of columnSets) {
    try {
      const res = await pool.query(`SELECT ${cols} FROM keywords ORDER BY country NULLS LAST, category NULLS LAST`);
      return res.rows || [];
    } catch (error) {
      lastError = error;
      if (error?.code !== '42703') throw error;
    }
  }
  throw lastError;
}

function writeCategoryWorkbook(filePath, country, category, keywords) {
  const sorted = dedupeAndSortKeywordEntries(
    keywords.map((item) =>
      typeof item === 'string'
        ? { keyword: item, intent: null, volume: null, rankIndex: 0 }
        : item
    )
  );
  const header = ['#', 'Keyword', 'Intent', 'Volume', 'Country', 'Category'];
  const rows = sorted.map((item, index) => [
    index + 1,
    item.keyword,
    item.intent,
    item.volume,
    country,
    category,
  ]);
  const sheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
  sheet['!cols'] = [{ wch: 6 }, { wch: 56 }, { wch: 14 }, { wch: 10 }, { wch: 18 }, { wch: 36 }];
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Keywords');
  const buffer = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' });
  writeFileSync(filePath, buffer);
}

function writeIndexHtml(countryManifest) {
  const sections = countryManifest
    .map((entry) => {
      const files = entry.files
        .map(
          (f) =>
            `      <li><a href="${entry.slug}/${f.file}">${f.category}</a> <span class="muted">(${f.count} keywords)</span></li>`
        )
        .join('\n');
      return `  <section>
    <h2>${entry.country}</h2>
    <ul>
${files}
    </ul>
  </section>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Keywords by country — Excel downloads</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 48rem; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
    h1 { font-size: 1.5rem; }
    h2 { font-size: 1.15rem; margin-top: 1.5rem; }
    ul { padding-left: 1.25rem; }
    a { color: #1f6b3a; font-weight: 600; }
    .muted { color: #666; font-weight: 400; }
  </style>
</head>
<body>
  <h1>SEO keywords by country</h1>
  <p>One Excel file per tour category inside each country folder. Sorted by <strong>Volume</strong> (highest first). Columns: Keyword, Intent, Volume.</p>
${sections}
  <p class="muted">Regenerate: <code>npm run keywords:export-excel</code></p>
</body>
</html>`;
}

async function main() {
  const envPath = resolve(scriptDir, '..', '.env.local');
  if (!existsSync(envPath)) {
    console.error('Missing .env.local (DATABASE_URL required).');
    process.exit(1);
  }
  const env = parseEnvFile(envPath);
  const url = String(env.DATABASE_URL || '').trim();
  if (!url) {
    console.error('DATABASE_URL is empty in .env.local');
    process.exit(1);
  }

  const pool = new pg.Pool({
    connectionString: url.replace(/[?&]sslmode=\w+/g, ''),
    ssl: { rejectUnauthorized: false },
    max: 1,
  });

  let rawRows;
  try {
    rawRows = await loadKeywordRows(pool);
  } finally {
    await pool.end();
  }

  const groups = groupKeywordRows(rawRows);
  mkdirSync(OUT_ROOT, { recursive: true });
  mkdirSync(PUBLIC_ROOT, { recursive: true });

  const byCountry = new Map();
  for (const group of groups) {
    const countrySlug = slugify(group.country) || 'other';
    if (!byCountry.has(countrySlug)) {
      byCountry.set(countrySlug, { country: group.country, slug: countrySlug, files: [] });
    }
    const countryDir = resolve(OUT_ROOT, countrySlug);
    const publicCountryDir = resolve(PUBLIC_ROOT, countrySlug);
    mkdirSync(countryDir, { recursive: true });
    mkdirSync(publicCountryDir, { recursive: true });

    const baseName = `${slugify(group.category) || 'category'}-keywords.xlsx`;
    let fileName = baseName;
    let n = 2;
    while (byCountry.get(countrySlug).files.some((f) => f.file === fileName)) {
      fileName = `${slugify(group.category) || 'category'}-keywords-${n}.xlsx`;
      n += 1;
    }

    const outPath = resolve(countryDir, fileName);
    const publicPath = resolve(publicCountryDir, fileName);
    writeCategoryWorkbook(outPath, group.country, group.category, group.keywords);
    const rowCount = group.keywords.length;
    writeFileSync(publicPath, readFileSync(outPath));

    byCountry.get(countrySlug).files.push({
      file: fileName,
      category: group.category,
      count: rowCount,
    });
    console.log(`Wrote ${countrySlug}/${fileName} (${rowCount} keywords)`);
  }

  const manifest = [...byCountry.values()].sort((a, b) => a.country.localeCompare(b.country));
  const indexHtml = writeIndexHtml(manifest);
  writeFileSync(resolve(OUT_ROOT, 'index.html'), indexHtml);
  writeFileSync(resolve(PUBLIC_ROOT, 'index.html'), indexHtml);

  const totalKeywords = groups.reduce((sum, g) => sum + g.keywords.length, 0);
  console.log('');
  console.log(`Done — ${manifest.length} countries, ${groups.length} category files, ${totalKeywords} keywords.`);
  console.log(`Folder: ${OUT_ROOT}`);
  console.log(`Web:    /downloads/keywords-by-country/`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
