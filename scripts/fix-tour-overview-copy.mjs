/**
 * Rewrite tour overview + meta description so they match country/category topic
 * (fixes leftover mismatched phrases like gorilla copy on beach tours).
 *
 * Usage: node scripts/fix-tour-overview-copy.mjs [--dry-run]
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

function topicFromCategory(category, country) {
  let topic = String(category || '').replace(new RegExp(country, 'ig'), ' ').replace(/\s+/g, ' ').trim();
  if (/gorilla/i.test(topic)) return 'gorilla trekking';
  if (/chimpanzee|chimp/i.test(topic)) return 'chimpanzee tracking';
  if (/beach/i.test(topic)) return 'beach holiday';
  if (/mountain|climb/i.test(topic)) return 'mountain climbing';
  if (/wildlife/i.test(topic)) return 'wildlife safari';
  if (/bird/i.test(topic)) return 'birding safari';
  return 'safari holiday';
}

function clip(text, max) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}

async function fetchAll(supabase, columns) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('tours').select(columns).range(from, from + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

loadEnv();
const dryRun = process.argv.includes('--dry-run');
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

const tours = await fetchAll(sb, 'id,title,country,category,duration_days,description,focus_keyword,seo_title,slug');
let updated = 0;
let failed = 0;

for (const tour of tours) {
  const country = String(tour.country || '').trim();
  const category = String(tour.category || '').trim();
  const days = Number(tour.duration_days) || 1;
  const topic = topicFromCategory(category, country);
  const focus = String(tour.focus_keyword || topic).trim().toLowerCase() || topic;
  const title = String(tour.title || '').trim();

  const overview = `${focus} is the focus of this ${days} day ${country} itinerary with Eton Safaris. The route is paced for clear daily logistics, guided activities matching ${category}, comfortable lodge stays on overnight days, and a final day with breakfast and lunch only before departure.`;

  const raw = String(tour.description || '');
  const embedMatch = raw.match(/<!--ETON_CONTENT:([\s\S]*?)-->/);
  let embed = '';
  if (embedMatch) {
    try {
      const payload = JSON.parse(decodeURIComponent(embedMatch[1]));
      if (Array.isArray(payload.itineraries)) {
        payload.itineraries = payload.itineraries.map((day) => ({
          ...day,
          title: String(day.title || '').replace(/[\u2010-\u2015\u2212—–−-]/g, ' ').replace(/\s+/g, ' ').trim(),
          description: String(day.description || '').replace(/[\u2010-\u2015\u2212—–−-]/g, ' ').replace(/\s+/g, ' ').trim(),
        }));
      }
      embed = `\n<!--ETON_CONTENT:${encodeURIComponent(JSON.stringify(payload))}-->`;
    } catch {
      embed = `\n<!--ETON_CONTENT:${embedMatch[1]}-->`;
    }
  }

  const description = `${overview}${embed}`;
  const meta = clip(overview, 155);
  const keywords = Array.from(
    new Set([focus, `${country} ${topic}`, `${topic} in ${country}`, category.toLowerCase()])
  );

  if (dryRun) {
    if (updated < 3) console.log(title, '→', meta);
    updated += 1;
    continue;
  }

  let error = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const result = await sb
      .from('tours')
      .update({
        description,
        meta_description: meta,
        focus_keyword: focus,
        focus_keywords: keywords,
        seo_title: clip(`${title} | Eton Safaris`, 60),
        updated_date: new Date().toISOString(),
      })
      .eq('id', tour.id);
    error = result.error;
    if (!error) break;
    if (/fetch failed|520|502|503|504/i.test(error.message || '')) {
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      continue;
    }
    break;
  }

  if (error) {
    failed += 1;
    console.warn(error.message);
  } else {
    updated += 1;
    if (updated % 200 === 0) console.log(`… ${updated}/${tours.length}`);
  }
}

console.log(JSON.stringify({ ok: true, dryRun, updated, failed }, null, 2));
