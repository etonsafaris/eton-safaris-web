import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';
import { parseEnvFile } from './lib/parse-env-file.mjs';

const ENV_FILE = resolve(import.meta.dirname, '..', '.env.local');
const env = parseEnvFile(ENV_FILE);
const pool = new pg.Pool({
  connectionString: String(env.DATABASE_URL).replace(/[?&]sslmode=require\b/, ''),
  ssl: { rejectUnauthorized: false },
});
const LEGACY_URL_RE = /https?:\/\/[^\s"'<>]*supabase\.co[^\s"'<>]*/gi;
const { rows } = await pool.query(`SELECT id, content FROM pages WHERE content::text ILIKE '%supabase%'`);
for (const row of rows) {
  let next = String(row.content || '').replace(LEGACY_URL_RE, '');
  next = next.replace(/supabase\.co[^\s"'<>]*/gi, '');
  next = next.replace(/motdytmcyozioshhgdvh\.supabase[^\s"'<>]*/gi, '');
  await pool.query('UPDATE pages SET content = $1 WHERE id = $2', [next, row.id]);
  console.log('updated', row.id);
}
await pool.end();
