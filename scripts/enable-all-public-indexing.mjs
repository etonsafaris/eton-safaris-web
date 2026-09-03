import { Pool } from 'pg';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';

const TABLES = [
  'tours',
  'accommodations',
  'national_park',
  'countries',
  'categories',
  'explore',
  'safari_updates',
  'pages',
];

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

function quoteIdentifier(value) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) throw new Error(`Invalid table ${value}`);
  return `"${value}"`;
}

loadEnv();
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Aborting without changing data.');
  process.exit(1);
}

process.env.NODE_TLS_REJECT_UNAUTHORIZED = process.env.NODE_TLS_REJECT_UNAUTHORIZED || '0';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const client = await pool.connect();
const backup = {};

try {
  await client.query('BEGIN');
  for (const table of TABLES) {
    const quoted = quoteIdentifier(table);
    const exists = await client.query('SELECT to_regclass($1) AS exists', [table]);
    if (!exists.rows[0]?.exists) {
      console.log(`${table}: missing, skipped`);
      continue;
    }
    const columns = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
      [table]
    );
    const names = new Set(columns.rows.map((row) => row.column_name));
    if (!names.has('id')) {
      console.log(`${table}: no id column, skipped`);
      continue;
    }
    const selectColumns = ['id'];
    if (names.has('seo_schema')) selectColumns.push('seo_schema');
    if (names.has('robots_index')) selectColumns.push('robots_index');
    if (names.has('robots_follow')) selectColumns.push('robots_follow');
    if (names.has('seo_settings')) selectColumns.push('seo_settings');
    const rows = (await client.query(`SELECT ${selectColumns.map(quoteIdentifier).join(', ')} FROM ${quoted}`)).rows;
    backup[table] = rows;

    const assignments = [];
    if (names.has('robots_index')) {
      assignments.push(`${quoteIdentifier('robots_index')} = true`);
    }
    if (names.has('robots_follow')) {
      assignments.push(`${quoteIdentifier('robots_follow')} = true`);
    }
    if (names.has('seo_schema')) {
      assignments.push(
        `${quoteIdentifier('seo_schema')} = CASE
          WHEN ${quoteIdentifier('seo_schema')} IS NULL OR btrim(${quoteIdentifier('seo_schema')}::text) = '' THEN
            '{"_etonSeo":{"robots_index":true,"robots_follow":true}}'
          ELSE
            jsonb_set(
              jsonb_set(${quoteIdentifier('seo_schema')}::jsonb, '{_etonSeo,robots_index}', 'true'::jsonb, true),
              '{_etonSeo,robots_follow}', 'true'::jsonb, true
            )::text
        END`
      );
    }
    if (names.has('seo_settings')) {
      assignments.push(
        `${quoteIdentifier('seo_settings')} = '{"robots_index":true,"robots_follow":true}'`
      );
    }
    if (assignments.length) {
      await client.query(`UPDATE ${quoted} SET ${assignments.join(', ')}`);
    }
    console.log(`${table}: enabled indexing for ${rows.length} records`);
  }
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await pool.end();
}

const backupPath = resolve(process.cwd(), 'scripts', 'backups', `indexing-backup-${Date.now()}.json`);
mkdirSync(dirname(backupPath), { recursive: true });
writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf8');
console.log(`Backup written to ${backupPath}`);
