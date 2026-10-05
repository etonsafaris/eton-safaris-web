/**
 * Prints env vars to set in Vercel (Project → Settings → Environment Variables).
 * Usage: node scripts/vercel-env-checklist.mjs
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnvFile } from './lib/parse-env-file.mjs';

const ENV_FILE = resolve(import.meta.dirname, '..', '.env.local');
const KEYS = [
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

const env = existsSync(ENV_FILE) ? parseEnvFile(ENV_FILE) : {};
console.log('Set these in Vercel for Production (+ Preview if you use preview DB):\n');
for (const key of KEYS) {
  const set = Boolean(String(env[key] || '').trim());
  console.log(`  ${set ? '✓' : '○'} ${key}${key === 'DATABASE_URL' ? ' (Aiven Service URI, sslmode=require)' : ''}`);
}
console.log('\nOptional: VERCEL_URL is set automatically by Vercel.');
console.log('Domains: add etonsafaris.com, www, and admin.etonsafaris.com in Project → Domains.');
