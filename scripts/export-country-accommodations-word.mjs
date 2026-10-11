/**
 * One Word file per country: accommodation names only, with the national park beside each one.
 *
 * Usage: node scripts/export-country-accommodations-word.mjs
 * Output: exports/accommodations-by-country/*.docx
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';
import { parseEnvFile } from './lib/parse-env-file.mjs';
import { extraStayRecords } from './lib/extra-accommodations.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(scriptDir, '..', 'exports', 'accommodations-by-country');

const PUBLISHED = new Set(['published', 'publish', 'live', 'public', 'active', 'visible', 'released']);
const UNPUBLISHED = new Set(['draft', 'unpublished', 'deleted', 'archived', 'private', 'hidden', 'admin-only', 'admin only']);
const SKIP_STAY = /no accommodation|no overnight|depart after breakfast|overnight near/i;

/** Ordered rules. The first matching pattern wins. City and beach nights stay blank. */
const PARK_RULES = {
  Botswana: [
    [/kalahari plains|central kalahari/, 'Central Kalahari Game Reserve'],
    [/savute|chobe safari|cresta mowana|chobe/, 'Chobe National Park'],
    [/camp okavango|moremi|nxamaseri|thamalakane/, 'Moremi Game Reserve'],
    [/makgadikgadi|nxai/, 'Makgadikgadi Pans National Park'],
  ],
  'DR Congo': [
    [/kahuzi/, 'Kahuzi Biega National Park'],
    [/bukima|mikeno|virunga|goma|lake kivu/, 'Virunga National Park'],
  ],
  Ethiopia: [
    [/bale|buska/, 'Bale Mountains National Park'],
    [/simien|goha|gondar/, 'Simien Mountains National Park'],
    [/omo/, 'Omo National Park'],
    [/kuriftu|awash/, 'Awash National Park'],
  ],
  Kenya: [
    [/amboseli|ol tukai|tawi/, 'Amboseli National Park'],
    [/aruba|tsavo east/, 'Tsavo East National Park'],
    [/tsavo west/, 'Tsavo West National Park'],
    [/nakuru/, 'Lake Nakuru National Park'],
    [/samburu/, 'Samburu National Reserve'],
    [/sweetwaters|ol pejeta|nanyuki/, 'Mount Kenya National Park'],
    [/keekorok|mara serena|sarova mara|masai mara|\bmara\b/, 'Masai Mara National Reserve'],
  ],
  Madagascar: [
    [/isalo|relais de la reine/, 'Isalo National Park'],
    [/setam|vakona|andasibe/, 'Andasibe Mantadia National Park'],
    [/ravintsara|lokobe|nosy be/, 'Lokobe National Park'],
  ],
  Malawi: [
    [/chelinda|nyika/, 'Nyika National Park'],
    [/mkulumadzi|majete/, 'Majete Wildlife Reserve'],
    [/mvuu|liwonde/, 'Liwonde National Park'],
    [/kaya mawa|mumbo|pumulani|kutangale|lake malawi/, 'Lake Malawi National Park'],
  ],
  Morocco: [
    [/merzouga|tombouctou|desert luxury/, 'Iriqui National Park'],
    [/atlas kasbah|souss/, 'Souss Massa National Park'],
    [/sahrai|riad fes|ifrane/, 'Ifrane National Park'],
    [/kniza|marrakech|toubkal/, 'Toubkal National Park'],
  ],
  Mozambique: [
    [/benguerra|baia sonambula|bazaruto/, 'Bazaruto Archipelago National Park'],
    [/medjumbe|quilalea|pemba|quirimbas/, 'Quirimbas National Park'],
    [/gorongosa/, 'Gorongosa National Park'],
  ],
  Namibia: [
    [/etosha|halali|okaukuejo/, 'Etosha National Park'],
    [/sossusvlei|namib desert/, 'Namib Naukluft National Park'],
    [/canyon village|ai-ais|fish river/, 'Ai-Ais Richtersveld Transfrontier Park'],
    [/swakopmund|dorob/, 'Dorob National Park'],
    [/damaraland|skeleton/, 'Skeleton Coast National Park'],
  ],
  Rwanda: [
    [/akagera|ruzizi/, 'Akagera National Park'],
    [/nyungwe/, 'Nyungwe National Park'],
    [/bisate|five volcanoes|gorilla view|virunga lodge|volcanoes/, 'Volcanoes National Park'],
    [/lake kivu/, 'Volcanoes National Park'],
  ],
  Seychelles: [
    [/coco de mer|paradise sun|domaine de la reserve|praslin|vallee/, 'Vallee de Mai Nature Reserve'],
    [/la digue/, ''],
    [/berjaya|beau vallon|coral strand|rocher|morne/, 'Morne Seychellois National Park'],
  ],
  'South Africa': [
    [/addo/, 'Addo Elephant National Park'],
    [/bakubung|pilanesberg/, 'Pilanesberg National Park'],
    [/cape grace|table mountain|cape town/, 'Table Mountain National Park'],
    [/hilltop|hluhluwe/, 'Hluhluwe-iMfolozi Park'],
    [/kruger|skukuza|sabi sabi|singita|protea hotel kruger/, 'Kruger National Park'],
  ],
  Tanzania: [
    [/kibo|kilimanjaro/, 'Kilimanjaro National Park'],
    [/tarangire|kirurumu/, 'Tarangire National Park'],
    [/manyara/, 'Lake Manyara National Park'],
    [/ngorongoro/, 'Ngorongoro Conservation Area'],
    [/mbalageti|serengeti/, 'Serengeti National Park'],
    [/ruaha/, 'Ruaha National Park'],
  ],
  Uganda: [
    [/mburo|mihingo/, 'Lake Mburo National Park'],
    [/kidepo|apoka/, 'Kidepo Valley National Park'],
    [/murchison|paraa/, 'Murchison Falls National Park'],
    [/queen elizabeth|mweya/, 'Queen Elizabeth National Park'],
    [/kibale/, 'Kibale National Park'],
    [/kitandara|rwenzori/, 'Rwenzori Mountains National Park'],
    [/buhoma|engagi|ichumbi|nshongi|silverback|mahogany|bwindi/, 'Bwindi Impenetrable National Park'],
    [/mgahinga/, 'Mgahinga Gorilla National Park'],
    [/semuliki/, 'Semuliki National Park'],
  ],
  Zambia: [
    [/chinzombo|flatdogs|mfuwe|nsefu|south luangwa/, 'South Luangwa National Park'],
    [/chongwe|lower zambezi/, 'Lower Zambezi National Park'],
    [/kaingu|kafue/, 'Kafue National Park'],
    [/royal chundu|tongabezi|mosi|victoria falls/, 'Mosi-oa-Tunya National Park'],
  ],
  Zimbabwe: [
    [/hwange|somalisa|the hide/, 'Hwange National Park'],
    [/bumi|matusadona/, 'Matusadona National Park'],
    [/ruckomechi|mana pools/, 'Mana Pools National Park'],
    [/victoria falls safari|victoria falls/, 'Victoria Falls National Park'],
  ],
};

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
    const value = row?.[key];
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return '';
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
  return true;
}

