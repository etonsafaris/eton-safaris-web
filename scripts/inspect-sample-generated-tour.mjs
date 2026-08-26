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

const { data, error } = await sb
  .from('tours')
  .select('title,slug,duration_days,image_url,description,itinerary')
  .eq('country', 'Uganda')
  .eq('duration_days', 3)
  .order('created_date', { ascending: false })
  .limit(1)
  .maybeSingle();

if (error) throw error;
const hasEmbed = String(data.description || '').includes('<!--ETON_CONTENT:');
let days = [];
if (hasEmbed) {
  const match = String(data.description).match(/<!--ETON_CONTENT:([^>]+)-->/);
  if (match) {
    const payload = JSON.parse(decodeURIComponent(match[1]));
    days = (payload.itineraries || []).map((d) => ({
      day: d.day,
      meals: d.mealPlan,
      lodge: d.accommodationPlan,
      title: d.title,
    }));
  }
}
console.log(
  JSON.stringify(
    {
      title: data.title,
      slug: data.slug,
      image: data.image_url,
      hasEmbed,
      itineraryColumnType: typeof data.itinerary,
      itineraryPreview: data.itinerary,
      days,
    },
    null,
    2
  )
);
