/**
 * One-command deploy from your PC (Vercel-style):
 *   npm run deploy:cloudflare
 *
 * 1. Sync secrets from `.env.local` → Cloudflare Worker
 * 2. Ensure Hyperdrive binding for Aiven PostgreSQL
 * 3. OpenNext build + `wrangler deploy`
 */
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { parseEnvFile } from './lib/parse-env-file.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const ENV_FILE = process.env.CLOUDFLARE_ENV_FILE || resolve(ROOT, '.env.local');

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

console.log('[CF] Step 1/3 — push Worker secrets from .env.local');
run('node', ['scripts/push-worker-secrets.mjs']);

console.log('[CF] Step 2/3 — ensure Hyperdrive for Aiven');
run('node', ['scripts/ensure-hyperdrive.mjs']);

const localEnv = parseEnvFile(ENV_FILE);
const hyperdriveLocal = String(localEnv.DATABASE_URL || '').trim();

console.log('[CF] Step 3/3 — build and deploy Worker');
run('npm', ['run', 'deploy'], {
  SKIP_BUILD_STAYS: '1',
  SKIP_BUILD_STATIC_PARAMS: '1',
  ...(hyperdriveLocal
    ? { CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE: hyperdriveLocal }
    : {}),
});

console.log('[CF] Deploy complete. Test: /api/health?deep=1 on your Worker URL or custom domain.');
