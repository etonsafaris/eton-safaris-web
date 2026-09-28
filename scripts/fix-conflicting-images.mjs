/**
 * Repair conflicting CMS image URLs in Aiven PostgreSQL (no Python required).
 *
 *   node scripts/fix-conflicting-images.mjs           # dry-run
 *   node scripts/fix-conflicting-images.mjs --execute # apply
 */
import { Pool } from 'pg';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const EXECUTE = process.argv.includes('--execute');

const OFFICIAL_COUNTRY_HERO_PATHS = {
  uganda: '/heroes/uganda.jpg',
  kenya: '/heroes/kenya.jpg',
  tanzania: '/heroes/tanzania.jpg',
  rwanda: '/heroes/rwanda.webp',
  botswana: '/heroes/botswana.jpg',
  egypt: '/heroes/egypt.webp',
  namibia: '/heroes/namibia.jpg',
  'south-africa': '/heroes/south-africa.webp',
  'dr-congo': '/heroes/dr-congo.jpg',
  ethiopia: '/heroes/ethiopia.jpg',
  malawi: '/heroes/malawi.webp',
  zambia: '/heroes/zambia.webp',
};

const UNSPLASH_QS = 'auto=format&fit=crop&w=1200&q=80';
const unsplash = (id) => {
  const pid = id.startsWith('photo-') ? id : `photo-${id}`;
  return `https://images.unsplash.com/${pid}?${UNSPLASH_QS}`;
};

const DEFAULT_SAFARI = unsplash('photo-1516426122078-c23e9931aeeb');

const BROKEN_MARKERS = [
  'eton-safaris-gorilla',
  'media.base44.com',
  'supabase.co/storage',
  '/uploads/',
  'localhost',
  '127.0.0.1',
  '/object/authenticated/',
  '/object/sign/',
  'via.placeholder',
  '/heroes/community',
  '/heroes/talk-to-us',
];

function isStoredCmsMediaPath(value) {
  const path = String(value || '').trim().split('?')[0];
  return /^\/(?:api\/media|cms-media)\/[a-f0-9]{32}$/i.test(path);
}

const IMAGE_COLUMNS = [
  'image_url',
  'image',
  'cover_image',
  'featured_image',
  'social_image_url',
  'thumbnail',
  'photo',
  'banner',
];

