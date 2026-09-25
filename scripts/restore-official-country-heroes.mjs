/**
 * Restore the 12 canonical country hero files + 5 community heroes from git history.
 *
 *   node scripts/restore-official-country-heroes.mjs
 */
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const root = process.cwd();
const heroesDir = join(root, 'public', 'heroes');
if (!existsSync(heroesDir)) mkdirSync(heroesDir, { recursive: true });

const from7039 = [
  'botswana.jpg',
  'dr-congo.jpg',
  'ethiopia.jpg',
  'kenya.jpg',
  'namibia.jpg',
  'tanzania.jpg',
  'uganda.jpg',
];

const fromE02 = [
  'rwanda.webp',
  'egypt.webp',
  'malawi.webp',
  'south-africa.webp',
  'zambia.webp',
  'community-conservation-1440.webp',
  'community-employment-1440.webp',
  'community-hero-768.webp',
  'community-tourism-1440.webp',
  'talk-to-us-480.webp',
];

function checkout(commit, files) {
  const paths = files.map((f) => `public/heroes/${f}`).join(' ');
  execSync(`git checkout ${commit} -- ${paths}`, { cwd: root, stdio: 'inherit' });
}

checkout('7039cb0', from7039);
checkout('e02d0e1', fromE02);

console.log('Official country + community heroes restored.');
