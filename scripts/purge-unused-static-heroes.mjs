/**
 * Delete unreferenced files under public/heroes (and report phantom code references).
 *
 *   node scripts/purge-unused-static-heroes.mjs
 *   node scripts/purge-unused-static-heroes.mjs --execute
 */
import { readFileSync, existsSync, readdirSync, unlinkSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';

const root = process.cwd();
const heroesDir = join(root, 'public', 'heroes');
const execute = process.argv.includes('--execute');

const extensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.jsx', '.css', '.md', '.json']);

function walk(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      walk(full, files);
    } else if (extensions.has(entry.name.slice(entry.name.lastIndexOf('.')))) {
      files.push(full);
    }
  }
  return files;
}

const corpus = walk(root).map((file) => readFileSync(file, 'utf8')).join('\n');
/** Canonical filenames only — see lib/official-country-assets.ts */
const OFFICIAL_COUNTRY_FILENAMES = new Set([
  'uganda.jpg',
  'kenya.jpg',
  'tanzania.jpg',
  'rwanda.webp',
  'botswana.jpg',
  'egypt.webp',
  'namibia.jpg',
  'south-africa.webp',
  'dr-congo.jpg',
  'ethiopia.jpg',
  'malawi.webp',
  'zambia.webp',
]);

const alwaysKeep = new Set([
  '/eton-safaris-gorilla.png',
  '/heroes/community-hero-768.webp',
  '/heroes/community-tourism-1440.webp',
  '/heroes/community-conservation-1440.webp',
  '/heroes/community-employment-1440.webp',
  '/heroes/talk-to-us-480.webp',
]);

function isProtectedHeroFile(name) {
  const pathRef = `/heroes/${name}`;
  if (alwaysKeep.has(pathRef)) return true;
  return OFFICIAL_COUNTRY_FILENAMES.has(name);
}

if (!existsSync(heroesDir)) {
  console.log('No public/heroes directory.');
  process.exit(0);
}

const onDisk = readdirSync(heroesDir).filter((name) => statSync(join(heroesDir, name)).isFile());
const unused = [];
const used = [];

for (const name of onDisk) {
  const pathRef = `/heroes/${name}`;
  if (isProtectedHeroFile(name) || alwaysKeep.has(pathRef) || corpus.includes(pathRef) || corpus.includes(name)) {
    used.push(name);
    continue;
  }
  unused.push(name);
}

console.log(JSON.stringify({ used, unused, mode: execute ? 'execute' : 'dry-run' }, null, 2));

if (execute) {
  for (const name of unused) {
    unlinkSync(join(heroesDir, name));
    console.log('Deleted', relative(root, join(heroesDir, name)));
  }
}
