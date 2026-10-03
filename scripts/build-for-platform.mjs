/**
 * Cloudflare Pages/Workers CI runs `npm run build`.
 * OpenNext must run instead of plain `next build` on Cloudflare.
 */
import { spawnSync } from 'node:child_process';

const onCloudflare =
  process.env.CF_PAGES === '1' ||
  process.env.CLOUDFLARE_PAGES === '1' ||
  process.env.CLOUDFLARE_ACCOUNT_ID ||
  process.env.WRANGLER_SEND_METRICS !== undefined;

const args = onCloudflare
  ? ['run', 'build:cloudflare']
  : ['run', 'build:next'];

const result = spawnSync('npm', args, {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

process.exit(result.status === 0 ? 0 : result.status ?? 1);
