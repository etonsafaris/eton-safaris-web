/**
 * Fill each category up to 100 tours with unique titles (gap filler).
 * Usage: node scripts/fill-tour-gaps-to-100.mjs [--dry-run] [--country Uganda]
 */
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import {
  EXCLUDES_TEMPLATE,
  INCLUDES_TEMPLATE,
  blueprintForCountry,
} from './lib/tour-package-blueprints.mjs';

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

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function pick(list, seed) {
  if (!list?.length) return '';
  return list[Math.abs(seed) % list.length];
}

function embedContent(html, itineraries) {
  return `${html}\n<!--ETON_CONTENT:${encodeURIComponent(JSON.stringify({ blocks: [], itineraries, fields: {} }))}-->`;
}

function mealPlanForDay(dayNumber, totalDays) {
  if (dayNumber === totalDays) return 'Breakfast & Lunch Only';
  return 'Breakfast, Lunch & Dinner';
}

async function fetchAllRows(supabase, table, columns) {
  const pageSize = 1000;
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + pageSize - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

function missingColumn(message) {
  const match =
    message.match(/Could not find the '([^']+)' column/i) ||
    message.match(/column ["'`]([^"'`]+)["'`]/i);
  return match?.[1] || null;
}

async function insertTour(supabase, payload) {
  let current = { ...payload };
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const { data, error } = await supabase.from('tours').insert(current).select('id').limit(1);
    if (!error) return { ok: true, id: data?.[0]?.id };
    const message = error.message || '';
    const column = missingColumn(message);
    if (column && column in current) {
      delete current[column];
      continue;
    }
    if (/520|521|522|523|524|502|503|504|fetch failed|ECONNRESET|ETIMEDOUT|<!DOCTYPE html>/i.test(message) && attempt < 8) {
      await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
      continue;
    }
    return { ok: false, error: message };
  }
  return { ok: false, error: 'insert failed' };
}

loadEnv();
const dryRun = process.argv.includes('--dry-run');
const countryIdx = process.argv.indexOf('--country');
const onlyCountry = countryIdx >= 0 ? String(process.argv[countryIdx + 1] || '').trim() : '';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key, { auth: { persistSession: false } });

const [categories, tours] = await Promise.all([
  fetchAllRows(supabase, 'categories', 'name,country'),
  fetchAllRows(supabase, 'tours', 'id,title,slug,country,category,duration_days'),
]);

const usedSlugs = new Set(tours.map((t) => slugify(t.slug || t.title)).filter(Boolean));
let created = 0;
let failed = 0;

for (const cat of categories) {
  const country = String(cat.country || '').trim();
  const category = String(cat.name || '').trim();
  if (!country || !category) continue;
  if (onlyCountry && country.toLowerCase() !== onlyCountry.toLowerCase()) continue;

  const existing = tours.filter(
    (t) =>
      String(t.country || '').trim().toLowerCase() === country.toLowerCase() &&
      String(t.category || '').trim().toLowerCase() === category.toLowerCase()
  );
  const need = Math.max(0, 100 - existing.length);
  if (!need) continue;

  console.log(`\n=== Fill ${country} / ${category}: have ${existing.length}, need ${need} ===`);
  const blueprint = blueprintForCountry(country);
  const dayCounts = {};
  for (const t of existing) {
    const d = Number(t.duration_days) || 0;
    dayCounts[d] = (dayCounts[d] || 0) + 1;
  }

  for (let n = 0; n < need; n += 1) {
    // Prefer under-filled durations 1–10
    let days = 1;
    let best = Infinity;
    for (let d = 1; d <= 10; d += 1) {
      const count = dayCounts[d] || 0;
      if (count < best) {
        best = count;
        days = d;
      }
    }
    dayCounts[days] = (dayCounts[days] || 0) + 1;

    const park = pick(blueprint.parks, created + n * 17 + days);
    const activity = pick(blueprint.activities, created + n * 13 + days);
    const lodge = pick(blueprint.lodges, created + n * 19 + days);
    const gateway = pick(blueprint.gateways, created + n + days);
    const keywordBit = category.replace(new RegExp(country, 'ig'), '').trim() || 'Safari';
    const title = `${days} Day ${country} ${keywordBit} Route ${existing.length + n + 1} — ${park.replace(/National Park|National Reserve|Conservancy/gi, '').trim()}`.replace(/\s+/g, ' ').trim();
    let slug = slugify(title);
    let i = 2;
    while (usedSlugs.has(slug)) {
      slug = `${slugify(title).slice(0, 70)}-${i}`;
      i += 1;
    }
    usedSlugs.add(slug);

    const itineraries = [];
    for (let day = 1; day <= days; day += 1) {
      const dayLodge = pick(blueprint.lodges, n * 23 + day * days);
      itineraries.push({
        day: String(day),
        title:
          day === 1
            ? `Arrival Transfer & Orientation Toward ${park}`
            : day === days
              ? `Final Activity Window & Departure via ${gateway}`
              : `${park} Focus Day — ${activity}`,
        description:
          day === days
            ? `Your closing day around ${park} keeps ${activity} flexible before the return toward ${gateway}. After lunch the privately guided departure ends.`
            : `Guided time in ${park} centres on ${activity}, with meals and rest at ${dayLodge}. Eton Safaris keeps pacing clear for wildlife access and comfort.`,
        mealPlan: mealPlanForDay(day, days),
        accommodationPlan: day === days ? 'No accommodation' : dayLodge,
      });
    }

    const description = `This ${days}-day ${country} package supports travelers comparing ${keywordBit.toLowerCase()} options, with a clear route through ${park} and guided ${activity}. Meal timing follows full-board days plus breakfast and lunch on departure day.`;

    const payload = {
      id: randomUUID(),
      title,
      slug,
      country,
      category,
      duration_days: days,
      duration_nights: Math.max(days - 1, 0),
      description: embedContent(description, itineraries),
      itinerary: JSON.stringify(itineraries),
      highlights: [
        `${days}-day ${country} ${keywordBit} focus`,
        `Guided time in ${park}`,
        `Signature activity: ${activity}`,
        `Private driver-guide support`,
        `Meal plan aligned to daily safari timing`,
      ].join('\n'),
      price_includes: INCLUDES_TEMPLATE,
      price_excludes: EXCLUDES_TEMPLATE,
      image_url: '',
      seo_title: `${title} | Eton Safaris`,
      meta_description: description.slice(0, 155),
      focus_keyword: `${country} ${keywordBit}`.toLowerCase(),
      published_at: new Date().toISOString(),
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
      is_featured: false,
      is_popular: false,
      show_on_landing: false,
    };

    if (dryRun) {
      created += 1;
      console.log('[dry-run]', title);
      continue;
    }

    const result = await insertTour(supabase, payload);
    if (!result.ok) {
      failed += 1;
      console.warn('Failed:', title, result.error);
    } else {
      created += 1;
      tours.push({ id: result.id, title, slug, country, category, duration_days: days });
    }
  }
}

// Fix empty Madagascar trailing-space category by filling under trimmed country if that category name exists only with space.
console.log(JSON.stringify({ ok: true, dryRun, created, failed }, null, 2));
