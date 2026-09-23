/**
 * Global audit: accommodations must match data/real-park-accommodations-*.json per park.
 * - Removes generated/fake lodge names
 * - Removes stays assigned to the wrong national park
 * - Removes stays linked to a park but not in the verified catalog for that park
 * - Fixes national_park / park fields when catalog says otherwise
 *
 * Usage:
 *   node scripts/audit-repair-park-accommodations.mjs --dry-run
 *   node scripts/audit-repair-park-accommodations.mjs
 *   node scripts/audit-repair-park-accommodations.mjs --then-seed
 */
import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { spawn } from 'child_process';

const FAKE_RE =
  /\b(River|Savannah|Forest|Hilltop|Horizon|Baobab|Mist|Sunset|Valley|Lagoon|Canyon|Plateau|Oasis|Crest|Trail)\s+(Luxury|Safari)\s+(Lodge|Camp|Hotel|Bandas)\b/i;

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
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .replace(/-national-park|-national-reserve|-game-reserve|-conservation-area|-nature-reserve|-protected-area|-protectorate/g, '');
}

function parkSlug(name) {
  return slugify(name);
}

function loadCatalog() {
  const dir = resolve(process.cwd(), 'data');
  const files = readdirSync(dir).filter((f) => f.startsWith('real-park-accommodations-') && f.endsWith('.json'));
  const rows = [];
  for (const file of files) {
    const parsed = JSON.parse(readFileSync(resolve(dir, file), 'utf8'));
    if (Array.isArray(parsed)) rows.push(...parsed);
  }
  const byNameCountry = new Map();
  const byParkSlug = new Map();
  for (const row of rows) {
    if (!row?.name || !row?.national_park || !row?.country) continue;
    const key = `${String(row.country).toLowerCase()}||${String(row.name).toLowerCase()}`;
    byNameCountry.set(key, row);
    const pSlug = parkSlug(row.national_park);
    const parkKey = `${String(row.country).toLowerCase()}||${pSlug}`;
    if (!byParkSlug.has(parkKey)) byParkSlug.set(parkKey, new Set());
    byParkSlug.get(parkKey).add(String(row.name).toLowerCase());
  }
  return { rows, byNameCountry, byParkSlug };
}

function stayParkValue(stay) {
  return String(
    stay.national_park || stay.national_park_name || stay.park || stay.park_name || ''
  ).trim();
}

async function fetchAll(supabase, table, columns) {
  const rows = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + 499);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < 500) break;
  }
  return rows;
}

loadEnv();
const dryRun = process.argv.includes('--dry-run');
const thenSeed = process.argv.includes('--then-seed');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const catalog = loadCatalog();
const [parks, stays] = await Promise.all([
  fetchAll(supabase, 'national_park', 'id,name,country'),
  fetchAll(supabase, 'accommodations', 'id,name,country,national_park,national_park_name,park,park_name,location,description_title'),
]);

const parkBySlugCountry = new Map();
for (const park of parks) {
  const k = `${String(park.country || '').toLowerCase()}||${parkSlug(park.name)}`;
  parkBySlugCountry.set(k, park);
}

const toDelete = [];
const toFix = [];
const report = { fake: [], wrongPark: [], notInCatalogForPark: [], fixed: [] };

for (const stay of stays) {
  const name = String(stay.name || '').trim();
  const country = String(stay.country || '').trim();
  if (!name) continue;

  if (FAKE_RE.test(name)) {
    toDelete.push(stay.id);
    report.fake.push(name);
    continue;
  }

  const catalogKey = `${country.toLowerCase()}||${name.toLowerCase()}`;
  const catalogRow = catalog.byNameCountry.get(catalogKey);
  const dbPark = stayParkValue(stay);

  if (catalogRow) {
    const canonicalPark = String(catalogRow.national_park).trim();
    if (parkSlug(dbPark) !== parkSlug(canonicalPark)) {
      const parkRecord =
        parkBySlugCountry.get(`${country.toLowerCase()}||${parkSlug(canonicalPark)}`) || null;
      toFix.push({
        id: stay.id,
        name,
        from: dbPark,
        to: canonicalPark,
        national_park_id: parkRecord?.id || null,
      });
      report.wrongPark.push({ name, from: dbPark, to: canonicalPark });
    }
    continue;
  }

  if (!dbPark) continue;

  const parkKey = `${country.toLowerCase()}||${parkSlug(dbPark)}`;
  const allowed = catalog.byParkSlug.get(parkKey);
  if (!allowed) continue;
  if (!allowed.has(name.toLowerCase())) {
    toDelete.push(stay.id);
    report.notInCatalogForPark.push({ name, park: dbPark, country });
  }
}

console.log(
  JSON.stringify(
    {
      dryRun,
      catalogStays: catalog.rows.length,
      dbStays: stays.length,
      deleteCount: toDelete.length,
      fixCount: toFix.length,
      samples: {
        fake: report.fake.slice(0, 8),
        wrongPark: report.wrongPark.slice(0, 8),
        notInCatalogForPark: report.notInCatalogForPark.slice(0, 8),
      },
    },
    null,
    2
  )
);

const cacheDir = resolve(process.cwd(), 'scripts', '.cache');
mkdirSync(cacheDir, { recursive: true });
writeFileSync(resolve(cacheDir, 'audit-park-accommodations.json'), JSON.stringify(report, null, 2));

if (dryRun) process.exit(0);

for (const fix of toFix) {
  const payload = {
    national_park: fix.to,
    park: fix.to,
    park_name: fix.to,
    national_park_name: fix.to,
  };
  if (fix.national_park_id) payload.national_park_id = fix.national_park_id;
  const { error } = await supabase.from('accommodations').update(payload).eq('id', fix.id);
  if (error) console.warn('fix failed', fix.name, error.message);
  else report.fixed.push(fix.name);
}

const uniqueDelete = [...new Set(toDelete)];
for (let i = 0; i < uniqueDelete.length; i += 50) {
  const chunk = uniqueDelete.slice(i, i + 50);
  const { error } = await supabase.from('accommodations').delete().in('id', chunk);
  if (error) console.warn('delete chunk failed', error.message);
}

console.log(JSON.stringify({ deleted: uniqueDelete.length, fixed: report.fixed.length }, null, 2));

if (thenSeed) {
  const child = spawn(process.execPath, ['scripts/seed-real-park-accommodations.mjs', '--skip-images'], {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
  child.on('exit', (code) => process.exit(code ?? 0));
} else {
  console.log('Tip: run with --then-seed to upsert all verified stays from data/real-park-accommodations-*.json');
}
