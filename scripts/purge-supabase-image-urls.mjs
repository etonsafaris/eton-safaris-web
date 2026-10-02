/**
 * Remove Base44 + Supabase Storage URLs from Aiven PostgreSQL.
 * With --migrate, downloads Supabase files into `media_files` and rewrites to `/api/media/{id}`.
 * Base44 URLs are always cleared (never re-hosted).
 *
 *   node scripts/purge-supabase-image-urls.mjs                    # dry-run
 *   node scripts/purge-supabase-image-urls.mjs --execute          # clear / replace
 *   node scripts/purge-supabase-image-urls.mjs --execute --migrate # Supabase → Aiven bytes
 */
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { Pool } from 'pg';

const EXECUTE = process.argv.includes('--execute');
const MIGRATE = process.argv.includes('--migrate');

const SUPABASE_RE = /supabase\.co\/storage/i;
const BASE44_RE = /media\.base44\.com|\.base44\.com/i;
const LEGACY_RE = /supabase\.co\/storage|media\.base44\.com|\.base44\.com/i;

const LEGACY_URL_RE =
  /https?:\/\/[^\s"'<>]*(?:supabase\.co\/storage|media\.base44\.com|[^\s"'<>]*\.base44\.com)[^\s"'<>]*/gi;

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

const HTML_COLUMNS = ['description', 'content', 'body', 'excerpt', 'summary', 'blocks', 'itinerary'];

const CONTENT_TABLES = [
  'tours',
  'categories',
  'national_park',
  'national_parks',
  'parks',
  'accommodations',
  'explore',
  'safari_updates',
  'countries',
  'pages',
  'landing_pages',
  'bookings',
  'quotations_inquiries',
  'reviews',
  'keywords',
];

const MEDIA_CREATE_SQL = `
CREATE TABLE IF NOT EXISTS media_files (
  id VARCHAR(40) PRIMARY KEY,
  filename TEXT,
  mime TEXT NOT NULL,
  bytes BYTEA NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
)
`;

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

function isSupabaseUrl(value) {
  return value != null && SUPABASE_RE.test(String(value));
}

function isBase44Url(value) {
  return value != null && BASE44_RE.test(String(value));
}

function isLegacyUrl(value) {
  return value != null && LEGACY_RE.test(String(value));
}

function isAivenMediaPath(value) {
  const text = String(value || '').trim().split('?')[0];
  return /^\/(?:api\/media|cms-media)\/[a-f0-9]{32}$/i.test(text);
}

function normalizeMediaPath(value) {
  const match = String(value || '').trim().match(/\/(?:api\/media|cms-media)\/([a-f0-9]{32})/i);
  return match ? `/api/media/${match[1].toLowerCase()}` : null;
}

function pickAivenFallback(row, skipColumn) {
  for (const col of IMAGE_COLUMNS) {
    if (col === skipColumn || row[col] == null) continue;
    const path = normalizeMediaPath(row[col]);
    if (path) return path;
  }
  return null;
}

async function ensureMediaTable(client) {
  await client.query(MEDIA_CREATE_SQL);
}

async function importToAiven(client, url, cache) {
  const key = String(url).trim();
  if (cache.has(key)) return cache.get(key);

  if (!MIGRATE || isBase44Url(key)) {
    cache.set(key, null);
    return null;
  }

  try {
    const response = await fetch(key, { redirect: 'follow' });
    if (!response.ok) {
      cache.set(key, null);
      return null;
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length < 1) {
      cache.set(key, null);
      return null;
    }
    const id = randomBytes(16).toString('hex');
    const mime = response.headers.get('content-type')?.split(';')[0]?.trim() || 'image/jpeg';
    const filename = key.split('/').pop()?.split('?')[0] || `${id}.jpg`;
    await client.query('INSERT INTO media_files (id, filename, mime, bytes) VALUES ($1, $2, $3, $4)', [
      id,
      filename,
      mime,
      bytes,
    ]);
    const path = `/api/media/${id}`;
    cache.set(key, path);
    return path;
  } catch {
    cache.set(key, null);
    return null;
  }
}

