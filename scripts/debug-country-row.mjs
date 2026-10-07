import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';
import { parseEnvFile } from './lib/parse-env-file.mjs';

const envPath = resolve(import.meta.dirname, '..', '.env.local');
if (!existsSync(envPath)) {
  console.error('Missing .env.local');
  process.exit(1);
}
const env = parseEnvFile(envPath);
const url = String(env.DATABASE_URL || '').trim();
const slug = process.argv[2] || 'uganda';
const pool = new pg.Pool({
  connectionString: url.replace(/[?&]sslmode=\w+/g, ''),
  ssl: { rejectUnauthorized: false },
  max: 1,
});
const res = await pool.query(
  `SELECT id, name, slug, seo_slug, tagline, image_url, social_image_url, left(description, 200) as description_preview
   FROM countries
   WHERE slug ILIKE $1 OR seo_slug ILIKE $1 OR name ILIKE $2
   LIMIT 5`,
  [slug, `%${slug}%`]
);
console.log(JSON.stringify(res.rows, null, 2));
await pool.end();
