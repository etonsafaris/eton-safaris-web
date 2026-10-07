import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';
import { parseEnvFile } from './lib/parse-env-file.mjs';

const envPath = resolve(import.meta.dirname, '..', '.env.local');
const env = parseEnvFile(envPath);
const url = String(env.DATABASE_URL || '').trim();
const pool = new pg.Pool({
  connectionString: url.replace(/[?&]sslmode=\w+/g, ''),
  ssl: { rejectUnauthorized: false },
  max: 1,
});

const slug = process.argv[2] || 'uganda';
for (const col of ['seo_slug', 'slug', 'id']) {
  try {
    const res = await pool.query(`SELECT id, tagline, image_url FROM countries WHERE ${col} = $1 LIMIT 1`, [slug]);
    console.log(col, res.rows[0] || 'none');
  } catch (e) {
    console.log(col, 'ERR', e.message);
  }
}
try {
  const star = await pool.query('SELECT id, tagline, image_url FROM countries WHERE id = $1 LIMIT 1', [slug]);
  console.log('id lookup', star.rows[0] || 'none');
} catch (e) {
  console.log('id lookup ERR', e.message);
}
await pool.end();
