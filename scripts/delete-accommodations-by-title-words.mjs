/**
 * Permanently delete accommodations whose name contains any of the given words.
 * Usage:
 *   node scripts/delete-accommodations-by-title-words.mjs --dry-run
 *   node scripts/delete-accommodations-by-title-words.mjs --execute
 */
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';
import { parseEnvFile } from './lib/parse-env-file.mjs';

const TITLE_WORDS = ['Baobab', 'Mist', 'Lagoon', 'Sunset', 'Horizon'];

const dryRun = !process.argv.includes('--execute');
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

const conditions = TITLE_WORDS.map((_, i) => `name ILIKE $${i + 1}`).join(' OR ');
const params = TITLE_WORDS.map((word) => `%${word}%`);

const { rows } = await pool.query(
  `SELECT id, name, country FROM accommodations WHERE ${conditions} ORDER BY country, name`,
  params
);

console.log(
  JSON.stringify(
    {
      dryRun,
      words: TITLE_WORDS,
      matchCount: rows.length,
      byCountry: rows.reduce((acc, row) => {
        const c = String(row.country || 'Unknown');
        acc[c] = (acc[c] || 0) + 1;
        return acc;
      }, {}),
      sample: rows.slice(0, 25).map((r) => ({ id: r.id, name: r.name, country: r.country })),
    },
    null,
    2
  )
);

const cacheDir = resolve(import.meta.dirname, '.cache');
mkdirSync(cacheDir, { recursive: true });
writeFileSync(resolve(cacheDir, 'deleted-accommodations-by-title.json'), JSON.stringify(rows, null, 2));

if (dryRun) {
  console.log('\nDry run only. Re-run with --execute to permanently delete these rows.');
  await pool.end();
  process.exit(0);
}

if (rows.length === 0) {
  console.log('Nothing to delete.');
  await pool.end();
  process.exit(0);
}

const ids = rows.map((r) => r.id);
for (let i = 0; i < ids.length; i += 100) {
  const chunk = ids.slice(i, i + 100);
  const placeholders = chunk.map((_, idx) => `$${idx + 1}`).join(',');
  await pool.query(`DELETE FROM accommodations WHERE id IN (${placeholders})`, chunk);
}

const remaining = await pool.query(`SELECT COUNT(*)::int AS n FROM accommodations`);
console.log(JSON.stringify({ deleted: rows.length, remaining: remaining.rows[0]?.n ?? 0 }, null, 2));
await pool.end();
