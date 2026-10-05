/**
 * Compare list-column strings to live Aiven columns (read-only).
 * Usage: node scripts/inspect-aiven-list-columns.mjs
 */
import pg from 'pg';
import { resolve } from 'node:path';
import { parseEnvFile } from './lib/parse-env-file.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const env = parseEnvFile(resolve(ROOT, '.env.local'));
const connectionString = String(env.DATABASE_URL || '').trim();
if (!connectionString) {
  console.error('DATABASE_URL missing in .env.local');
  process.exit(1);
}

/** Pass table → comma-separated columns (same shape as ADMIN_LIST_COLUMNS). */
const LIST_COLUMNS = process.argv[2] === '--from-file'
  ? null
  : {
      countries:
        'id,name,slug,seo_slug,tagline,image_url,social_image_url,is_popular,description_title,created_date,updated_date,seo_schema,meta_description',
      categories:
        'id,name,slug,seo_slug,country,image_url,social_image_url,description_title,created_date,updated_date,seo_schema,meta_description',
      tours:
        'id,title,slug,seo_slug,country,category,duration_days,duration_nights,duration_label,price,image_url,social_image_url,is_featured,is_popular,show_on_landing,star_rating,review_count,created_date,updated_date,seo_schema,meta_description',
      safari_updates:
        'id,title,slug,seo_slug,excerpt,category,image_url,social_image_url,post_type,publish_date,created_date,updated_date,seo_schema,meta_description',
      pages:
        'id,title,post_title,slug,seo_slug,cover_image,social_image_url,subtitle,created_date,updated_date,seo_schema,meta_description',
      accommodations:
        'id,name,slug,seo_slug,location,country,type,image_url,social_image_url,description_title,national_park_id,national_park_name,created_date,updated_date,seo_schema,meta_description',
      national_parks:
        'id,name,slug,location,country,image_url,social_image_url,description_title,seo_slug,created_date,updated_date,seo_schema,meta_description',
      explore:
        'id,title,slug,location,country,image_url,social_image_url,description_title,seo_slug,created_date,updated_date,seo_schema,meta_description',
    };

const pool = new pg.Pool({
  connectionString: connectionString.replace(/[?&]sslmode=[^&]+/g, '').replace(/\?$/, ''),
  ssl: { rejectUnauthorized: false },
});

async function tableColumns(table) {
  const res = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [table]
  );
  return new Set(res.rows.map((r) => r.column_name));
}

async function main() {
  const cols = LIST_COLUMNS;
  if (!cols) {
    console.error('No columns configured');
    process.exit(1);
  }
  const report = {};
  for (const [table, colStr] of Object.entries(cols)) {
    const wanted = colStr.split(',').map((c) => c.trim()).filter(Boolean);
    const existing = await tableColumns(table);
    if (existing.size === 0) {
      report[table] = { error: 'table not found or no columns' };
      continue;
    }
    const missing = wanted.filter((c) => !existing.has(c));
    report[table] = { missing, ok: missing.length === 0 };
  }
  console.log(JSON.stringify(report, null, 2));
  if (process.argv.includes('--dump')) {
    for (const table of process.argv.slice(process.argv.indexOf('--dump') + 1)) {
      const existing = await tableColumns(table);
      console.log(table, [...existing].sort().join(', '));
    }
  }
  if (process.argv.includes('--list-tables')) {
    const tables = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1`
    );
    console.log('tables:', tables.rows.map((r) => r.table_name).join(', '));
  }
  await pool.end();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
