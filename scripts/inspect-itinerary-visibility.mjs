/**
 * Deeper itinerary quality audit + seo_schema robots persistence check.
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
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

function parseEmbedded(description) {
  const match = String(description || '').match(/<!--ETON_CONTENT:([\s\S]*?)-->/);
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    try {
      return JSON.parse(match[1]);
    } catch {
      return null;
    }
  }
}

function parseItineraryCol(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.days)) return parsed.days;
    if (Array.isArray(parsed?.itineraries)) return parsed.itineraries;
  } catch {
    /* ignore */
  }
  return [];
}

function dayQuality(days) {
  if (!days.length) return 'empty';
  const withTitle = days.filter((d) => String(d?.title || '').trim()).length;
  const withDesc = days.filter((d) => String(d?.description || '').trim().length > 40).length;
  if (withTitle === 0) return 'no-titles';
  if (withDesc < Math.ceil(days.length * 0.5)) return 'thin-desc';
  return 'ok';
}

const pageSize = 500;
let from = 0;
const stats = {
  total: 0,
  colOnly: 0,
  embedOnly: 0,
  both: 0,
  neither: 0,
  thin: 0,
  publicVisible: 0, // embed only (how current parser works without itinerary col)
  publicMissing: 0,
};
const missingPublic = [];
const thinSamples = [];
const robotsOn = [];
const robotsOff = [];
const robotsUnset = [];

while (true) {
  const { data, error } = await sb
    .from('tours')
    .select('id,title,country,category,duration_days,itinerary,description,seo_schema')
    .range(from, from + pageSize - 1);
  if (error) throw error;
  const rows = data || [];
  if (!rows.length) break;

  for (const row of rows) {
    stats.total += 1;
    const colDays = parseItineraryCol(row.itinerary);
    const emb = parseEmbedded(row.description);
    const embDays = Array.isArray(emb?.itineraries) ? emb.itineraries : [];
    const hasCol = colDays.length > 0;
    const hasEmb = embDays.length > 0;
    if (hasCol && hasEmb) stats.both += 1;
    else if (hasCol) stats.colOnly += 1;
    else if (hasEmb) stats.embedOnly += 1;
    else stats.neither += 1;

    // Current lib/itinerary.ts ignores `itinerary` column — only embed + `itineraries`
    if (hasEmb) stats.publicVisible += 1;
    else {
      stats.publicMissing += 1;
      if (missingPublic.length < 50) {
        missingPublic.push({
          id: row.id,
          title: String(row.title || '').slice(0, 70),
          country: row.country,
          duration_days: row.duration_days,
          colDays: colDays.length,
        });
      }
    }

    const preferred = hasEmb ? embDays : colDays;
    const q = dayQuality(preferred);
    if (q !== 'ok' && q !== 'empty') {
      stats.thin += 1;
      if (thinSamples.length < 20) {
        thinSamples.push({
          id: row.id,
          title: String(row.title || '').slice(0, 60),
          country: row.country,
          q,
          days: preferred.length,
        });
      }
    }

    let robots;
    try {
      const schema = row.seo_schema ? JSON.parse(row.seo_schema) : null;
      robots = schema?._etonSeo?.robots_index;
    } catch {
      robots = undefined;
    }
    if (robots === true) robotsOn.push(row.id);
    else if (robots === false) robotsOff.push(row.id);
    else robotsUnset.push(row.id);
  }

  if (rows.length < pageSize) break;
  from += pageSize;
}

console.log(JSON.stringify({ stats, robots: { on: robotsOn.length, off: robotsOff.length, unset: robotsUnset.length } }, null, 2));
console.log('publicMissing samples', JSON.stringify(missingPublic, null, 2));
console.log('thin samples', JSON.stringify(thinSamples, null, 2));
