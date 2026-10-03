/**
 * Upload app secrets from `.env.local` to the Cloudflare Worker (like Vercel env sync).
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
  'DATABASE_URL',
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

if (!secrets.DATABASE_URL) {
  console.error('[CF] DATABASE_URL is required in', ENV_FILE);
  process.exit(1);
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
