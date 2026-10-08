/**
 * Generate keyword articles for all countries except those already done.
 * Usage: node scripts/generate-keyword-articles-remaining.mjs
 *        node scripts/generate-keyword-articles-remaining.mjs --skip uganda,kenya
 */
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const generator = resolve(scriptDir, 'generate-keyword-articles.mjs');

const ALL_COUNTRIES = [
  'uganda',
  'kenya',
  'tanzania',
  'rwanda',
  'botswana',
  'dr-congo',
  'egypt',
  'ethiopia',
  'madagascar',
  'malawi',
  'morocco',
  'mozambique',
  'namibia',
  'seychelles',
  'south-africa',
  'zambia',
  'zimbabwe',
];

const DEFAULT_SKIP = new Set(['uganda']);

function parseSkip(argv) {
  const skip = new Set(DEFAULT_SKIP);
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--skip' && argv[i + 1]) {
      for (const part of String(argv[++i]).split(',')) {
        const s = part.trim().toLowerCase();
        if (s) skip.add(s);
      }
    }
    if (argv[i] === '--no-default-skip') {
      skip.clear();
    }
  }
  return skip;
}

function runCountry(country) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [generator, '--country', country], {
      stdio: 'inherit',
      cwd: resolve(scriptDir, '..'),
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${country} exited with code ${code}`));
    });
  });
}

const skip = parseSkip(process.argv.slice(2));
const queue = ALL_COUNTRIES.filter((c) => !skip.has(c));

console.log(`Countries to generate: ${queue.join(', ')}`);
console.log(`Skipping: ${[...skip].join(', ') || '(none)'}\n`);

for (const country of queue) {
  console.log(`\n========== ${country.toUpperCase()} ==========\n`);
  await runCountry(country);
}

console.log('\nAll queued countries finished.');
