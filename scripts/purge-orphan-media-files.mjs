/**
 * Delete media_files rows not referenced anywhere + legacy Supabase filenames.
 * Usage: node scripts/purge-orphan-media-files.mjs [--dry-run]
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';
import { parseEnvFile } from './lib/parse-env-file.mjs';

const dryRun = process.argv.includes('--dry-run');
const ENV_FILE = resolve(import.meta.dirname, '..', '.env.local');
const env = parseEnvFile(ENV_FILE);
const url = String(env.DATABASE_URL || '').trim();
if (!url) {
  console.error('DATABASE_URL missing');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: url.replace(/[?&]sslmode=require\b/, '').replace(/[?&]sslmode=verify-full\b/, ''),
  ssl: { rejectUnauthorized: false },
  max: 2,
});

const MEDIA_ID_RE = /\/(?:api\/media|cms-media)\/([a-f0-9]{32})/gi;
const referenced = new Set();

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
  if (!cols.length) continue;
  const colList = cols.map((c) => `"${c.column_name}"`).join(', ');
  const { rows } = await pool.query(`SELECT ${colList} FROM "${table}"`);
  for (const row of rows) {
    for (const value of Object.values(row)) {
      if (value == null) continue;
      const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
      for (const match of text.matchAll(MEDIA_ID_RE)) {
        if (match[1]) referenced.add(match[1].toLowerCase());
      }
    }
  }
}

const { rows: mediaRows } = await pool.query(`SELECT id, filename FROM media_files`);
const toDelete = mediaRows.filter((row) => {
  const id = String(row.id || '').toLowerCase();
  if (referenced.has(id)) return false;
  const fn = String(row.filename || '').toLowerCase();
  if (fn.includes('supabase')) return true;
  return true;
});

console.log(
  JSON.stringify(
    {
      dryRun,
      mediaTotal: mediaRows.length,
      referencedCount: referenced.size,
      deleteCount: toDelete.length,
      sample: toDelete.slice(0, 15).map((r) => r.id),
    },
    null,
    2
  )
);

if (!dryRun && toDelete.length) {
  const ids = toDelete.map((r) => r.id);
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    await pool.query(`DELETE FROM media_files WHERE id = ANY($1::text[])`, [chunk]);
  }
}

await pool.end();
