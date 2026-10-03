/**
 * Cloudflare Pages/Workers CI runs `npm run build`.
 * OpenNext must run instead of plain `next build` on Cloudflare.
 */
import { spawnSync } from 'node:child_process';

// Cloudflare Pages sets CF_PAGES=1. Workers CI often sets CLOUDFLARE_ACCOUNT_ID during build.
const onCloudflare =
  process.env.CF_PAGES === '1' ||
  process.env.CLOUDFLARE_PAGES === '1' ||
  Boolean(process.env.CLOUDFLARE_ACCOUNT_ID?.trim()) ||
  process.env.DEPLOY_TARGET === 'cloudflare';

const args = onCloudflare
  ? ['run', 'build:cloudflare']
  : ['run', 'build:next'];

const result = spawnSync('npm', args, {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

process.exit(result.status === 0 ? 0 : result.status ?? 1);
