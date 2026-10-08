/**
 * One unique Word article per keyword (country / category folders).
 * Reference layout: intro → package list → numbered sections → planning sections.
 * Hyperlinks: only to etonsafaris.com tour detail pages (never external reference URLs).
 *
 * Usage:
 *   node scripts/generate-keyword-articles.mjs --country uganda --limit 5
 *   node scripts/generate-keyword-articles.mjs --country uganda
 *   node scripts/generate-keyword-articles.mjs --all
 */
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { parseEnvFile } from './lib/parse-env-file.mjs';
import {
  dedupeAndSortKeywordEntries,
  parseKeywordEntries,
} from './lib/keyword-export-metrics.mjs';
import { factsForCountry } from './lib/country-safari-facts.mjs';
import { buildKeywordArticleDocument, writeKeywordArticleDoc } from './lib/keyword-article-builder.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUT = resolve(scriptDir, '..', 'exports', 'keyword-articles');
const DAV_SAFARI_OUT = resolve(
  'C:/Users/User/OneDrive/Desktop/Dav Safari/WESITE CONTENT/Keyword Articles'
);

function parseArgs(argv) {
  const args = { country: '', category: '', limit: 0, all: false, dav: true };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--all') args.all = true;
    else if (a === '--no-dav') args.dav = false;
    else if (a === '--country') args.country = String(argv[++i] || '').trim();
    else if (a === '--category') args.category = String(argv[++i] || '').trim();
    else if (a === '--limit') args.limit = Math.max(0, Number(argv[++i] || 0));
  }
  return args;
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 90);
}