async function resolveReplacement(client, row, column, value, cache) {
  if (isSupabaseUrl(value)) {
    const migrated = await importToAiven(client, value, cache);
    if (migrated) return migrated;
  }
  const fallback = pickAivenFallback(row, column);
  if (fallback) return fallback;
  return null;
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

async function scrubMediaFilenames(client) {
  if (!(await tableExists(client, 'media_files'))) return 0;
  const { rows } = await client.query(
    `SELECT id, filename FROM media_files WHERE filename IS NOT NULL AND (filename ILIKE '%supabase%' OR filename ILIKE '%base44%')`
  );
  for (const row of rows) {
    console.log(`[media_files] id=${row.id} filename cleared (was legacy URL)`);
    if (EXECUTE) {
      await client.query(`UPDATE media_files SET filename = $1 WHERE id = $2`, [`${row.id}.jpg`, row.id]);
    }
  }
  return rows.length;
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
  const cache = new Map();

  try {
    if (MIGRATE) await ensureMediaTable(client);

    let totalFields = 0;
    let totalHtml = 0;

    for (const table of CONTENT_TABLES) {
      if (!(await tableExists(client, table))) continue;
      const cols = await existingColumns(client, table);
      const imageCols = IMAGE_COLUMNS.filter((c) => cols.has(c));
      const htmlCols = HTML_COLUMNS.filter((c) => cols.has(c));
      if (!imageCols.length && !htmlCols.length) continue;

      const selectCols = ['id', ...new Set([...imageCols, ...htmlCols])];
      const { rows } = await client.query(
        `SELECT ${selectCols.map((c) => `"${c}"`).join(', ')} FROM "${table}"`
      );

      for (const row of rows) {
        const patch = {};

        for (const col of imageCols) {
          const value = row[col];
          if (!isLegacyUrl(value)) continue;
          totalFields += 1;
          const replacement = await resolveReplacement(client, row, col, value, cache);
          patch[col] = replacement;
          const label = isBase44Url(value) ? 'Base44' : 'Supabase';
          console.log(
            `[${table}] id=${row.id} ${col} (${label}): ${String(value).slice(0, 72)}… → ${replacement || '(cleared)'}`
          );
        }

        for (const col of htmlCols) {
          const raw = row[col];
          if (raw == null || !LEGACY_RE.test(String(raw))) continue;
          let rebuilt = String(raw);
          const urls = [...new Set(rebuilt.match(LEGACY_URL_RE) || [])];
          if (!urls.length) continue;
          totalHtml += urls.length;
          if (MIGRATE) {
            for (const match of urls) {
              const replacement = await importToAiven(client, match, cache);
              rebuilt = rebuilt.split(match).join(replacement || '');
            }
          } else {
            rebuilt = rebuilt.replace(LEGACY_URL_RE, '');
          }
          patch[col] = rebuilt;
          console.log(`[${table}] id=${row.id} ${col}: scrubbed ${urls.length} legacy CDN URL(s)`);
        }

        if (!Object.keys(patch).length) continue;
        if (!EXECUTE) continue;

        const sets = Object.keys(patch).map((c, i) => `"${c}" = $${i + 1}`);
        await client.query(`UPDATE "${table}" SET ${sets.join(', ')} WHERE id = $${sets.length + 1}`, [
          ...Object.values(patch),
          row.id,
        ]);
      }
    }

    const mediaFilenameRows = await scrubMediaFilenames(client);

    console.log(
      `\npurge-legacy-media-urls — ${EXECUTE ? 'EXECUTE' : 'DRY-RUN'}${MIGRATE ? ' + MIGRATE (Supabase only)' : ''}: ` +
        `${totalFields} image field(s), ${totalHtml} HTML embed(s), ${mediaFilenameRows} media_files filename(s).`
    );
    if (!EXECUTE) {
      console.log('Re-run with --execute (add --migrate to copy Supabase files into Aiven media_files).');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
