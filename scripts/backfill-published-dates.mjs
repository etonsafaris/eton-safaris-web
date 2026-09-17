/**
 * Give every public record a real published date.
 *
 * Safari Updates (and a few other tables) were imported without any date, so the
 * public hero and cards had nothing to show. This fills the first available date
 * column per table, preferring an existing date on the row and falling back to
 * the row's update/creation stamp, then to now().
 *
 * Usage: node scripts/backfill-published-dates.mjs [--dry]
 */
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const DRY = process.argv.includes('--dry');
const ROOT = process.cwd();

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    const full = path.join(ROOT, file);
    if (!fs.existsSync(full)) continue;
    for (const line of fs.readFileSync(full, 'utf8').split(/\r?\n/)) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i.exec(line);
      if (!match) continue;
      const key = match[1];
      let value = match[2].trim();
      if (/^".*"$/.test(value) || /^'.*'$/.test(value)) value = value.slice(1, -1);
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

loadEnv();

const connectionString = (process.env.DATABASE_URL || '')
  .replace(/[?&]sslmode=require\b/, '')
  .replace(/[?&]sslmode=verify-full\b/, '');

if (!connectionString) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const TABLES = [
  'safari_updates',
  'tours',
  'national_park',
  'accommodations',
  'explore',
  'countries',
  'categories',
  'pages',
  'landing_pages',
];

const DATE_TARGETS = ['published_at', 'publish_date', 'published_date'];
const DATE_SOURCES = ['published_at', 'publish_date', 'published_date', 'created_date', 'created_at', 'updated_date', 'updated_at'];

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 2,
  connectionTimeoutMillis: 15000,
  statement_timeout: 30000,
});

async function columnsFor(table) {
  const { rows } = await pool.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
    [table]
  );
  return rows;
}

async function run() {
  for (const table of TABLES) {
    const columns = await columnsFor(table);
    if (columns.length === 0) {
      console.log(`- ${table}: table not found, skipped`);
      continue;
    }
    const names = columns.map((column) => column.column_name);
    const target = DATE_TARGETS.find((name) => names.includes(name));
    if (!target) {
      console.log(`- ${table}: no published date column, skipped`);
      continue;
    }
    const sources = DATE_SOURCES.filter((name) => names.includes(name) && name !== target);
    const targetType = columns.find((column) => column.column_name === target)?.data_type || 'text';
    const isTextTarget = /char|text/i.test(targetType);

    const coalesceParts = sources.map((name) => {
      const type = columns.find((column) => column.column_name === name)?.data_type || 'text';
      const isText = /char|text/i.test(type);
      return isText ? `NULLIF(NULLIF(TRIM("${name}"), ''), 'null')::timestamptz` : `"${name}"::timestamptz`;
    });
    const stamp = `COALESCE(${[...coalesceParts, 'now()'].join(', ')})`;
    const value = isTextTarget ? `to_char(${stamp} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')` : stamp;
    const blank = isTextTarget
      ? `("${target}" IS NULL OR TRIM("${target}") = '' OR TRIM("${target}") = 'null')`
      : `"${target}" IS NULL`;

    const { rows: pending } = await pool.query(`SELECT count(*)::int AS total FROM "${table}" WHERE ${blank}`);
    const total = pending[0]?.total || 0;
    if (!total) {
      console.log(`- ${table}: every row already has ${target}`);
      continue;
    }
    if (DRY) {
      console.log(`- ${table}: would set ${target} on ${total} row(s)`);
      continue;
    }
    const result = await pool.query(`UPDATE "${table}" SET "${target}" = ${value} WHERE ${blank}`);
    console.log(`- ${table}: set ${target} on ${result.rowCount} row(s)`);
  }
}

run()
  .catch((error) => {
    console.error('Backfill failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
