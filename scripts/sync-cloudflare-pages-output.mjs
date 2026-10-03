/**
 * Wrangler expects `.open-next/.cloudflare`; @cloudflare/next-on-pages writes `.vercel/output/static`.
 * Copy build output and remove Cloudflare default Hello World index.html if present.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';

const src = resolve(process.cwd(), '.vercel/output/static');
const dest = resolve(process.cwd(), '.open-next/.cloudflare');

if (!existsSync(src)) {
  console.error('[CF] Missing .vercel/output/static — run @cloudflare/next-on-pages first.');
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });

const indexPath = resolve(dest, 'index.html');
if (existsSync(indexPath)) {
  const text = readFileSync(indexPath, 'utf8');
  if (/hello\s*world/i.test(text) && text.length < 2000) {
    unlinkSync(indexPath);
    console.warn('[CF] Removed placeholder index.html from Pages output.');
  }
}

console.log('[CF] Synced Pages output → .open-next/.cloudflare');
