/**
 * Export tour packages to one Word (.docx) file per country with hyperlinks to live tour detail pages.
 *
 * Usage: node scripts/export-tour-packages-word.mjs
 * Output: exports/tour-packages-word/*.docx + index.html
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
import pg from 'pg';
import {
  Document,
  ExternalHyperlink,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';
import { parseEnvFile } from './lib/parse-env-file.mjs';

const SITE_BASE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.etonsafaris.com').replace(/\/$/, '');
const OUT_DIR = resolve(scriptDir, '..', 'exports', 'tour-packages-word');
const PUBLIC_DL_DIR = resolve(scriptDir, '..', 'public', 'downloads', 'tour-packages');

const PUBLISHED = new Set(['published', 'publish', 'live', 'public', 'active', 'visible', 'released']);
const UNPUBLISHED = new Set(['draft', 'unpublished', 'deleted', 'archived', 'private', 'hidden', 'admin-only', 'admin only']);

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function pickString(row, keys) {
  for (const key of keys) {
    const v = row?.[key];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return '';
}

function tourTitle(row) {
  return pickString(row, ['title', 'name', 'post_title']) || 'Untitled tour';
}

function tourSlug(row) {
  const fromSlug = slugify(pickString(row, ['slug', 'seo_slug']));
  if (fromSlug) return fromSlug;
  const fromTitle = slugify(tourTitle(row));
  if (fromTitle && fromTitle !== 'untitled') return fromTitle;
  return String(row.id || '');
}

function isPublishedTour(row) {
  if (row?.deleted_at || row?.is_deleted === true) return false;
  for (const key of ['published', 'is_published']) {
    if (typeof row[key] === 'boolean') return row[key];
  }
  const status = pickString(row, ['status', 'publish_status']).toLowerCase();
  if (status) {
    if (PUBLISHED.has(status)) return true;
    if (UNPUBLISHED.has(status)) return false;
  }
  const visibility = pickString(row, ['visibility']).toLowerCase();
  if (visibility) {
    if (PUBLISHED.has(visibility)) return true;
    if (UNPUBLISHED.has(visibility)) return false;
  }
  return true;
}

function tourDetailUrl(row) {
  const slug = tourSlug(row);
  return `${SITE_BASE}/tours/${encodeURIComponent(slug)}`;
}

function countryKey(row) {
  const raw = pickString(row, ['country']) || 'Other';
  return raw.replace(/\s+/g, ' ').trim();
}

function countryFileSlug(label) {
  const s = slugify(label);
  return s || 'other';
}

function metaLine(row) {
  const parts = [];
  const category = pickString(row, ['category']);
  const duration = pickString(row, ['duration_label', 'duration_days']);
  const price = pickString(row, ['price']);
  if (category) parts.push(category);
  if (duration) parts.push(duration);
  if (price) parts.push(price);
  return parts.join(' · ');
}

async function loadTours(pool) {
  const columnSets = [
    'id, title, slug, seo_slug, country, category, duration_label, duration_days, price, status, visibility, published, is_published',
    'id, title, slug, seo_slug, country, category, duration_label, duration_days, price',
    'id, title, slug, seo_slug, country, category, price',
  ];
  let lastError;
  for (const cols of columnSets) {
    try {
      const res = await pool.query(
        `SELECT ${cols} FROM tours ORDER BY country NULLS LAST, title NULLS LAST`
      );
      return (res.rows || []).filter(isPublishedTour);
    } catch (error) {
      lastError = error;
      if (error?.code !== '42703') throw error;
    }
  }
  throw lastError;
}

function buildCountryDocument(countryLabel, tours) {
  const generated = new Date().toISOString().slice(0, 10);
  const children = [
    new Paragraph({
      text: `${countryLabel} — Tour packages`,
      heading: HeadingLevel.TITLE,
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Eton Safaris · ${tours.length} package${tours.length === 1 ? '' : 's'} · Generated ${generated}`,
          italics: true,
          size: 22,
        }),
      ],
    }),
    new Paragraph({ text: '' }),
    new Paragraph({
      text: 'Click a package name to open its detail page on the website.',
      spacing: { after: 200 },
    }),
  ];

  const byCategory = new Map();
  for (const tour of tours) {
    const cat = pickString(tour, ['category']) || 'General';
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat).push(tour);
  }

  const categories = [...byCategory.keys()].sort((a, b) => a.localeCompare(b));
  for (const category of categories) {
    children.push(
      new Paragraph({
        text: category,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 120 },
      })
    );
    const list = byCategory.get(category).sort((a, b) => tourTitle(a).localeCompare(tourTitle(b)));
    for (const tour of list) {
      const title = tourTitle(tour);
      const url = tourDetailUrl(tour);
      const meta = metaLine(tour);
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: '• ', size: 24 }),
            new ExternalHyperlink({
              link: url,
              children: [
                new TextRun({
                  text: title,
                  style: 'Hyperlink',
                  size: 24,
                }),
              ],
            }),
          ],
          spacing: { after: 60 },
        })
      );
      if (meta) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: meta, size: 20, color: '666666' })],
            indent: { left: 360 },
            spacing: { after: 120 },
          })
        );
      }
    }
  }

  return new Document({
    creator: 'Eton Safaris',
    title: `${countryLabel} tour packages`,
    description: 'Hyperlinked list of tour packages',
    sections: [{ children }],
  });
}

function writeIndexHtml(files) {
  const rows = files
    .map(
      (f) =>
        `<li><a href="${f.name}">${f.country}</a> <span class="muted">(${f.count} packages)</span></li>`
    )
    .join('\n');
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Tour packages by country — Word downloads</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 42rem; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
    h1 { font-size: 1.5rem; }
    ul { padding-left: 1.25rem; }
    a { color: #1f6b3a; font-weight: 600; }
    .muted { color: #666; font-weight: 400; }
  </style>
</head>
<body>
  <h1>Tour packages by country</h1>
  <p>Download one Word document per country. Each tour title links to its live detail page on <a href="${SITE_BASE}">${SITE_BASE.replace(/^https?:\/\//, '')}</a>.</p>
  <ul>
${rows}
  </ul>
  <p class="muted">Regenerate: <code>npm run tours:export-word</code></p>
</body>
</html>`;
  return html;
}

async function main() {
  const envPath = resolve(scriptDir, '..', '.env.local');
  if (!existsSync(envPath)) {
    console.error('Missing .env.local (DATABASE_URL required).');
    process.exit(1);
  }
  const env = parseEnvFile(envPath);
  const url = String(env.DATABASE_URL || '').trim();
  if (!url) {
    console.error('DATABASE_URL is empty in .env.local');
    process.exit(1);
  }

  const pool = new pg.Pool({
    connectionString: url.replace(/[?&]sslmode=\w+/g, ''),
    ssl: { rejectUnauthorized: false },
    max: 1,
  });

  let tours;
  try {
    tours = await loadTours(pool);
  } finally {
    await pool.end();
  }

  const byCountry = new Map();
  for (const tour of tours) {
    const key = countryKey(tour);
    if (!byCountry.has(key)) byCountry.set(key, []);
    byCountry.get(key).push(tour);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(PUBLIC_DL_DIR, { recursive: true });

  const manifest = [];
  const countries = [...byCountry.keys()].sort((a, b) => a.localeCompare(b));

  for (const countryLabel of countries) {
    const countryTours = byCountry.get(countryLabel);
    const fileSlug = countryFileSlug(countryLabel);
    const fileName = `${fileSlug}-tour-packages.docx`;
    const doc = buildCountryDocument(countryLabel, countryTours);
    const buffer = await Packer.toBuffer(doc);
    const outPath = resolve(OUT_DIR, fileName);
    const publicPath = resolve(PUBLIC_DL_DIR, fileName);
    writeFileSync(outPath, buffer);
    writeFileSync(publicPath, buffer);
    manifest.push({ country: countryLabel, name: fileName, count: countryTours.length });
    console.log(`Wrote ${fileName} (${countryTours.length} tours)`);
  }

  const indexHtml = writeIndexHtml(manifest);
  writeFileSync(resolve(OUT_DIR, 'index.html'), indexHtml);
  writeFileSync(resolve(PUBLIC_DL_DIR, 'index.html'), indexHtml);

  console.log('');
  console.log(`Done — ${manifest.length} countries, ${tours.length} tours total.`);
  console.log(`Folder: ${OUT_DIR}`);
  console.log(`Web:    ${SITE_BASE}/downloads/tour-packages/`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
