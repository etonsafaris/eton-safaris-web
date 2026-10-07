/**
 * Report any remaining supabase.co strings in Aiven public tables.
 * Usage: node scripts/verify-no-supabase-urls.mjs
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';
import { parseEnvFile } from './lib/parse-env-file.mjs';

const ENV_FILE = resolve(import.meta.dirname, '..', '.env.local');
if (!existsSync(ENV_FILE)) {
  console.error('Missing .env.local');
  process.exit(1);
}
const url = String(parseEnvFile(ENV_FILE).DATABASE_URL || '').trim();
const pool = new pg.Pool({
  connectionString: url.replace(/[?&]sslmode=require\b/, '').replace(/[?&]sslmode=verify-full\b/, ''),
  ssl: { rejectUnauthorized: false },
  max: 2,
});

const hits = [];
const { rows: tables } = await pool.query(
  `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
);
for (const { table_name: table } of tables) {
  const { rows: cols } = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
       AND data_type IN ('text', 'character varying', 'json', 'jsonb')`,
    [table]
  );
  for (const { column_name: col } of cols) {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS n FROM "${table}" WHERE "${col}"::text ILIKE '%supabase.co%'`
    );
    const n = rows[0]?.n ?? 0;
    if (n > 0) hits.push({ table, column: col, count: n });
  }
}
console.log(JSON.stringify({ hitCount: hits.length, hits }, null, 2));
await pool.end();
process.exit(hits.length ? 1 : 0);