function daysOf(value) {
  let parsed = value;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.days)) return parsed.days;
  if (parsed && Array.isArray(parsed.itineraries)) return parsed.itineraries;
  return [];
}

function stayName(day) {
  return String(day?.accommodationPlan || day?.accommodation_plan || day?.accommodation || '').trim();
}

function parkFor(country, name) {
  const hay = name.toLowerCase();
  for (const [pattern, park] of PARK_RULES[country] || []) {
    if (pattern.test(hay)) return park;
  }
  return '';
}

function stayKey(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function buildDocument(country, stays) {
  const luxury = stays.filter((stay) => stay.grade === 'Luxury').length;
  const mid = stays.length - luxury;
  const children = [
    new Paragraph({
      text: `${country} accommodations`,
      heading: HeadingLevel.TITLE,
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Eton Safaris · ${stays.length} accommodations · ${luxury} luxury · ${mid} mid-range`,
          italics: true,
          size: 22,
        }),
      ],
      spacing: { after: 200 },
    }),
    new Paragraph({
      text: 'Luxury stays are listed first, then mid-range. Each name is followed by the park it sits beside, or the city when the hotel is away from the parks.',
      spacing: { after: 240 },
    }),
  ];

  for (const grade of ['Luxury', 'Mid-range']) {
    const gradeStays = stays.filter((stay) => stay.grade === grade);
    if (!gradeStays.length) continue;
    children.push(
      new Paragraph({
        text: grade,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 360 },
      })
    );
    const groups = new Map();
    for (const stay of gradeStays) {
      const place = stay.place || 'City stay';
      if (!groups.has(place)) groups.set(place, []);
      groups.get(place).push(stay);
    }
    for (const place of [...groups.keys()].sort((a, b) => a.localeCompare(b))) {
      children.push(
        new Paragraph({
          text: place,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240 },
        })
      );
      for (const stay of groups.get(place).sort((a, b) => a.name.localeCompare(b.name))) {
        children.push(
          new Paragraph({
            text: stay.name,
            spacing: { after: 80 },
          })
        );
      }
    }
  }

  return new Document({ sections: [{ children }] });
}

const env = parseEnvFile(resolve(scriptDir, '..', '.env.local'));
const url = String(env.DATABASE_URL || '').trim();
if (!url) {
  console.error('DATABASE_URL is empty');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: url.replace(/[?&]sslmode=\w+/g, ''),
  ssl: { rejectUnauthorized: false },
  max: 1,
});

let tourRows = [];
try {
  const tours = await pool.query(
    `SELECT id, title, slug, seo_slug, country, itinerary
     FROM tours
     WHERE itinerary IS NOT NULL`
  );
  tourRows = tours.rows || [];
} catch (error) {
  console.warn('Database is busy, writing the accommodation lists already prepared:', error.message);
} finally {
  await pool.end().catch(() => {});
}

const byCountry = new Map();
function ensureCountry(country) {
  if (!byCountry.has(country)) byCountry.set(country, new Map());
  return byCountry.get(country);
}
for (const tour of tourRows.filter(isPublishedTour)) {
  const country = pickString(tour, ['country']) || 'Other';
  const stays = ensureCountry(country);
  for (const day of daysOf(tour.itinerary)) {
    const name = stayName(day);
    if (!name || SKIP_STAY.test(name)) continue;
    const key = stayKey(name);
    if (!stays.has(key)) {
      const park = parkFor(country, name);
      stays.set(key, {
        name,
        grade: 'Mid-range',
        place: park ? `At or beside ${park}` : 'City stay',
      });
    }
  }
}
for (const [country, extras] of Object.entries(extraStayRecords())) {
  const stays = ensureCountry(country);
  for (const extra of extras) {
    const key = stayKey(extra.name);
    const current = stays.get(key);
    if (!current) {
      stays.set(key, extra);
      continue;
    }
    stays.set(key, { name: current.name, grade: extra.grade, place: extra.place });
  }
}

mkdirSync(OUT_DIR, { recursive: true });
const manifest = [];
for (const country of [...byCountry.keys()].sort((a, b) => a.localeCompare(b))) {
  const stays = [...byCountry.get(country).values()].sort((a, b) => a.name.localeCompare(b.name));
  if (!stays.length) continue;
  let fileName = `${slugify(country) || 'other'}-accommodations.docx`;
  const buffer = await Packer.toBuffer(buildDocument(country, stays));
  try {
    writeFileSync(resolve(OUT_DIR, fileName), buffer);
  } catch (error) {
    if (error?.code !== 'EBUSY') throw error;
    fileName = `${slugify(country) || 'other'}-accommodations-updated.docx`;
    writeFileSync(resolve(OUT_DIR, fileName), buffer);
    console.log(`Original file is open, wrote ${fileName} instead`);
  }
  const luxury = stays.filter((stay) => stay.grade === 'Luxury').length;
  manifest.push({ country, fileName, stays: stays.length, luxury });
  console.log(`${fileName}: ${stays.length} accommodations (${luxury} luxury, ${stays.length - luxury} mid-range)`);
}

const index = `<!doctype html><meta charset="utf-8"><title>Accommodations by country</title><h1>Accommodations by country</h1><ul>${manifest
  .map((item) => `<li><a href="${item.fileName}">${item.country}</a> — ${item.stays} accommodations</li>`)
  .join('')}</ul>`;
writeFileSync(resolve(OUT_DIR, 'index.html'), index);
console.log(`\nFolder: ${OUT_DIR}`);
