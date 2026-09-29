/**
 * Recover accommodation & national park covers overwritten by assign-*-images.mjs
 * (Unsplash / DuckDuckGo → Supabase WebP). Restores from sibling columns, HTML body,
 * and optionally official property OG images for catalog stays.
 *
 *   node scripts/restore-accommodation-park-images.mjs
 *   node scripts/restore-accommodation-park-images.mjs --execute
 *   node scripts/restore-accommodation-park-images.mjs --execute --property-og
 *   node scripts/restore-accommodation-park-images.mjs --table accommodations
 */
import { Pool } from 'pg';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import {
  AUTO_ASSIGN_SUPABASE_RE,
  HTML_COLUMNS,
  IMAGE_COLUMNS,
  isAutoAssignedFakeImage,
  recoveryFromHtmlFields,
  recoveryFromImageColumns,
  websiteFromStay,
} from './lib/image-restore.mjs';
import { fetchOgImage, loadEnv as loadAssignEnv, sleep } from './lib/image-assign.mjs';

const EXECUTE = process.argv.includes('--execute');
const USE_PROPERTY_OG = process.argv.includes('--property-og');
const tableArgIdx = process.argv.indexOf('--table');
const ONLY_TABLE = tableArgIdx >= 0 ? String(process.argv[tableArgIdx + 1] || '').trim() : '';

const TABLE_SPECS = [
  { table: 'accommodations', nameKey: 'name' },
  { table: 'national_park', nameKey: 'name' },
  { table: 'national_parks', nameKey: 'name' },
  { table: 'parks', nameKey: 'name' },
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

function loadRealCatalog() {
  const dir = resolve(process.cwd(), 'data');
  const map = new Map();
  if (!existsSync(dir)) return map;
  for (const file of readdirSync(dir).filter((f) => f.startsWith('real-park-accommodations-') && f.endsWith('.json'))) {
    for (const row of JSON.parse(readFileSync(resolve(dir, file), 'utf8'))) {
      const name = String(row.name || '').trim();
      const country = String(row.country || '').trim();
      if (!name || !country) continue;
      map.set(`${country.toLowerCase()}||${name.toLowerCase()}`, row);
    }
  }
  return map;
}

async function tableExists(client, table) {
  const { rows } = await client.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1 LIMIT 1`,
    [table]
  );
  return rows.length > 0;
}

async function existingColumns(client, table) {
  const { rows } = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
    [table]
  );
  return new Set(rows.map((r) => r.column_name));
}

async function restoreTable(client, spec, catalog) {
  const { table, nameKey } = spec;
  if (!(await tableExists(client, table))) {
    console.log(`[skip] ${table}: not found`);
    return { candidates: 0, updated: 0, noRecovery: 0 };
  }

  const cols = await existingColumns(client, table);
  const imageCols = IMAGE_COLUMNS.filter((c) => cols.has(c));
  if (!imageCols.length) {
    console.log(`[skip] ${table}: no image columns`);
    return { candidates: 0, updated: 0, noRecovery: 0 };
  }

  const htmlCols = HTML_COLUMNS.filter((c) => cols.has(c));
  const primary = cols.has('image_url') ? 'image_url' : imageCols[0];
  const selectKeys = ['id', nameKey, ...imageCols, ...htmlCols, 'website', 'website_url', 'country'];
  const selectSql = [...new Set(selectKeys.filter((k) => cols.has(k) || k === 'id' || k === nameKey))]
    .map((c) => `"${c}"`)
    .join(', ');

  const { rows } = await client.query(`SELECT ${selectSql} FROM "${table}" ORDER BY id`);

  let candidates = 0;
  let updated = 0;
  let noRecovery = 0;

  for (const row of rows) {
    const current = row[primary];
    if (!isAutoAssignedFakeImage(current)) continue;

    let recovery =
      recoveryFromImageColumns(row, imageCols, primary) || recoveryFromHtmlFields(row, htmlCols);

    if (!recovery && table === 'accommodations' && USE_PROPERTY_OG) {
      const country = String(row.country || '').trim();
      const name = String(row[nameKey] || '').trim();
      const catalogRow = catalog.get(`${country.toLowerCase()}||${name.toLowerCase()}`);
      const website = websiteFromStay(row) || String(catalogRow?.website || '').trim();
      if (website) {
        const og = await fetchOgImage(website);
        if (og && !isAutoAssignedFakeImage(og)) recovery = og;
        await sleep(120);
      }
    }

    if (!recovery) {
      noRecovery += 1;
      continue;
    }

    candidates += 1;
    const label = row[nameKey] || row.id;
    console.log(`[${table}] id=${row.id} ${label}: ${String(current || '').slice(0, 60)}… -> ${recovery.slice(0, 80)}`);

    if (!EXECUTE) continue;

    await client.query(`UPDATE "${table}" SET "${primary}" = $1 WHERE id = $2`, [recovery, row.id]);
    if (cols.has('social_image_url')) {
      await client.query(`UPDATE "${table}" SET social_image_url = $1 WHERE id = $2`, [recovery, row.id]);
    }
    updated += 1;
  }

  return { candidates, updated, noRecovery };
}

async function main() {
  loadEnv();
  loadAssignEnv();
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error('DATABASE_URL missing in .env.local');
    process.exit(1);
  }

  console.log(
    `restore-accommodation-park-images — ${EXECUTE ? 'EXECUTE' : 'DRY-RUN'}` +
      (USE_PROPERTY_OG ? ' + property OG' : '') +
      `\nDetecting auto-assigned paths: ${AUTO_ASSIGN_SUPABASE_RE}\n`
  );

  const catalog = loadRealCatalog();
  console.log(`Catalog stays for OG fallback: ${catalog.size}\n`);

  process.env.NODE_TLS_REJECT_UNAUTHORIZED = process.env.NODE_TLS_REJECT_UNAUTHORIZED || '0';
  const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
  const client = await pool.connect();

  try {
    const specs = ONLY_TABLE
      ? TABLE_SPECS.filter((s) => s.table === ONLY_TABLE)
      : TABLE_SPECS;

    let totalCandidates = 0;
    let totalUpdated = 0;
    let totalNoRecovery = 0;

    for (const spec of specs) {
      const report = await restoreTable(client, spec, catalog);
      totalCandidates += report.candidates;
      totalUpdated += report.updated;
      totalNoRecovery += report.noRecovery;
      console.log(
        `  ${spec.table}: ${report.candidates} recoverable, ${report.noRecovery} still need manual/OG pass\n`
      );
    }

    console.log(
      `Done — ${totalCandidates} row(s) can be restored` +
        (EXECUTE ? `, ${totalUpdated} updated` : '') +
        `, ${totalNoRecovery} without a stored original`
    );
    if (!EXECUTE && totalCandidates) console.log('Re-run with --execute to apply.');
    if (totalNoRecovery && !USE_PROPERTY_OG) {
      console.log('Tip: try --property-og for catalog accommodations (official site og:image).');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
