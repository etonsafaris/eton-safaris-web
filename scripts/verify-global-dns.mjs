/**
 * Quick DNS check for etonsafaris.com (public resolvers).
 * Usage: node scripts/verify-global-dns.mjs
 */
import dns from 'node:dns/promises';

const HOSTS = ['etonsafaris.com', 'www.etonsafaris.com', 'admin.etonsafaris.com'];
const RESOLVERS = ['8.8.8.8', '1.1.1.1', '9.9.9.9'];

async function lookupVia(resolver, host) {
  const r = new dns.Resolver();
  r.setServers([resolver]);
  try {
    const a = await r.resolve4(host).catch(() => []);
    const cname = await r.resolveCname(host).catch(() => []);
    return { a, cname };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

console.log('=== Global DNS (A / CNAME) ===\n');
for (const host of HOSTS) {
  console.log(host);
  for (const resolver of RESOLVERS) {
    const result = await lookupVia(resolver, host);
    if (result.error) {
      console.log(`  ${resolver}: ERROR ${result.error}`);
    } else if (result.cname?.length) {
      console.log(`  ${resolver}: CNAME → ${result.cname.join(', ')}`);
    } else if (result.a?.length) {
      console.log(`  ${resolver}: A → ${result.a.join(', ')}`);
    } else {
      console.log(`  ${resolver}: (no A record)`);
    }
  }
  console.log('');
}

console.log('Expected: apex A on Vercel (e.g. 216.150.1.1); www/admin CNAME to *.vercel-dns-*.com');
console.log('If Windows browser says "can\'t be reached" but this script works, flush DNS: ipconfig /flushdns');
