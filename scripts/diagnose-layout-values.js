// Diagnose where legacy layout values may be stored in the DB
// Usage: node scripts/diagnose-layout-values.js
// Attempts to find non-standard layout values in common content columns.

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

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

async function main() {
  // load envs if needed (same approach as other script)
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
              const val = m[1].trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
              process.env.DATABASE_URL = val;
              break;
            }
          }
        }
        if (process.env.DATABASE_URL) break;
      } catch (e) {}
    }
  }

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set; cannot diagnose.');
    process.exit(1);
  }

  process.env.NODE_TLS_REJECT_UNAUTHORIZED = process.env.NODE_TLS_REJECT_UNAUTHORIZED || '0';
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const client = await pool.connect();

  try {
    const tables = [
      { name: 'pages', cols: ['id','slug','title','layout','seo_schema','seo_settings','page_blocks','content','description','body','excerpt'] },
      { name: 'landing_pages', cols: ['id','slug','title','layout','seo_schema','seo_settings','content','description','body','excerpt'] },
      { name: 'keywords', cols: ['id','slug','keywords','country','category'] },
    ];

    const report = {};

    for (const t of tables) {
      try {
        const exists = await client.query('SELECT to_regclass($1) AS exists', [t.name]);
        if (!exists.rows[0] || !exists.rows[0].exists) continue;

        const cols = [];
        // detect which columns actually exist
        const colRes = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1`, [t.name]);
        const actual = new Set(colRes.rows.map(r => r.column_name));
        for (const c of t.cols) if (actual.has(c)) cols.push(c);
        if (!cols.length) continue;

        // fetch rows and inspect column values for unexpected layout-like strings
        const rowsRes = await client.query(`SELECT id, ${cols.map(c => c).join(', ')} FROM ${t.name} LIMIT 5000`);
        const rows = rowsRes.rows || [];
        const badRows = [];
        for (const row of rows) {
          // check direct 'layout' column
          if ('layout' in row && row.layout && !ALLOWED.has(String(row.layout).toLowerCase())) {
            badRows.push({ id: row.id, column: 'layout', value: row.layout });
            continue;
          }
          // check in seo_settings / seo_schema text for literal layout keys
          if ('seo_settings' in row && row.seo_settings && /layout\s*[:=]/i.test(String(row.seo_settings))) {
            badRows.push({ id: row.id, column: 'seo_settings', value: String(row.seo_settings).slice(0,200) });
            continue;
          }
          if ('seo_schema' in row && row.seo_schema && /layout\s*[:=]/i.test(String(row.seo_schema))) {
            badRows.push({ id: row.id, column: 'seo_schema', value: String(row.seo_schema).slice(0,200) });
            continue;
          }
          // check page_blocks / blocks for layout-like strings
          if ('page_blocks' in row && row.page_blocks && /"layout"\s*:\s*"[^"]+"/i.test(String(row.page_blocks))) {
            badRows.push({ id: row.id, column: 'page_blocks', value: String(row.page_blocks).slice(0,200) });
            continue;
          }
          // check content/description for legacy layout markers
          for (const c of ['content','description','body','excerpt']) {
            if (c in row && row[c] && /<!--\s*layout\s*:\s*[^>]+-->/i.test(String(row[c]))) {
              badRows.push({ id: row.id, column: c, value: String(row[c]).slice(0,200) });
              break;
            }
          }
        }

        if (badRows.length) report[t.name] = badRows;
      } catch (err) {
        console.error('Error scanning table', t.name, err.message || err);
      }
    }

    if (Object.keys(report).length === 0) {
      console.log('No legacy layout markers found in inspected columns.');
    } else {
      const out = path.join(__dirname, 'backups', `layout-diagnose-${Date.now()}.json`);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, JSON.stringify(report, null, 2), 'utf8');
      console.log('Found potential legacy layout markers — saved report to', out);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => { console.error('Fatal', err); process.exit(1); });
