/**
 * Monitoring setup helper for etonsafaris.com (code + external dashboards).
 * Usage: npm run monitoring:setup
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PROJECT = 'eton-safaris-web';
const TEAM_SLUG = process.env.VERCEL_TEAM_SLUG || '';
const teamPath = TEAM_SLUG ? `/${TEAM_SLUG}` : '';

const links = {
  vercelAnalytics: `https://vercel.com${teamPath}/${PROJECT}/analytics`,
  vercelSpeed: `https://vercel.com${teamPath}/${PROJECT}/speed-insights`,
  vercelLogs: `https://vercel.com${teamPath}/${PROJECT}/logs`,
  vercelObservability: `https://vercel.com${teamPath}/${PROJECT}/observability`,
  vercelEnv: `https://vercel.com${teamPath}/${PROJECT}/settings/environment-variables`,
  searchConsole: 'https://search.google.com/search-console/welcome',
  pagespeed: 'https://pagespeed.web.dev/analysis?url=https%3A%2F%2Fwww.etonsafaris.com',
  uptimerobot: 'https://uptimerobot.com/dashboard',
  sentry: 'https://sentry.io/signup/',
  aiven: 'https://console.aiven.io/',
};

console.log('=== Eton Safaris — monitoring setup ===\n');
console.log('Already wired in this repo after deploy:');
console.log('  • @vercel/analytics + @vercel/speed-insights (app/layout via SiteMonitoring)');
console.log('  • Sentry SDK (active when SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN is set)');
console.log('  • GA4 (when NEXT_PUBLIC_GA_MEASUREMENT_ID is set)');
console.log('  • Google Search Console HTML tag (when GOOGLE_SITE_VERIFICATION is set)\n');

console.log('--- 1) Vercel (enable in dashboard once) ---');
console.log(`  Analytics:       ${links.vercelAnalytics}`);
console.log('    → Enable Web Analytics for Production');
console.log(`  Speed Insights:  ${links.vercelSpeed}`);
console.log('    → Enable Speed Insights for Production');
console.log(`  Logs / errors:   ${links.vercelLogs}\n`);

console.log('--- 2) Vercel environment variables (optional) ---');
console.log(`  ${links.vercelEnv}`);
console.log('  NEXT_PUBLIC_GA_MEASUREMENT_ID   — GA4 property (G-XXXXXXXX)');
console.log('  GOOGLE_SITE_VERIFICATION        — Search Console meta content value');
console.log('  SENTRY_DSN                      — Sentry project DSN');
console.log('  NEXT_PUBLIC_SENTRY_DSN          — same DSN (client errors)');
console.log('  SENTRY_ORG / SENTRY_PROJECT     — only if you upload source maps in CI\n');

console.log('--- 3) UptimeRobot (free) — create these monitors ---');
const monitorsPath = resolve(import.meta.dirname, 'uptimerobot-monitors.json');
const { monitors } = JSON.parse(readFileSync(monitorsPath, 'utf8'));
for (const m of monitors) {
  const kw = m.keyword ? ` (alert if body missing "${m.keyword}")` : '';
  console.log(`  • ${m.friendly_name}: ${m.url}${kw}`);
}
console.log(`  Dashboard: ${links.uptimerobot}\n`);

console.log('--- 4) Google Search Console ---');
console.log(`  ${links.searchConsole}`);
console.log('  Add property: https://www.etonsafaris.com');
console.log('  Verify: HTML tag → copy content= value into GOOGLE_SITE_VERIFICATION on Vercel\n');

console.log('--- 5) Sentry (optional errors + performance) ---');
console.log(`  ${links.sentry}`);
console.log('  Create Next.js project → paste DSN into Vercel env vars above\n');

console.log('--- 6) Aiven PostgreSQL ---');
console.log(`  ${links.aiven}`);
console.log('  Watch: active connections, CPU, disk, slow query log\n');

console.log('--- Quick checks ---');
console.log('  https://www.etonsafaris.com/api/system/health?deep=1');
console.log(`  PageSpeed: ${links.pagespeed}\n`);
