/**
 * Remove duplicate / legacy country hero files; keep only official canonical paths + community heroes.
 *
 *   node scripts/prune-conflicting-country-heroes.mjs
 *   node scripts/prune-conflicting-country-heroes.mjs --execute
 */
import { existsSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const heroesDir = join(root, 'public', 'heroes');
const execute = process.argv.includes('--execute');

const OFFICIAL = new Set([
  '/heroes/uganda.jpg',
  '/heroes/kenya.jpg',
  '/heroes/tanzania.jpg',
  '/heroes/rwanda.webp',
  '/heroes/botswana.jpg',
  '/heroes/egypt.webp',
  '/heroes/namibia.jpg',
  '/heroes/south-africa.webp',
  '/heroes/dr-congo.jpg',
  '/heroes/ethiopia.jpg',
  '/heroes/malawi.webp',
  '/heroes/zambia.webp',
]);

const COMMUNITY = new Set([
  '/heroes/community-hero-768.webp',
  '/heroes/community-tourism-1440.webp',
  '/heroes/community-conservation-1440.webp',
  '/heroes/community-employment-1440.webp',
  '/heroes/talk-to-us-480.webp',
]);

const COUNTRY_BASES = [
  'botswana',
  'dr-congo',
  'egypt',
  'ethiopia',
  'kenya',
  'malawi',
  'namibia',
  'rwanda',
  'south-africa',
  'tanzania',
  'uganda',
  'zambia',
];

function isCountryAsset(name) {
  return COUNTRY_BASES.some((base) => name === base || name.startsWith(`${base}.`) || name.startsWith(`${base}-`));
}

if (!existsSync(heroesDir)) {
  console.log('No public/heroes directory.');
  process.exit(0);
}

const keep = new Set([...OFFICIAL, ...COMMUNITY].map((p) => p.replace('/heroes/', '')));
const remove = [];

for (const name of readdirSync(heroesDir)) {
  const full = join(heroesDir, name);
  if (!statSync(full).isFile()) continue;
  if (keep.has(name)) continue;
  if (isCountryAsset(name)) remove.push(name);
  if (/^community-/i.test(name) && !COMMUNITY.has(`/heroes/${name}`)) remove.push(name);
  if (/^talk-to-us/i.test(name) && name !== 'talk-to-us-480.webp') remove.push(name);
}

const unique = [...new Set(remove)];
console.log(JSON.stringify({ keep: [...keep].sort(), remove: unique.sort(), mode: execute ? 'execute' : 'dry-run' }, null, 2));

if (execute) {
  for (const name of unique) {
    unlinkSync(join(heroesDir, name));
    console.log('Deleted', relative(root, join(heroesDir, name)));
  }
}
