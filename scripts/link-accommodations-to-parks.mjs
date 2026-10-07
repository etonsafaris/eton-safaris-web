/**
 * Align accommodations with national_park rows (id + name + location inside park).
 * Usage:
 *   node scripts/link-accommodations-to-parks.mjs --dry-run
 *   node scripts/link-accommodations-to-parks.mjs
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';
import { parseEnvFile } from './lib/parse-env-file.mjs';

const ENV_FILE = resolve(import.meta.dirname, '..', '.env.local');
const dryRun = process.argv.includes('--dry-run');

function parkSlug(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .replace(/-national-park|-national-reserve|-game-reserve|-conservation-area|-nature-reserve|-protected-area|-protectorate/g, '');
}

function stayParkValue(stay) {
  return String(
    stay.national_park_name || stay.national_park || stay.park_name || stay.park || ''
  ).trim();
}

function ensureLocation(location, parkName, country) {
  const loc = String(location || '').trim();
  const park = String(parkName || '').trim();
  if (!park) return loc;
  if (!loc) return country ? `${park}, ${country}` : park;
  const short = park.replace(/\s+(National Park|National Reserve|Game Reserve)$/i, '').trim();
  const hay = loc.toLowerCase();
  if (hay.includes(park.toLowerCase())) return loc;
  if (short.length >= 4 && hay.includes(short.toLowerCase())) return loc;
  return `${park}, ${loc}`;
}

if (!existsSync(ENV_FILE)) {
  console.error('Missing .env.local');
  process.exit(1);
}

const env = parseEnvFile(ENV_FILE);
const url = String(env.DATABASE_URL || '').trim();
if (!url) {
  console.error('DATABASE_URL is empty');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: url.replace(/[?&]sslmode=require\b/, '').replace(/[?&]sslmode=verify-full\b/, ''),
  ssl: { rejectUnauthorized: false },
  max: 2,
});

const parkTable = await pool
  .query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name IN ('national_park', 'national_parks', 'parks')
     ORDER BY CASE table_name WHEN 'national_park' THEN 0 WHEN 'national_parks' THEN 1 ELSE 2 END
     LIMIT 1`
  )
  .then((r) => r.rows[0]?.table_name);

if (!parkTable) {
  console.error('No national_park table found');
  process.exit(1);
}

const [parksRes, staysRes] = await Promise.all([
  pool.query(`SELECT id, name, country FROM ${parkTable}`),
  pool.query(
    `SELECT id, name, country, location, national_park_id, national_park_name, national_park, park, park_name FROM accommodations`
  ),
]);

const parks = parksRes.rows;
const parkBySlugCountry = new Map();
for (const park of parks) {
  const key = `${String(park.country || '').toLowerCase()}||${parkSlug(park.name)}`;
  if (!parkBySlugCountry.has(key)) parkBySlugCountry.set(key, park);
}

const updates = [];
for (const stay of staysRes.rows) {
  const country = String(stay.country || '').trim();
  const currentId = String(stay.national_park_id || '').trim();
  const label = stayParkValue(stay);
  let park =
    (currentId && parks.find((p) => String(p.id) === currentId)) ||
    (label && parkBySlugCountry.get(`${country.toLowerCase()}||${parkSlug(label)}`)) ||
    null;

  if (!park && label) {
    park =
      parks.find(
        (p) =>
          String(p.country || '').toLowerCase() === country.toLowerCase() &&
          String(p.name || '').toLowerCase() === label.toLowerCase()
      ) || null;
  }

  if (!park) continue;

  const parkName = String(park.name || '').trim();
  const nextLocation = ensureLocation(stay.location, parkName, country);
  const needs =
    String(stay.national_park_id || '') !== String(park.id) ||
    stayParkValue(stay) !== parkName ||
    String(stay.location || '').trim() !== nextLocation;

  if (needs) {
    updates.push({
      id: stay.id,
      name: stay.name,
      parkName,
      parkId: park.id,
      location: nextLocation,
    });
  }
}

console.log(JSON.stringify({ dryRun, stayCount: staysRes.rows.length, updateCount: updates.length, sample: updates.slice(0, 10) }, null, 2));

if (dryRun) {
  await pool.end();
  process.exit(0);
}

for (const row of updates) {
  await pool.query(
    `UPDATE accommodations SET
      national_park_id = $2,
      national_park_name = $3,
      national_park = $3,
      park = $3,
      park_name = $3,
      location = $4
     WHERE id = $1`,
    [row.id, row.parkId, row.parkName, row.location]
  );
}

console.log(`Updated ${updates.length} accommodations.`);
await pool.end();
