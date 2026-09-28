/**
 * Point `image_url` (and matching `social_image_url`) at Aiven `/api/media/` paths
 * already stored on the same row (tours, countries, categories).
 *
 *   node scripts/restore-aiven-primary-images.mjs           # dry-run
 *   node scripts/restore-aiven-primary-images.mjs --execute # apply
 */
import { Pool } from 'pg';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const EXECUTE = process.argv.includes('--execute');

const TABLES = [
  { table: 'tours', nameKey: 'title' },
  { table: 'countries', nameKey: 'name' },
  { table: 'categories', nameKey: 'name' },
];

const IMAGE_COLUMNS = [
  'image_url',
  'image',
  'cover_image',
  'featured_image',
  'social_image_url',
  'thumbnail',
  'photo',
  'banner',
  'picture',
];

const CMS_MEDIA_RE = /\/(?:api\/media|cms-media)\/([a-f0-9]{32})/i;
const SUPABASE_RE = /supabase\.co\/storage/i;
const UNSPLASH_RE = /images\.unsplash\.com/i;

function loadEnv() {
  for (const filename of ['.env.local', '.env']) {
    const file = resolve(process.cwd(), filename);
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const index = trimmed.indexOf('=');
      if (index < 0) continue;
      const key = trimmed.slice(0, index).trim();
      let value = trimmed.slice(index + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
    if (process.env.DATABASE_URL) return;
  }
}

function cmsMediaUrl(value) {
  if (value == null) return null;
  const match = String(value).trim().match(CMS_MEDIA_RE);
  if (!match) return null;
  return `/api/media/${match[1].toLowerCase()}`;
}

function findAivenOnRow(row, imageCols) {
  for (const col of imageCols) {
    const found = cmsMediaUrl(row[col]);
    if (found) return found;
  }
  return null;
}

function primaryNeedsAiven(value, target) {
  const current = cmsMediaUrl(value);
  if (current === target) return false;
  if (value == null || !String(value).trim()) return true;
  const text = String(value).trim();
  if (SUPABASE_RE.test(text)) return true;
  if (UNSPLASH_RE.test(text)) return true;
  if (!current) return true;
  return current !== target;
}

async function tableExists(client, table) {
  const { rows } = await client.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1 LIMIT 1`,
    [table]
  );
  return rows.length > 0;
}

async function existingColumns(client, table) {
  const { rows } = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
    [table]
  );
  return new Set(rows.map((r) => r.column_name));
}

async function restoreTable(client, { table, nameKey }) {
  if (!(await tableExists(client, table))) {
    console.log(`[skip] ${table}: table not found`);
    return { candidates: 0, updated: 0 };
  }

  const cols = await existingColumns(client, table);
  const imageCols = IMAGE_COLUMNS.filter((c) => cols.has(c));
  if (!imageCols.length) {
    console.log(`[skip] ${table}: no image columns`);
    return { candidates: 0, updated: 0 };
  }

  const primary = cols.has('image_url') ? 'image_url' : imageCols[0];
  const selectKeys = ['id', nameKey, ...imageCols].filter((k) => cols.has(k) || k === 'id');
  const selectSql = [...new Set(selectKeys)].map((c) => `"${c}"`).join(', ');
  const { rows } = await client.query(`SELECT ${selectSql} FROM "${table}" ORDER BY id`);

  let candidates = 0;
  let updated = 0;

  for (const row of rows) {
    const aiven = findAivenOnRow(row, imageCols);
    if (!aiven) continue;
    if (!primaryNeedsAiven(row[primary], aiven)) continue;

    candidates += 1;
    const label = row[nameKey] || row.title || row.id;
    console.log(`[${table}] id=${row.id} ${label}: ${primary} -> ${aiven}`);

    if (!EXECUTE) continue;

    await client.query(`UPDATE "${table}" SET "${primary}" = $1 WHERE id = $2`, [aiven, row.id]);
    if (cols.has('social_image_url') && primaryNeedsAiven(row.social_image_url, aiven)) {
      await client.query(`UPDATE "${table}" SET social_image_url = $1 WHERE id = $2`, [aiven, row.id]);
    }
    updated += 1;
  }

  return { candidates, updated };
}

async function main() {
  loadEnv();
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error('DATABASE_URL missing in .env.local');
    process.exit(1);
  }

  process.env.NODE_TLS_REJECT_UNAUTHORIZED = process.env.NODE_TLS_REJECT_UNAUTHORIZED || '0';
  const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
  const client = await pool.connect();

  try {
    let totalCandidates = 0;
    let totalUpdated = 0;

    for (const spec of TABLES) {
      const report = await restoreTable(client, spec);
      totalCandidates += report.candidates;
      totalUpdated += report.updated;
      if (report.candidates) console.log(`  ${spec.table}: ${report.candidates} row(s)\n`);
    }

    console.log(
      `restore-aiven-primary-images — ${EXECUTE ? 'EXECUTE' : 'DRY-RUN'}: ${totalCandidates} row(s)` +
        (EXECUTE ? `, ${totalUpdated} updated` : '')
    );
    if (!EXECUTE && totalCandidates) console.log('Re-run with --execute to apply.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
