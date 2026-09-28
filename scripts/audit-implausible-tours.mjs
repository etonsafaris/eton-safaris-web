/**
 * Dry-run: find tours whose text claims activities incompatible with the destination.
 * Does NOT update the database unless you pass --execute (sets status = 'draft').
 *
 *   node scripts/audit-implausible-tours.mjs
 *   node scripts/audit-implausible-tours.mjs --execute   # requires your explicit approval
 */
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import pg from 'pg';

function loadEnv() {
  for (const name of ['.env.local', '.env']) {
    const file = resolve(process.cwd(), name);
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#') || !t.includes('=')) continue;
      const i = t.indexOf('=');
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[k]) process.env[k] = v;
    }
    if (process.env.DATABASE_URL) return;
  }
}

const GORILLA_COUNTRIES = new Set(['uganda', 'rwanda', 'dr-congo', 'democratic republic of congo', 'drc']);
const CHIMP_COUNTRIES = new Set(['uganda', 'rwanda', 'tanzania', 'dr-congo', 'drc']);
const BIG_FIVE_MAINLAND = new Set([
  'uganda',
  'kenya',
  'tanzania',
  'rwanda',
  'botswana',
  'zambia',
  'zimbabwe',
  'south africa',
  'namibia',
  'malawi',
  'mozambique',
]);

function normCountry(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function haystack(row) {
  return [row.title, row.name, row.category, row.description, row.excerpt, row.content]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function reasons(row) {
  const country = normCountry(row.country || row.destination);
  const text = haystack(row);
  const out = [];
  if (/gorilla/.test(text) && country && !GORILLA_COUNTRIES.has(country)) {
    out.push('gorilla activity outside Uganda/Rwanda/DRC');
  }
  if (/chimp/.test(text) && country && !CHIMP_COUNTRIES.has(country)) {
    out.push('chimpanzee activity unlikely for country');
  }
  if (/big five|big-five/.test(text) && country === 'madagascar') {
    out.push('Big Five claimed for Madagascar');
  }
  if (/big five|big-five/.test(text) && country && !BIG_FIVE_MAINLAND.has(country) && country.includes('seychelles')) {
    out.push('Big Five claimed for island destination');
  }
  return out;
}

const execute = process.argv.includes('--execute');
loadEnv();
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL missing');
  process.exit(1);
}

process.env.NODE_TLS_REJECT_UNAUTHORIZED = process.env.NODE_TLS_REJECT_UNAUTHORIZED || '0';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

try {
  const { rows } = await pool.query(
    `SELECT id, title, slug, country, category, status, description, excerpt, content FROM tours ORDER BY id`
  );
  const flagged = [];
  for (const row of rows) {
    const why = reasons(row);
    if (why.length) flagged.push({ id: row.id, title: row.title, slug: row.slug, country: row.country, why });
  }
  console.log(JSON.stringify({ scanned: rows.length, flagged: flagged.length, samples: flagged.slice(0, 25) }, null, 2));
  if (execute && flagged.length) {
    const ids = flagged.map((f) => f.id);
    await pool.query(`UPDATE tours SET status = 'draft' WHERE id = ANY($1::text[]) OR id::text = ANY($1::text[])`, [
      ids.map(String),
    ]);
    console.log(`Drafted ${ids.length} tour(s). Review in admin before re-publishing.`);
  } else if (!execute && flagged.length) {
    console.log('\nRe-run with --execute to set status=draft (unpublish) on flagged tours.');
  }
} finally {
  await pool.end();
}
