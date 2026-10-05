/**
 * Push DATABASE_URL from .env.local to Vercel Production (non-interactive).
 * Requires: vercel CLI logged in, project linked (.vercel/project.json).
 *
 * Usage: node scripts/push-vercel-database-url.mjs
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseEnvFile } from './lib/parse-env-file.mjs';

const root = resolve(import.meta.dirname, '..');
const ENV_FILE = resolve(root, '.env.local');
if (!existsSync(ENV_FILE)) {
  console.error('Missing .env.local');
  process.exit(1);
}

const env = parseEnvFile(ENV_FILE);
const url = String(env.DATABASE_URL || '').trim();
if (!url) {
  console.error('DATABASE_URL is empty in .env.local');
  process.exit(1);
}

const targets = 'production,preview,development';
/** Stdin avoids putting the URI (password) in the process command line on Windows. */
const add = spawnSync(`npx vercel env add DATABASE_URL ${targets} --sensitive --force --yes`, {
  cwd: root,
  input: `${url}\n`,
  encoding: 'utf8',
  shell: true,
  stdio: ['pipe', 'pipe', 'pipe'],
});
if (add.status !== 0) {
  console.error('Failed to set DATABASE_URL:', add.error?.message || add.stderr || add.stdout || `exit ${add.status}`);
  process.exit(add.status || 1);
}
console.log(`✓ DATABASE_URL updated for ${targets}`);

console.log('\nRedeploy production so new env is picked up:');
console.log('  npx vercel --prod');