const CONTENT_TABLES = [
  'tours',
  'categories',
  'national_park',
  'national_parks',
  'parks',
  'accommodations',
  'explore',
  'safari_updates',
  'pages',
  'landing_pages',
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

function normalizeSlug(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function pathOnly(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  if (raw.startsWith('/')) return raw.split('?')[0];
  try {
    return new URL(raw).pathname.split('?')[0];
  } catch {
    return raw.split('?')[0];
  }
}

function isBroken(value) {
  if (value == null) return true;
  const text = String(value).trim();
  if (!text || ['null', 'undefined', 'none', '-'].includes(text.toLowerCase())) return true;
  if (isStoredCmsMediaPath(text)) return false;
  if (text.startsWith('/') && !text.startsWith('//')) {
    if (text.startsWith('/heroes/') || text.startsWith('/api/media/') || text.startsWith('/cms-media/')) {
      return false;
    }
    if (!/^https?:/i.test(text)) return true;
  }
  const lower = text.toLowerCase();
  if (lower.includes('placeholder') && !lower.includes('images.unsplash.com')) return true;
  return BROKEN_MARKERS.some((m) => lower.includes(m));
}

function officialForSlug(slug) {
  const key = normalizeSlug(slug).replace(/-safaris$/, '');
  return OFFICIAL_COUNTRY_HERO_PATHS[key] || null;
}

function resolveCountrySlug(row) {
  for (const key of ['slug', 'seo_slug', 'country_slug', 'name', 'title']) {
    const raw = row[key];
    if (!raw) continue;
    let slug = normalizeSlug(raw);
    if (slug.endsWith('-safaris')) slug = slug.slice(0, -'-safaris'.length);
    if (OFFICIAL_COUNTRY_HERO_PATHS[slug]) return slug;
  }
  return '';
}

function countryRowNeedsOfficial(slug, value) {
  if (!slug) return false;
  const official = officialForSlug(slug);
  if (!official) return false;
  if (isBroken(value)) return true;
  const lower = String(value).toLowerCase();
  if (lower.includes('images.unsplash.com') || lower.includes('images.pexels.com')) return true;
  const pathname = pathOnly(value);
  if (pathname.startsWith('/heroes/') && pathname !== official) return true;
  return false;
}

function haystack(row) {
  const keys = [
    'title',
    'name',
    'slug',
    'country',
    'category',
    'location',
    'national_park_name',
    'national_park',
    'park_name',
    'description_title',
  ];
  return keys
    .filter((k) => row[k])
    .map((k) => String(row[k]).toLowerCase())
    .join(' ');
}

function stockForRow(row) {
  const text = haystack(row);
  if (/gorilla|chimp|bird|kilimanjaro|cultural|wildlife|safari/.test(text)) {
    if (/gorilla/.test(text)) return unsplash('photo-1523805009345-744884127a0');
    if (/chimp/.test(text)) return unsplash('photo-1551969014-7d9720413452');
    if (/bird/.test(text)) return unsplash('photo-1444464666168-49d633b86797');
    if (/kilimanjaro|mountain/.test(text)) return unsplash('photo-1464822759023-fed622ff2c3b');
    if (/cultural/.test(text)) return unsplash('photo-1489392191929-878962fa5fcc');
  }
  if (/uganda/.test(text)) return unsplash('photo-1523805009345-744884127a0');
  if (/kenya/.test(text)) return unsplash('photo-1549366021-9f761d450615');
  if (/tanzania|serengeti/.test(text)) return unsplash('photo-1509316785289-025f5b846b8f');
  if (/rwanda/.test(text)) return unsplash('photo-1535335524737-94d487809111');
  return DEFAULT_SAFARI;
}

async function existingColumns(client, table) {
  const { rows } = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
    [table]
  );
  return new Set(rows.map((r) => r.column_name));
}

async function tableExists(client, table) {
  const { rows } = await client.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1 LIMIT 1`,
    [table]
  );
  return rows.length > 0;
}

async function fixCountries(client) {
  if (!(await tableExists(client, 'countries'))) return { scanned: 0, updated: 0 };
  const cols = await existingColumns(client, 'countries');
  const imageCols = IMAGE_COLUMNS.filter((c) => cols.has(c));
  if (!imageCols.length) return { scanned: 0, updated: 0 };

  const { rows } = await client.query(`SELECT id, slug, name, title, ${imageCols.join(', ')} FROM countries`);
  let updated = 0;
  for (const row of rows) {
    const slug = resolveCountrySlug(row);
    const official = officialForSlug(slug);
    if (!official) continue;
    const patch = {};
    for (const col of imageCols) {
      if (countryRowNeedsOfficial(slug, row[col])) patch[col] = official;
    }
    if (!Object.keys(patch).length) continue;
    updated += 1;
    if (EXECUTE) {
      const sets = Object.keys(patch).map((c, i) => `"${c}" = $${i + 1}`);
      await client.query(`UPDATE countries SET ${sets.join(', ')} WHERE id = $${sets.length + 1}`, [
        ...Object.values(patch),
        row.id,
      ]);
    } else {
      console.log(`[countries] id=${row.id} slug=${slug}`, patch);
    }
  }
  return { scanned: rows.length, updated };
}

async function fixContentTable(client, table) {
  if (!(await tableExists(client, table))) return { scanned: 0, updated: 0 };
  const cols = await existingColumns(client, table);
  const imageCols = IMAGE_COLUMNS.filter((c) => cols.has(c));
  if (!imageCols.length) return { scanned: 0, updated: 0 };

  const { rows } = await client.query(`SELECT id, ${imageCols.join(', ')} FROM "${table}"`);
  let updated = 0;
  for (const row of rows) {
    const replacement = stockForRow(row);
    const patch = {};
    for (const col of imageCols) {
      if (isBroken(row[col])) patch[col] = replacement;
    }
    if (!Object.keys(patch).length) continue;
    updated += 1;
    if (EXECUTE) {
      const sets = Object.keys(patch).map((c, i) => `"${c}" = $${i + 1}`);
      await client.query(`UPDATE "${table}" SET ${sets.join(', ')} WHERE id = $${sets.length + 1}`, [
        ...Object.values(patch),
        row.id,
      ]);
    } else {
      console.log(`[${table}] id=${row.id}`, patch);
    }
  }
  return { scanned: rows.length, updated };
}

async function main() {
  loadEnv();
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error('DATABASE_URL missing in .env.local');
    process.exit(1);
  }

  process.env.NODE_TLS_REJECT_UNAUTHORIZED = process.env.NODE_TLS_REJECT_UNAUTHORIZED || '0';
  const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
  const client = await pool.connect();
  try {
    console.log(`fix-conflicting-images.mjs — ${EXECUTE ? 'EXECUTE' : 'DRY-RUN'}\n`);
    const countryReport = await fixCountries(client);
    console.log('countries', countryReport);

    for (const table of CONTENT_TABLES) {
      const report = await fixContentTable(client, table);
      if (report.scanned) console.log(table, report);
    }

    if (!EXECUTE) console.log('\nRe-run with --execute to apply.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
