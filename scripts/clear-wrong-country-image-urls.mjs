/**
 * Remove country cover URLs that point at community/generic static art (not real country photos).
 *
 *   node scripts/clear-wrong-country-image-urls.mjs
 *   node scripts/clear-wrong-country-image-urls.mjs --execute
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';

function loadEnv() {
  const file = resolve(process.cwd(), '.env.local');
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();
const execute = process.argv.includes('--execute');
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const BAD = [
  '%/heroes/community%',
  '%/heroes/egypt%',
  '%/heroes/south-africa%',
  '%/heroes/talk-to-us%',
  '%/heroes/zambia%',
  '%/heroes/rwanda%',
  '%/heroes/malawi%',
  '%eton-safaris-gorilla%',
  '%images.unsplash.com%',
  '%media.base44.com%',
];

try {
  const { rows } = await pool.query(
    `SELECT id, name, slug, image_url FROM countries WHERE image_url IS NOT NULL AND TRIM(image_url::text) <> ''`
  );
  const hits = rows.filter((row) => {
    const url = String(row.image_url || '').toLowerCase();
    return BAD.some((pattern) => {
      const needle = pattern.replace(/%/g, '');
      return url.includes(needle);
    });
  });

  console.log(JSON.stringify({ totalCountries: rows.length, toClear: hits.length, sample: hits.slice(0, 8) }, null, 2));

  if (execute && hits.length) {
    const ids = hits.map((row) => row.id);
    await pool.query(
      `UPDATE countries SET image_url = NULL WHERE id = ANY($1::text[]) OR id::text = ANY($1::text[])`,
      [ids.map(String)]
    );
    console.log(`Cleared image_url on ${hits.length} countries. Re-upload real covers in Admin → Countries.`);
  } else if (!execute && hits.length) {
    console.log('Run with --execute to clear bad country image_url values.');
  }
} finally {
  await pool.end();
}
