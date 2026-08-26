/**
 * Inspect Uganda tours used as packaging samples.
 * Usage: node scripts/inspect-uganda-tours.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

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
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

const [{ data: tours, error: tErr }, { data: cats, error: cErr }] = await Promise.all([
  sb.from('tours').select('*'),
  sb.from('categories').select('id,name,slug,country'),
]);
if (tErr) throw tErr;
if (cErr) throw cErr;

const uganda = (tours || []).filter((t) => String(t.country || '').toLowerCase().includes('uganda'));
const out = {
  totalTours: (tours || []).length,
  categories: (cats || []).map((c) => ({ country: c.country, name: c.name, slug: c.slug })),
  ugandaTours: uganda,
};
const path = resolve(process.cwd(), 'scripts/tmp-uganda-tours.json');
writeFileSync(path, JSON.stringify(out, null, 2));
console.log(`Wrote ${path}`);
console.log(`Categories: ${(cats || []).length}, Uganda tours: ${uganda.length}, All tours: ${(tours || []).length}`);
for (const t of uganda) {
  console.log('-', t.title, '|', t.category, '| days=', t.duration_days, '| slug=', t.slug);
}
