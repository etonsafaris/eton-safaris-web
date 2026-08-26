/**
 * Quick inspect of Bwindi (or --slug) park embedded blocks.
 * Usage: node scripts/inspect-bwindi-blocks.mjs
 *        node scripts/inspect-bwindi-blocks.mjs --slug queen-elizabeth-national-park
 */
import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'fs';
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
const args = process.argv.slice(2);
const slugIdx = args.indexOf('--slug');
const slug = slugIdx >= 0 ? String(args[slugIdx + 1] || '').trim() : 'bwindi-impenetrable-national-park';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

const { data, error } = await sb
  .from('national_park')
  .select('id,name,country,description')
  .ilike('name', `%${slug.replace(/-/g, '%')}%`)
  .limit(3);

if (error) {
  console.error(error);
  process.exit(1);
}

for (const row of data || []) {
  const desc = String(row.description || '');
  const match = desc.match(/<!--ETON_CONTENT:([\s\S]*?)-->/);
  let blocks = [];
  if (match) {
    try {
      const payload = JSON.parse(decodeURIComponent(match[1]));
      blocks = Array.isArray(payload.blocks) ? payload.blocks : [];
    } catch (err) {
      console.error('parse fail', err.message);
    }
  }
  console.log(
    JSON.stringify(
      {
        id: row.id,
        name: row.name,
        country: row.country,
        blockCount: blocks.length,
        blockTitles: blocks.map((b) => b.title),
      },
      null,
      2
    )
  );
}
