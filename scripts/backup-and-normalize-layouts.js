// Backup and normalize CMS layouts script
// Usage: node scripts/backup-and-normalize-layouts.js
// If DATABASE_URL is not set in environment, this script will attempt to read .env.local or .env

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// If needed, relax TLS verification for self-signed Aiven certs in local runs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = process.env.NODE_TLS_REJECT_UNAUTHORIZED || '0';

// try to load .env.local / .env if DATABASE_URL is not provided
if (!process.env.DATABASE_URL) {
  const tryEnvFiles = ['.env.local', '.env'];
  for (const f of tryEnvFiles) {
    try {
      const p = path.join(process.cwd(), f);
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf8');
        for (const line of content.split(/\r?\n/)) {
          const m = line.match(/^(?:export\s+)?DATABASE_URL=(.*)$/);
          if (m) {
            // strip possible surrounding quotes
            const val = m[1].trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
            process.env.DATABASE_URL = val;
            break;
          }
        }
      }
      if (process.env.DATABASE_URL) break;
    } catch (e) {
      // ignore
    }
  }
}


const ALLOWED = new Set(['home', 'about', 'policy', 'community', 'agency', 'standard']);

function inferPageLayout(slug) {
  const key = String(slug || '').toLowerCase().replace(/^\/+/, '');
  if (key === 'home' || key.includes('home-page') || key === 'homepage') return 'home';
  if (key.includes('privacy') || key.includes('terms')) return 'policy';
  if (key.includes('community')) return 'community';
  if (key.includes('agency') || key.includes('travel-agency')) return 'agency';
  if (key.includes('about')) return 'about';
  return 'standard';
}

function parseLayout(value, slug) {
  const key = String(value || '').toLowerCase().trim();
  if (ALLOWED.has(key)) return key;
  return inferPageLayout(slug || '');
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set. Aborting.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  const client = await pool.connect();

  try {
    const tables = ['pages', 'landing_pages'];
    const allBackups = {};

    for (const table of tables) {
      try {
        // Check table exists
        const exists = await client.query(
          `SELECT to_regclass($1) as exists`,
          [table]
        );
        if (!exists.rows[0] || !exists.rows[0].exists) {
          console.log(`Table ${table} does not exist — skipping.`);
          continue;
        }

        // Select rows with layout values present and not in allowed set
        const rowsRes = await client.query(
          `SELECT id, slug, title, layout FROM ${table} WHERE layout IS NOT NULL`);
        const rows = rowsRes.rows || [];

        const affected = rows.filter((r) => !ALLOWED.has(String(r.layout || '').toLowerCase()));
        if (affected.length === 0) {
          console.log(`No legacy layouts found in ${table}.`);
          continue;
        }

        allBackups[table] = affected;

        // Prepare updates
        for (const row of affected) {
          const normalized = parseLayout(row.layout || '', row.slug || '');
          await client.query(
            `UPDATE ${table} SET layout = $1 WHERE id = $2`,
            [normalized, row.id]
          );
          console.log(`Updated ${table} id=${row.id} layout: ${row.layout} -> ${normalized}`);
        }

      } catch (err) {
        console.error(`Error processing table ${table}:`, err.message || err);
      }
    }

    // Write backup file
    if (Object.keys(allBackups).length > 0) {
      const backupsDir = path.join(__dirname, 'backups');
      if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
      const fname = path.join(backupsDir, `layouts-backup-${Date.now()}.json`);
      fs.writeFileSync(fname, JSON.stringify(allBackups, null, 2), 'utf8');
      console.log('Backup written to', fname);
    } else {
      console.log('No layouts required normalization; no backup created.');
    }

    console.log('Done.');
  } catch (err) {
    console.error('Unexpected error:', err.message || err);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Fatal error', err);
  process.exit(1);
});
