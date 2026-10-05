/**
 * Quick Aiven connectivity check (reads DATABASE_URL from .env.local).
 * Usage: node scripts/test-aiven-connection.mjs
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';
const { Pool } = pg;
import { parseEnvFile } from './lib/parse-env-file.mjs';

const ENV_FILE = resolve(import.meta.dirname, '..', '.env.local');
if (!existsSync(ENV_FILE)) {
  console.error('Missing .env.local');
  process.exit(1);
}

const env = parseEnvFile(ENV_FILE);
const url = String(env.DATABASE_URL || '').trim();
if (!url) {
  console.error('DATABASE_URL is empty in .env.local');
  process.exit(1);
}

function normalizePgUrl(raw) {
  return raw.replace(/[?&]sslmode=require\b/, '').replace(/[?&]sslmode=verify-full\b/, '');
}

const pool = new Pool({
  connectionString: normalizePgUrl(url),
  ssl: { rejectUnauthorized: false },
  max: 1,
  connectionTimeoutMillis: 20_000,
});

try {
  const toursRes = await pool.query('SELECT COUNT(*)::int AS n FROM tours');
  const countriesRes = await pool.query('SELECT COUNT(*)::int AS n FROM countries');
  const tours = toursRes.rows[0]?.n ?? 0;
  const countries = countriesRes.rows[0]?.n ?? 0;
  console.log('OK — connected to Aiven');
  console.log(`  tours: ${tours}`);
  console.log(`  countries: ${countries}`);
  console.log('\nIf production still shows 0, copy this exact DATABASE_URL into Vercel → Project → Settings → Environment Variables (Production), then redeploy.');
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error('FAILED —', message.slice(0, 200));
  if (/password authentication|authentication failed/i.test(message)) {
    console.error('\nReset the PostgreSQL user password in Aiven Console → Connection information → Service URI, then update .env.local and Vercel.');
  }
  process.exit(1);
} finally {
  await pool.end();
}