function pickString(row, keys) {
  for (const key of keys) {
    const v = row?.[key];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return '';
}

const PUBLISHED = new Set(['published', 'publish', 'live', 'public', 'active', 'visible', 'released']);
const UNPUBLISHED = new Set(['draft', 'unpublished', 'deleted', 'archived', 'private', 'hidden']);

function isPublishedTour(row) {
  const status = pickString(row, ['status', 'publish_status']).toLowerCase();
  if (status) {
    if (PUBLISHED.has(status)) return true;
    if (UNPUBLISHED.has(status)) return false;
  }
  return true;
}

function tourTitle(row) {
  return pickString(row, ['title', 'name', 'post_title']) || 'Safari package';
}

function tourSlug(row) {
  const fromSlug = slugify(pickString(row, ['slug', 'seo_slug']));
  if (fromSlug) return fromSlug;
  return slugify(tourTitle(row)) || String(row.id || '');
}

async function loadKeywords(pool) {
  const columnSets = [
    'id, keywords, keyword, country, category',
    'id, keywords, country, category',
  ];
  for (const cols of columnSets) {
    try {
      const res = await pool.query(`SELECT ${cols} FROM keywords ORDER BY country, category`);
      return res.rows || [];
    } catch (error) {
      if (error?.code !== '42703') throw error;
    }
  }
  return [];
}

async function loadTours(pool) {
  const columnSets = [
    'id, title, slug, seo_slug, country',
    'id, title, slug, seo_slug, country, category',
  ];
  for (const cols of columnSets) {
    try {
      const res = await pool.query(`SELECT ${cols} FROM tours`);
      return (res.rows || []).filter(isPublishedTour);
    } catch (error) {
      if (error?.code !== '42703') throw error;
    }
  }
  return [];
}

function groupKeywords(rows) {
  const groups = new Map();
  for (const row of rows) {
    const country = pickString(row, ['country']) || 'Other';
    const category = pickString(row, ['category']) || 'Uncategorized';
    const scope = `${country.toLowerCase()}::${category.toLowerCase()}`;
    const incoming = parseKeywordEntries(row.keywords ?? row.keyword);
    const current = groups.get(scope) || { country, category, entries: [] };
    current.entries = dedupeAndSortKeywordEntries([...current.entries, ...incoming]);
    groups.set(scope, current);
  }
  return [...groups.values()];
}

function toursForCountry(allTours, countryLabel) {
  const needle = countryLabel.toLowerCase();
  const matched = allTours.filter((t) => pickString(t, ['country']).toLowerCase().includes(needle));
  return matched.length ? matched : allTours;
}

function writeIndex(manifestPath, sections) {
  const body = sections
    .map(
      (s) => `<section><h2>${s.country} — ${s.category}</h2><p>${s.count} articles in <code>${s.folder}</code></p></section>`
    )
    .join('\n');
  writeFileSync(
    manifestPath,
    `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Keyword articles</title></head><body><h1>Keyword articles</h1>${body}</body></html>`,
    'utf8'
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const envPath = resolve(scriptDir, '..', '.env.local');
  if (!existsSync(envPath)) {
    console.error('Missing .env.local');
    process.exit(1);
  }
  const env = parseEnvFile(envPath);
  const url = String(env.DATABASE_URL || '').trim();
  if (!url) {
    console.error('DATABASE_URL missing');
    process.exit(1);
  }

  const pool = new pg.Pool({
    connectionString: url.replace(/[?&]sslmode=\w+/g, ''),
    ssl: { rejectUnauthorized: false },
    max: 1,
  });

  let keywordRows;
  let tours;
  try {
    keywordRows = await loadKeywords(pool);
    tours = await loadTours(pool);
  } finally {
    await pool.end();
  }

  let groups = groupKeywords(keywordRows);
  if (args.country) {
    const needle = args.country.toLowerCase();
    groups = groups.filter((g) => g.country.toLowerCase().includes(needle) || slugify(g.country).includes(needle));
  }
  if (args.category) {
    const needle = args.category.toLowerCase();
    groups = groups.filter((g) => g.category.toLowerCase().includes(needle));
  }
  if (!groups.length) {
    console.error('No keyword groups matched filters.');
    process.exit(1);
  }

  const outRoots = [DEFAULT_OUT];
  if (args.dav) outRoots.push(DAV_SAFARI_OUT);

  const manifest = [];
  let totalWritten = 0;

  for (const group of groups) {
    if (!group.entries?.length) continue;
    const countrySlug = slugify(group.country) || 'other';
    const categorySlug = slugify(group.category) || 'category';
    const facts = factsForCountry(group.country);
    const countryTours = toursForCountry(tours, group.country).map((t) => ({
      title: tourTitle(t),
      slug: tourSlug(t),
    }));
    const usedTitles = new Set();
    const usedFiles = new Set();
    let keywords = group.entries;
    if (args.limit > 0) keywords = keywords.slice(0, args.limit);

    for (const entry of keywords) {
      const keyword = entry.keyword;
      let fileSlug = slugify(keyword) || `keyword-${totalWritten}`;
      let fileName = `${fileSlug}.docx`;
      let n = 2;
      while (usedFiles.has(fileName)) {
        fileName = `${fileSlug}-${n}.docx`;
        n += 1;
      }
      usedFiles.add(fileName);

      const { title, doc } = buildKeywordArticleDocument({
        keyword,
        country: group.country,
        category: group.category,
        allKeywordsInCategory: group.entries,
        tours: countryTours,
        facts,
        usedTitles,
      });

      for (const root of outRoots) {
        const dir = resolve(root, countrySlug, categorySlug);
        const filePath = resolve(dir, fileName);
        await writeKeywordArticleDoc(filePath, doc);
      }
      totalWritten += 1;
      if (totalWritten % 25 === 0) {
        console.log(`… ${totalWritten} articles (${group.country} / ${group.category})`);
      }
    }

    manifest.push({
      country: group.country,
      category: group.category,
      folder: `${countrySlug}/${categorySlug}`,
      count: keywords.length,
    });
    console.log(`Finished ${group.country} → ${group.category}: ${keywords.length} documents`);
  }

  for (const root of outRoots) {
    mkdirSync(root, { recursive: true });
    writeIndex(resolve(root, 'index.html'), manifest);
  }

  console.log('');
  console.log(`Done — ${totalWritten} Word articles.`);
  console.log(`Repo folder: ${DEFAULT_OUT}`);
  if (args.dav) console.log(`Dav Safari folder: ${DAV_SAFARI_OUT}`);
  if (!args.all && !args.country && args.limit === 0) {
    console.log('Tip: use --country uganda or --all to generate at scale.');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
