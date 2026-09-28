/**
 * Recover tour cover images that were overwritten with Unsplash stock photos.
 * Copies `/api/media/` (or `/cms-media/`) URLs from sibling image columns when found.
 *
 *   node scripts/restore-tour-upload-images.mjs           # dry-run
 *   node scripts/restore-tour-upload-images.mjs --execute # apply
 */
import { Pool } from 'pg';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const EXECUTE = process.argv.includes('--execute');

const IMAGE_COLUMNS = [
  'image_url',
  'image',
  'cover_image',
  'featured_image',
  'social_image_url',
  'thumbnail',
  'photo',
  'banner',
];

const CMS_MEDIA_RE = /\/(?:api\/media|cms-media)\/([a-f0-9]{32})/i;
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
  const text = String(value).trim();
  const match = text.match(CMS_MEDIA_RE);
  if (!match) return null;
  return `/api/media/${match[1].toLowerCase()}`;
}

function isStockReplacement(value) {
  if (value == null) return true;
  const text = String(value).trim();
  if (!text) return true;
  return UNSPLASH_RE.test(text);
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
    const { rows: colRows } = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tours'`
    );
    const cols = new Set(colRows.map((r) => r.column_name));
    const imageCols = IMAGE_COLUMNS.filter((c) => cols.has(c));
    if (!imageCols.length) {
      console.error('tours table has no image columns');
      process.exit(1);
    }

    const primary = cols.has('image_url') ? 'image_url' : imageCols[0];
    const selectSql = ['id', 'title', ...imageCols].map((c) => `"${c}"`).join(', ');
    const { rows } = await client.query(`SELECT ${selectSql} FROM tours ORDER BY id`);

    let candidates = 0;
    let restored = 0;

    for (const row of rows) {
      const current = row[primary];
      if (!isStockReplacement(current)) continue;

      let recovery = null;
      for (const col of imageCols) {
        if (col === primary) continue;
        const found = cmsMediaUrl(row[col]);
        if (found) {
          recovery = found;
          break;
        }
      }
      if (!recovery) continue;

      candidates += 1;
      const label = row.title || row.id;
      console.log(`[tours] id=${row.id} ${label}: ${primary} -> ${recovery}`);
      if (EXECUTE) {
        await client.query(`UPDATE tours SET "${primary}" = $1 WHERE id = $2`, [recovery, row.id]);
        if (cols.has('social_image_url') && isStockReplacement(row.social_image_url)) {
          await client.query(`UPDATE tours SET social_image_url = $1 WHERE id = $2`, [recovery, row.id]);
        }
        restored += 1;
      }
    }

    console.log(
      `\nrestore-tour-upload-images — ${EXECUTE ? 'EXECUTE' : 'DRY-RUN'}: ${candidates} tour(s) can be restored` +
        (EXECUTE ? `, ${restored} updated` : '')
    );
    if (!EXECUTE && candidates) console.log('Re-run with --execute to apply.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
