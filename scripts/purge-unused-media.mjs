/**
 * Remove rows from Aiven `media_files` that are not referenced anywhere in CMS content.
 *
 *   node scripts/purge-unused-media.mjs              # dry-run (report only)
 *   node scripts/purge-unused-media.mjs --execute    # DELETE unused blobs
 *
 * Requires DATABASE_URL in .env.local
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import pg from 'pg';

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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

const MEDIA_ID_RE = /\/api\/media\/([a-f0-9]{32})/gi;
const CMS_MEDIA_ID_RE = /\/cms-media\/([a-f0-9]{32})/gi;

const CONTENT_TABLES = [
  'tours',
  'safari_updates',
  'countries',
  'categories',
  'national_park',
  'accommodations',
  'explore',
  'pages',
  'landing_pages',
  'keywords',
  'reviews',
];

function collectIdsFromValue(value, into) {
  if (value == null) return;
  if (typeof value === 'string') {
    for (const re of [MEDIA_ID_RE, CMS_MEDIA_ID_RE]) {
      re.lastIndex = 0;
      let match;
      while ((match = re.exec(value))) {
        into.add(match[1].toLowerCase());
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectIdsFromValue(item, into));
    return;
  }
  if (typeof value === 'object') {
    Object.values(value).forEach((item) => collectIdsFromValue(item, into));
  }
}

function collectStaticHeroReferences(into) {
  const root = process.cwd();
  const heroes = join(root, 'public', 'heroes');
  if (!existsSync(heroes)) return;
  for (const name of readdirSync(heroes)) {
    into.add(`/heroes/${name}`);
  }
  into.add('/eton-safaris-gorilla.png');
}

loadEnv();
const execute = process.argv.includes('--execute');
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const referenced = new Set();

try {
  await pool.query('SET statement_timeout = 120000');
  const { rows: mediaRows } = await pool.query('SELECT id FROM media_files');
  const allIds = mediaRows.map((row) => String(row.id).toLowerCase());

  for (const table of CONTENT_TABLES) {
    try {
      const { rows } = await pool.query(`SELECT * FROM ${table}`);
      for (const row of rows) {
        collectIdsFromValue(row, referenced);
      }
      console.log(`Scanned ${table}: ${rows.length} rows`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/does not exist/i.test(message)) {
        console.warn(`Skip missing table: ${table}`);
      } else {
        console.warn(`Skip ${table}:`, message);
      }
    }
  }

  const unused = allIds.filter((id) => !referenced.has(id));
  console.log(
    JSON.stringify(
      {
        mediaFilesTotal: allIds.length,
        referencedInCms: referenced.size,
        unusedCount: unused.length,
        sampleUnused: unused.slice(0, 12),
        mode: execute ? 'EXECUTE_DELETE' : 'dry-run',
      },
      null,
      2
    )
  );

  if (execute && unused.length) {
    const chunk = 100;
    for (let i = 0; i < unused.length; i += chunk) {
      const slice = unused.slice(i, i + chunk);
      await pool.query('DELETE FROM media_files WHERE id = ANY($1::varchar[])', [slice]);
    }
    console.log(`Deleted ${unused.length} unused media_files rows.`);
  } else if (!execute && unused.length) {
    console.log('Run with --execute to delete unused media_files from Aiven.');
  }
} finally {
  await pool.end();
}
