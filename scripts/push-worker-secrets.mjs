/**
 * Upload app secrets from `.env.local` to the Cloudflare Worker (like Vercel env sync).
 *
 * Production DB: use the Worker `HYPERDRIVE` binding (wrangler.jsonc). Keep the real Aiven
 * Service URI in `.env.local` for `npm run db:fix-cloudflare` / Hyperdrive origin updates only.
 * By default DATABASE_URL is NOT uploaded to the Worker (avoids direct Aiven from edge).
 * Set WORKER_PUSH_DATABASE_URL=1 only if you intentionally need that secret on the Worker.
 *
 * Usage: node scripts/push-worker-secrets.mjs
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnvFile } from './lib/parse-env-file.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const WORKER_NAME = process.env.CLOUDFLARE_WORKER_NAME || 'eton-safaris-web';
const ENV_FILE = process.env.CLOUDFLARE_ENV_FILE || resolve(ROOT, '.env.local');

const SECRET_KEYS = [
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
  'NEXTAUTH_SECRET',
  'RESEND_API_KEY',
  'RESEND_FROM',
  'CRON_SECRET',
  'PESAPAL_CONSUMER_KEY',
  'PESAPAL_CONSUMER_SECRET',
  'PESAPAL_IPN_ID',
];

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (!existsSync(ENV_FILE)) {
  console.error(`[CF] Missing env file: ${ENV_FILE}`);
  console.error('Copy .env.example to .env.local and set DATABASE_URL, then retry.');
  process.exit(1);
}

const env = parseEnvFile(ENV_FILE);
const secrets = {};
for (const key of SECRET_KEYS) {
  const value = String(env[key] || '').trim();
  if (value) secrets[key] = value;
}

const databaseUrl = String(env.DATABASE_URL || '').trim();
if (!databaseUrl) {
  console.error('[CF] DATABASE_URL is required in', ENV_FILE, '(for Hyperdrive origin sync / local dev).');
  process.exit(1);
}
if (process.env.WORKER_PUSH_DATABASE_URL === '1') {
  secrets.DATABASE_URL = databaseUrl;
  console.log('[CF] Including DATABASE_URL on Worker (WORKER_PUSH_DATABASE_URL=1).');
} else {
  console.log('[CF] Skipping DATABASE_URL on Worker — use Hyperdrive binding for production queries.');
}

const bulkPath = resolve(ROOT, '.wrangler-secrets.bulk.json');
writeFileSync(bulkPath, JSON.stringify(secrets, null, 2), 'utf8');

console.log(`[CF] Uploading ${Object.keys(secrets).length} secrets to Worker "${WORKER_NAME}"…`);
run('npx', ['wrangler', 'secret', 'bulk', bulkPath, '--name', WORKER_NAME]);

try {
  unlinkSync(bulkPath);
} catch {
  /* ignore */
}

console.log('[CF] Worker secrets updated.');
