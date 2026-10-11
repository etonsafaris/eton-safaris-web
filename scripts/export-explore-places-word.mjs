/**
 * One Word file per country: cultural and other non-wildlife places, with location.
 * Usage: node scripts/export-explore-places-word.mjs
 * Output: exports/explore-places/*.docx
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import { EXPLORE_PLACES } from './lib/explore-places.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(scriptDir, '..', 'exports', 'explore-places');

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function buildDocument(country, places) {
  const children = [
    new Paragraph({
      text: `${country} — places to explore`,
      heading: HeadingLevel.TITLE,
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Eton Safaris · ${places.length} places · cultural, historic, city, and scenic sites · not wildlife parks`,
          italics: true,
          size: 22,
        }),
      ],
      spacing: { after: 200 },
    }),
    new Paragraph({
      text: 'Each place is a candidate for the Explore module. The location line is the place to store in the Location field.',
      spacing: { after: 240 },
    }),
  ];

  const groups = new Map();
  for (const place of places) {
    if (!groups.has(place.kind)) groups.set(place.kind, []);
    groups.get(place.kind).push(place);
  }
  const order = ['Cultural', 'Historic', 'Religious', 'Museum', 'Market', 'City', 'Beach', 'Island', 'Scenic'];
  const kinds = [...groups.keys()].sort((a, b) => order.indexOf(a) - order.indexOf(b));

  for (const kind of kinds) {
    children.push(
      new Paragraph({
        text: kind,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 320 },
      })
    );
    for (const place of groups.get(kind).sort((a, b) => a.name.localeCompare(b.name))) {
      children.push(
        new Paragraph({
          text: place.name,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200 },
        })
      );
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Location: ', bold: true }),
            new TextRun({ text: place.location }),
          ],
          spacing: { after: 80 },
        })
      );
    }
  }

  return new Document({ sections: [{ children }] });
}

mkdirSync(OUT_DIR, { recursive: true });
const manifest = [];
for (const country of Object.keys(EXPLORE_PLACES).sort((a, b) => a.localeCompare(b))) {
  const places = EXPLORE_PLACES[country].map(([name, location, kind]) => ({ name, location, kind }));
  const fileName = `${slugify(country)}-places-to-explore.docx`;
  const buffer = await Packer.toBuffer(buildDocument(country, places));
  writeFileSync(resolve(OUT_DIR, fileName), buffer);
  manifest.push({ country, fileName, count: places.length });
  console.log(`${fileName}: ${places.length} places`);
}

const index = `<!doctype html><meta charset="utf-8"><title>Places to explore</title><h1>Places to explore</h1><ul>${manifest
  .map((item) => `<li><a href="${item.fileName}">${item.country}</a> — ${item.count} places</li>`)
  .join('')}</ul>`;
writeFileSync(resolve(OUT_DIR, 'index.html'), index);
console.log(`\nFolder: ${OUT_DIR}`);
