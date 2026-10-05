/**
 * Vercel production checklist (env + domains).
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

console.log('=== Vercel environment variables (Production) ===\n');
for (const key of KEYS) {
  const set = Boolean(String(env[key] || '').trim());
  console.log(`  ${set ? '✓' : '○'} ${key}${key === 'DATABASE_URL' ? ' (Aiven Service URI)' : ''}`);
}
console.log('\n  ✓ NEXT_PUBLIC_SITE_URL — set in vercel.json to https://etonsafaris.com');
console.log('  (Or override in Vercel UI if you use a different canonical host.)\n');

console.log('=== Vercel domains (same project: eton-safaris-web) ===\n');
console.log('  Project → Settings → Domains — add all three, wait for Valid + SSL:\n');
console.log('    • etonsafaris.com          (apex — use the A / ALIAS records Vercel shows for this domain)');
console.log('    • www.etonsafaris.com      (CNAME → cname.vercel-dns.com or value from UI)');
console.log('    • admin.etonsafaris.com    (CNAME → cname.vercel-dns.com or value from UI)\n');
console.log('  Remove Netlify / Cloudflare Pages DNS on these names.');
console.log('  www → apex redirect is in vercel.json.\n');

console.log('=== After DNS propagates ===\n');
console.log('  https://etonsafaris.com/');
console.log('  https://admin.etonsafaris.com/login');
console.log('  https://<project>.vercel.app/api/health?deep=1 → database connected\n');
