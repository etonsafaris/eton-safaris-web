import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { lookup } from 'dns/promises';

function loadEnv() {
  const file = resolve(process.cwd(), '.env.local');
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const host = new URL(url).host;
try {
  const r = await lookup(host);
  console.log(JSON.stringify({ host, address: r.address }));
} catch (error) {
  console.log(JSON.stringify({ host, dnsError: error instanceof Error ? error.message : String(error) }));
}

const sb = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '', {
  auth: { persistSession: false },
});
const t0 = Date.now();
const { count, error } = await sb.from('countries').select('id', { count: 'exact', head: true });
console.log(JSON.stringify({ count, ms: Date.now() - t0, err: error?.message || null }));
