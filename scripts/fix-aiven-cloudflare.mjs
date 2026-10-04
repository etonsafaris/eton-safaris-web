/**
 * Full Aiven + Cloudflare Worker DB sync (Windows/macOS/Linux).
 *
 * Prerequisites:
 * - `.env.local` with a fresh DATABASE_URL (full Aiven Service URI)
 * - `npx wrangler login` completed once
 *
 * Usage: node scripts/fix-aiven-cloudflare.mjs
 *        node scripts/fix-aiven-cloudflare.mjs --deploy
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnvFile } from './lib/parse-env-file.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const ENV_FILE = process.env.CLOUDFLARE_ENV_FILE || resolve(ROOT, '.env.local');
const HYPERDRIVE_ID =
  process.env.HYPERDRIVE_ID || 'a4a877ce803d49dc8c12a55e4c84c438';
const WORKER_NAME = process.env.CLOUDFLARE_WORKER_NAME || 'eton-safaris-web';
const deployAfter = process.argv.includes('--deploy');

function run(command, args, extraEnv = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, ...extraEnv },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (!existsSync(ENV_FILE)) {
  console.error(`[DB fix] Missing ${ENV_FILE}. Set DATABASE_URL to your Aiven Service URI.`);
  process.exit(1);
}

const env = parseEnvFile(ENV_FILE);
const connectionString = String(env.DATABASE_URL || '').trim();
if (!connectionString) {
  console.error('[DB fix] DATABASE_URL is empty in', ENV_FILE);
  process.exit(1);
}

console.log('[DB fix] Step 1/3 — update Hyperdrive origin (from .env.local DATABASE_URL)');
run('npx', ['wrangler', 'hyperdrive', 'update', HYPERDRIVE_ID, '--connection-string', connectionString]);

console.log('[DB fix] Step 2/3 — push Worker secrets (DATABASE_URL + admin/email keys)');
run('node', ['scripts/push-worker-secrets.mjs']);

if (deployAfter) {
  console.log('[DB fix] Step 3/3 — redeploy Worker');
  const hyperdriveLocal = connectionString;
  run('npm', ['run', 'deploy:cloudflare'], {
    CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE: hyperdriveLocal,
    SKIP_BUILD_STAYS: '1',
    SKIP_BUILD_STATIC_PARAMS: '1',
  });
} else {
  console.log('[DB fix] Step 3/3 — skipped (run with --deploy to rebuild + wrangler deploy)');
  console.log('[DB fix] Quick redeploy: npm run deploy:cloudflare');
}

console.log('[DB fix] Verify: https://<your-worker>.workers.dev/api/health?deep=1');
