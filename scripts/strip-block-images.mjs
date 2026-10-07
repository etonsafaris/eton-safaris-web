/**
 * Remove image_url / image / caption from all CMS block JSON columns in Aiven.
 * Usage: node scripts/strip-block-images.mjs [--dry-run]
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';
import { parseEnvFile } from './lib/parse-env-file.mjs';

const dryRun = process.argv.includes('--dry-run');
const ENV_FILE = resolve(import.meta.dirname, '..', '.env.local');
if (!existsSync(ENV_FILE)) {
  console.error('Missing .env.local');
  process.exit(1);
}

const url = String(parseEnvFile(ENV_FILE).DATABASE_URL || '').trim();
if (!url) {
  console.error('DATABASE_URL is empty');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: url.replace(/[?&]sslmode=require\b/, '').replace(/[?&]sslmode=verify-full\b/, ''),
  ssl: { rejectUnauthorized: false },
  max: 2,
});

const BLOCK_COLUMNS = [
  { table: 'accommodations', column: 'accommodation_blocks' },
  { table: 'national_park', column: 'park_blocks' },
  { table: 'explore', column: 'place_blocks' },
  { table: 'safari_updates', column: 'post_blocks' },
  { table: 'pages', column: 'page_blocks' },
];

function stripBlocks(raw) {
  if (!raw) return null;
  let parsed = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(parsed)) return null;
  const next = parsed.map((item) => {
    if (!item || typeof item !== 'object') return item;
    const { title, description } = item;
    return { title: String(title || ''), description: String(description || '') };
  });
  const changed = JSON.stringify(next) !== JSON.stringify(parsed);
  return changed ? JSON.stringify(next) : null;
}

let updated = 0;
for (const { table, column } of BLOCK_COLUMNS) {
  const { rows } = await pool.query(`SELECT id, ${column} FROM ${table} WHERE ${column} IS NOT NULL AND ${column}::text <> ''`);
  for (const row of rows) {
    const stripped = stripBlocks(row[column]);
    if (!stripped) continue;
    updated += 1;
    if (!dryRun) {
      await pool.query(`UPDATE ${table} SET ${column} = $2 WHERE id = $1`, [row.id, stripped]);
    }
  }
}

console.log(JSON.stringify({ dryRun, rowsUpdated: updated }, null, 2));
await pool.end();
