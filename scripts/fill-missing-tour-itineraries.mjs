/**
 * Fill missing tour itineraries:
 * - Prefer copying from itinerary column into description embed when present
 * - Otherwise generate a day-by-day plan from duration/title/country
 *
 * Usage:
 *   node scripts/fill-missing-tour-itineraries.mjs --dry-run
 *   node scripts/fill-missing-tour-itineraries.mjs
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

function parseJson(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
}

function parseEmbedded(description) {
  const match = String(description || '').match(/<!--ETON_CONTENT:([\s\S]*?)-->/);
  if (!match) return {};
  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    try {
      return JSON.parse(match[1]);
    } catch {
      return {};
    }
  }
}

function stripEmbedded(html) {
  return String(html || '')
    .replace(/<!--ETON_CONTENT:[\s\S]*?-->/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function embedContent(html, itineraries, fields = {}) {
  const clean = stripEmbedded(html);
  const payload = {
    blocks: [],
    itineraries,
    fields,
  };
  return `${clean}\n<!--ETON_CONTENT:${encodeURIComponent(JSON.stringify(payload))}-->`;
}

function parseItineraryCol(value) {
  const parsed = parseJson(value);
  if (Array.isArray(parsed)) return parsed.filter((d) => d && typeof d === 'object');
  if (Array.isArray(parsed?.days)) return parsed.days;
  if (Array.isArray(parsed?.itineraries)) return parsed.itineraries;
  return [];
}

function normalizeDays(days) {
  return days.map((day, index) => ({
    day: String(day.day || index + 1),
    title: String(day.title || `Day ${index + 1}`).trim(),
    description: String(day.description || '').trim(),
    mealPlan: String(day.mealPlan || day.meal_plan || '').trim(),
    accommodationPlan: String(day.accommodationPlan || day.accommodation_plan || '').trim(),
  }));
}

function durationFromTour(tour) {
  const fromField = Number(tour.duration_days);
  if (Number.isFinite(fromField) && fromField > 0) return Math.min(Math.max(Math.round(fromField), 1), 21);
  const label = String(tour.duration_label || tour.title || '');
  const match = label.match(/(\d+)\s*[- ]?\s*day/i);
  if (match) return Math.min(Math.max(Number(match[1]), 1), 21);
  return 3;
}

function placeHint(tour) {
  const title = String(tour.title || '');
  const cleaned = title
    .replace(/^\d+\s*Day\s+/i, '')
    .replace(/\b(classic|best|signature|package|experience|journey|adventure|tour|safari|holiday)\b/gi, ' ')
    .replace(/\bin\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const country = String(tour.country || '').trim();
  if (cleaned && cleaned.length > 3) return cleaned.slice(0, 80);
  return country || 'the park';
}

function mealPlanForDay(day, total) {
  if (day === 1) return 'Lunch, Dinner';
  if (day === total) return 'Breakfast';
  return 'Breakfast, Lunch, Dinner';
}

function accommodationForDay(day, total, place) {
  if (day === total) return 'Depart after breakfast (no overnight)';
  return `Overnight near ${place}`;
}

function generateItineraries(tour) {
  const days = durationFromTour(tour);
  const country = String(tour.country || 'Africa').trim() || 'Africa';
  const place = placeHint(tour);
  const category = String(tour.category || 'Safari').trim();
  const out = [];

  for (let day = 1; day <= days; day += 1) {
    if (day === 1) {
      out.push({
        day: String(day),
        title: `Arrival & transfer toward ${place}`,
        description: `Arrive in ${country} and meet your Eton Safaris driver-guide. After a short briefing on the ${category.toLowerCase()} plan, transfer toward ${place}. Settle into your lodge, enjoy a welcome orientation, and keep the first evening flexible depending on arrival time.`,
        mealPlan: mealPlanForDay(day, days),
        accommodationPlan: accommodationForDay(day, days, place),
      });
      continue;
    }
    if (day === days) {
      out.push({
        day: String(day),
        title: `Final activity window & departure`,
        description: `Enjoy a final morning activity around ${place} when timing allows, then transfer to the departure point with packed memories of your ${country} journey. Your guide confirms onward flight or road connections before farewell.`,
        mealPlan: mealPlanForDay(day, days),
        accommodationPlan: accommodationForDay(day, days, place),
      });
      continue;
    }
    out.push({
      day: String(day),
      title: `${place} exploration day`,
      description: `Spend the day focused on ${place} with guided activities matched to the season and your interests. Expect a paced mix of wildlife or landscape viewing, scenic stops, and lodge downtime so the ${days}-day ${country} itinerary stays immersive without rushed transfers.`,
      mealPlan: mealPlanForDay(day, days),
      accommodationPlan: accommodationForDay(day, days, place),
    });
  }

  return out;
}

loadEnv();
const dryRun = process.argv.includes('--dry-run');
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

const pageSize = 200;
let from = 0;
let scanned = 0;
let fixed = 0;
let generated = 0;
let synced = 0;
let failed = 0;
const byCountry = {};

while (true) {
  const { data, error } = await sb
    .from('tours')
    .select('id,title,country,category,duration_days,duration_label,itinerary,description')
    .range(from, from + pageSize - 1);
  if (error) throw error;
  const rows = data || [];
  if (!rows.length) break;

  for (const tour of rows) {
    scanned += 1;
    const colDays = normalizeDays(parseItineraryCol(tour.itinerary));
    const emb = parseEmbedded(tour.description);
    const embDays = normalizeDays(Array.isArray(emb?.itineraries) ? emb.itineraries : []);
    const country = String(tour.country || 'Unknown').trim() || 'Unknown';
    byCountry[country] = byCountry[country] || { missing: 0, fixed: 0 };

    // Already visible via embed — ensure itinerary column stays in sync when empty
    if (embDays.length > 0) {
      if (colDays.length === 0 && !dryRun) {
        const { error: syncErr } = await sb
          .from('tours')
          .update({
            itinerary: JSON.stringify(embDays),
            updated_date: new Date().toISOString(),
          })
          .eq('id', tour.id);
        if (syncErr && !/updated_date/i.test(syncErr.message)) {
          // non-fatal
        }
      }
      continue;
    }

    byCountry[country].missing += 1;
    let days = colDays;
    let source = 'column';
    if (!days.length) {
      days = generateItineraries(tour);
      source = 'generated';
    }

    const nextDescription = embedContent(tour.description, days, emb.fields || {});
    const payload = {
      description: nextDescription,
      itinerary: JSON.stringify(days),
      updated_date: new Date().toISOString(),
    };

    if (dryRun) {
      fixed += 1;
      if (source === 'generated') generated += 1;
      else synced += 1;
      byCountry[country].fixed += 1;
      console.log(`[dry] ${country} · ${String(tour.title || '').slice(0, 60)} ← ${source} (${days.length} days)`);
      continue;
    }

    let current = { ...payload };
    let ok = false;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const { error: updateError } = await sb.from('tours').update(current).eq('id', tour.id);
      if (!updateError) {
        ok = true;
        break;
      }
      if (/updated_date/i.test(updateError.message || '') && 'updated_date' in current) {
        delete current.updated_date;
        continue;
      }
      if (/520|502|503|504|fetch failed|timeout/i.test(updateError.message || '') && attempt < 4) {
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        continue;
      }
      console.error(`FAIL ${tour.id}: ${updateError.message}`);
      break;
    }

    if (ok) {
      fixed += 1;
      byCountry[country].fixed += 1;
      if (source === 'generated') generated += 1;
      else synced += 1;
      console.log(`OK ${country} · ${String(tour.title || '').slice(0, 60)} ← ${source} (${days.length} days)`);
    } else {
      failed += 1;
    }
  }

  if (rows.length < pageSize) break;
  from += pageSize;
}

console.log(
  JSON.stringify(
    {
      scanned,
      fixed,
      generated,
      synced,
      failed,
      dryRun,
      byCountry,
    },
    null,
    2
  )
);
