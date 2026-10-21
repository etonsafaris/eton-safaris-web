/**
 * Find /tours/{slug} hyperlinks in National Parks + Accommodations HTML,
 * check they still exist on Aiven, and replace missing slugs with a live package.
 *
 *   node scripts/repair-park-stay-tour-links.mjs
 *   node scripts/repair-park-stay-tour-links.mjs --execute
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';
import { parseEnvFile } from './lib/parse-env-file.mjs';

const { Pool } = pg;
const EXECUTE = process.argv.includes('--execute');

const ENV_FILE = resolve(import.meta.dirname, '..', '.env.local');
if (!existsSync(ENV_FILE)) {
  console.error('Missing .env.local');
  process.exit(1);
}
const env = parseEnvFile(ENV_FILE);
const url = String(env.DATABASE_URL || '').trim();
if (!url) {
  console.error('DATABASE_URL is empty in .env.local');
  process.exit(1);
}

function normalizePgUrl(raw) {
  return raw.replace(/[?&]sslmode=require\b/, '').replace(/[?&]sslmode=verify-full\b/, '');
}

const TOUR_HREF =
  /(?:https?:\/\/(?:www\.)?etonsafaris\.com)?\/tours\/([a-z0-9][a-z0-9-]*)/gi;

function extractTourSlugs(html) {
  const slugs = [];
  const seen = new Set();
  const text = String(html || '');
  for (const match of text.matchAll(TOUR_HREF)) {
    const slug = String(match[1] || '')
      .trim()
      .replace(/\/+$/, '')
      .toLowerCase();
    if (!slug || slug === 'compare' || seen.has(slug)) continue;
    seen.add(slug);
    slugs.push(slug);
  }
  return slugs;
}

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function publicSlug(row) {
  return String(row.seo_slug || row.slug || '')
    .trim()
    .replace(/^\//, '')
    .toLowerCase();
}

function countryKey(value) {
  return slugify(value).replace(/-safaris?$/, '');
}

function rewriteDeadLinks(html, replacements) {
  let next = String(html || '');
  for (const [dead, live] of replacements) {
    if (!dead || !live || dead === live) continue;
    const escaped = dead.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    next = next.replace(
      new RegExp(`((?:https?:\\/\\/(?:www\\.)?etonsafaris\\.com)?\\/tours\\/)${escaped}(?=["'?#\\s<]|$)`, 'gi'),
      `$1${live}`
    );
  }
  return next;
}

function pickReplacement(deadSlug, record, liveTours) {
  const country = countryKey(record.country);
  const parkHint = slugify(
    record.national_park_name || record.national_park || record.name || record.title || ''
  );
  const sameCountry = country
    ? liveTours.filter((tour) => countryKey(tour.country) === country)
    : [];
  const pool = sameCountry.length ? sameCountry : liveTours;
  const scored = pool
    .map((tour) => {
      const slug = publicSlug(tour);
      if (!slug) return null;
      let score = 0;
      if (parkHint) {
        const parkToken = parkHint.replace(/-national-park.*$/, '').slice(0, 24);
        if (parkToken && slug.includes(parkToken)) score += 10;
      }
      const deadBits = deadSlug.split('-').filter((part) => part.length > 4);
      const hits = deadBits.filter((part) => slug.includes(part)).length;
      score += Math.min(5, hits);
      return { slug, score, title: tour.title };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug));
  return scored[0] || null;
}

const pool = new Pool({
  connectionString: normalizePgUrl(url),
  ssl: { rejectUnauthorized: false },
  max: 1,
  connectionTimeoutMillis: 25_000,
});

try {
  const tables = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('national_park', 'national_parks', 'parks', 'accommodations')
  `);
  const present = new Set(tables.rows.map((row) => row.table_name));
  const sources = [];
  if (present.has('national_park')) sources.push({ table: 'national_park', kind: 'park' });
  else if (present.has('national_parks')) sources.push({ table: 'national_parks', kind: 'park' });
  else if (present.has('parks')) sources.push({ table: 'parks', kind: 'park' });
  if (present.has('accommodations')) sources.push({ table: 'accommodations', kind: 'stay' });

  const tourCols = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tours'
  `);
  const tourColNames = new Set(tourCols.rows.map((row) => row.column_name));
  const tourSelect = ['id', 'title', 'slug', 'seo_slug', 'country', 'status', 'published', 'is_published', 'post_type'].filter(
    (col) => tourColNames.has(col)
  );
  const slugWhere = tourColNames.has('seo_slug')
    ? `COALESCE(NULLIF(TRIM(seo_slug::text), ''), NULLIF(TRIM(slug::text), '')) IS NOT NULL`
    : `NULLIF(TRIM(slug::text), '') IS NOT NULL`;
  const toursRes = await pool.query(`
    SELECT ${tourSelect.join(', ')}
    FROM tours
    WHERE ${slugWhere}
  `);

  const liveTours = [];
  const liveSlugs = new Set();
  for (const row of toursRes.rows) {
    const slug = publicSlug(row);
    if (slug) liveSlugs.add(slug);
    if (row.slug) liveSlugs.add(String(row.slug).trim().toLowerCase());

    const status = String(row.status || '').toLowerCase();
    if (['draft', 'unpublished', 'hidden', 'archived', 'deleted'].includes(status)) continue;
    if (row.published === false || row.is_published === false) continue;
    const postType = String(row.post_type || '').toLowerCase();
    if (postType === 'google' || postType === 'google_only' || postType === 'google-only') continue;
    if (!slug) continue;
    liveTours.push(row);
  }
  console.log(`Tour slugs still in database: ${liveSlugs.size} (from ${toursRes.rowCount} rows)`);
  console.log(`Public packages available as replacements: ${liveTours.length}`);
  console.log(EXECUTE ? 'Mode: EXECUTE (writing replacements)\n' : 'Mode: dry-run (pass --execute to write)\n');

  let deadLinks = 0;
  let recordsTouched = 0;
  let replacementsWritten = 0;

  for (const source of sources) {
    const cols = await pool.query(
      `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
      `,
      [source.table]
    );
    const names = new Set(cols.rows.map((row) => row.column_name));
    const htmlCols = [
      'description',
      'content',
      'excerpt',
      'summary',
      'overview',
      'about',
      'body',
      'itinerary',
    ].filter((col) => names.has(col));
    const extra = ['name', 'title', 'slug', 'seo_slug', 'country', 'national_park_name', 'national_park'].filter(
      (col) => names.has(col)
    );
    if (!htmlCols.length) {
      console.log(`Skip ${source.table}: no HTML columns`);
      continue;
    }

    const select = ['id', ...extra, ...htmlCols].join(', ');
    const rows = await pool.query(`SELECT ${select} FROM ${source.table}`);
    console.log(`${source.kind} table ${source.table}: ${rows.rowCount} rows, scanning ${htmlCols.join(', ')}`);

    for (const row of rows.rows) {
      const replacements = new Map();
      const found = new Set();
      for (const col of htmlCols) {
        for (const slug of extractTourSlugs(row[col])) found.add(slug);
      }
      for (const slug of found) {
        if (liveSlugs.has(slug)) continue;
        const pick = pickReplacement(slug, row, liveTours);
        if (!pick) {
          console.log(`  ! no live replacement for /tours/${slug} in ${source.kind} ${row.slug || row.id}`);
          continue;
        }
        replacements.set(slug, pick.slug);
        deadLinks += 1;
        console.log(
          `  ${source.kind} ${row.slug || row.name || row.id}: /tours/${slug} → /tours/${pick.slug}`
        );
      }
      if (!replacements.size) continue;
      recordsTouched += 1;
      if (!EXECUTE) continue;

      const sets = [];
      const values = [];
      let i = 1;
      for (const col of htmlCols) {
        const next = rewriteDeadLinks(row[col], replacements);
        if (next === String(row[col] || '')) continue;
        sets.push(`${col} = $${i}`);
        values.push(next);
        i += 1;
      }
      if (!sets.length) continue;
      values.push(row.id);
      await pool.query(`UPDATE ${source.table} SET ${sets.join(', ')} WHERE id = $${i}`, values);
      replacementsWritten += replacements.size;
    }
  }

  console.log('\nSummary');
  console.log(`  dead tour links found: ${deadLinks}`);
  console.log(`  records needing update: ${recordsTouched}`);
  if (EXECUTE) console.log(`  links rewritten: ${replacementsWritten}`);
  else console.log('  no writes (dry-run)');
} catch (error) {
  console.error(error);
  process.exit(1);
} finally {
  await pool.end();
}
