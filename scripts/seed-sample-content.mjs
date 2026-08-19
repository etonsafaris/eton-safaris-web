/**
 * Seeds sample public content for every create-enabled admin module.
 *
 * Usage (from repo root, with .env.local present):
 *   node scripts/seed-sample-content.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { randomUUID } from 'crypto';

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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const IMG = {
  uganda: 'https://images.unsplash.com/photo-1516426122078-c23e76319840?auto=format&fit=crop&w=1600&q=80',
  kenya: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&w=1600&q=80',
  tanzania: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=1600&q=80',
  rwanda: 'https://images.unsplash.com/photo-1543946207-39bd91e70ca7?auto=format&fit=crop&w=1600&q=80',
  gorilla: 'https://images.unsplash.com/photo-1543946207-39bd91e70ca7?auto=format&fit=crop&w=1600&q=80',
  lodge: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1600&q=80',
  park: 'https://images.unsplash.com/photo-1484406566174-9da000fda645?auto=format&fit=crop&w=1600&q=80',
  explore: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80',
  update: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=80',
};

function missingColumn(message) {
  const match =
    message.match(/Could not find the '([^']+)' column/i) ||
    message.match(/column ["'`]([^"'`]+)["'`]/i) ||
    message.match(/column \w+\.([a-z0-9_]+) does not exist/i);
  return match?.[1] || null;
}

async function save(table, payload, id) {
  let current = { ...payload };
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const query = id
      ? supabase.from(table).update(current).eq('id', id)
      : supabase.from(table).insert(current);
    const { data, error } = await query.select('id').limit(1);
    if (!error) return { data: data?.[0] || true, error: null };
    const column = missingColumn(error.message);
    if (column && column in current) {
      delete current[column];
      continue;
    }
    if (/null value in column ["']?id["']?/i.test(error.message) && !current.id) {
      current.id = randomUUID();
      continue;
    }
    if (/invalid input syntax for type (bigint|integer|numeric)/i.test(error.message)) {
      let changed = false;
      for (const [key, value] of Object.entries(current)) {
        if (typeof value === 'string' && /[0-9]/.test(value)) {
          const parsed = Number(String(value).replace(/[^0-9.]/g, ''));
          if (Number.isFinite(parsed)) {
            current[key] = parsed;
            changed = true;
          } else {
            delete current[key];
            changed = true;
          }
        }
      }
      if (changed) continue;
    }
    if (/invalid input syntax for type json/i.test(error.message)) {
      let changed = false;
      for (const [key, value] of Object.entries(current)) {
        if (typeof value === 'string' && (value.trim().startsWith('{') || value.trim().startsWith('['))) {
          try {
            current[key] = JSON.parse(value);
            changed = true;
          } catch {
            /* keep */
          }
        }
      }
      if (changed) continue;
    }
    return { data: null, error };
  }
  return { data: null, error: { message: `Could not save ${table}` } };
}

async function tableExists(name) {
  const { error } = await supabase.from(name).select('id').limit(1);
  if (!error) return true;
  return !/schema cache|does not exist/i.test(error.message || '');
}

async function upsert(table, payload, aliases = []) {
  const names = [table, ...aliases];
  let target = table;
  for (const name of names) {
    if (await tableExists(name)) {
      target = name;
      break;
    }
  }

  const slug = payload.slug;
  if (slug) {
    const existing = await supabase.from(target).select('id').eq('slug', slug).maybeSingle();
    if (!existing.error && existing.data?.id) {
      const result = await save(target, payload, existing.data.id);
      if (result.error) console.error(`[seed] update ${target}/${slug}:`, result.error.message);
      else console.log(`[seed] updated ${target} ${slug}`);
      return result;
    }
  }

  const result = await save(target, payload);
  if (result.error) console.error(`[seed] insert ${target}:`, result.error.message);
  else console.log(`[seed] created ${target} ${slug || payload.name || payload.title || payload.keyword}`);
  return result;
}

const link = (href, text) =>
  `<a href="${href}">${text}</a>`;

async function main() {
  await upsert('countries', {
    name: 'Uganda',
    slug: 'uganda',
    tagline: 'The Pearl of Africa',
    summary: 'Gorilla trekking, the Nile, and wildlife parks across Uganda.',
    description: `<p>Uganda is the Pearl of Africa — home to mountain gorillas, the source of the Nile, and classic savannah game. ${link('/tours/bwindi-gorilla-trekking-safari', 'Gorilla trekking in Bwindi')} is the signature experience, with chimpanzee tracking, Murchison Falls, and Queen Elizabeth National Park completing a full circuit.</p>`,
    image_url: IMG.uganda,
    seo_title: 'Uganda Safaris | Eton Safaris',
    meta_description: 'Plan Uganda gorilla trekking, wildlife, and Nile safaris with Eton Safaris.',
  });

  await upsert('countries', {
    name: 'Kenya',
    slug: 'kenya',
    tagline: 'Big skies and the Great Migration',
    summary: 'Masai Mara wildebeest migration, Amboseli elephants, and coast add-ons.',
    description: `<p>Kenya delivers open savannah, Maasai culture, and the annual wildebeest crossing. Explore ${link('/tours/masai-mara-wildlife-safari', 'Masai Mara wildlife safaris')} with optional Amboseli and Samburu extensions.</p>`,
    image_url: IMG.kenya,
    seo_title: 'Kenya Safaris | Eton Safaris',
    meta_description: 'Kenya safari packages for the Masai Mara, Amboseli, and more.',
  });

  await upsert('countries', {
    name: 'Tanzania',
    slug: 'tanzania',
    tagline: 'Serengeti, Ngorongoro, and Kilimanjaro',
    summary: 'Northern circuit classics plus Zanzibar beach time.',
    description: `<p>Tanzania is built for big-game viewing. The Serengeti and Ngorongoro Crater pair perfectly with a ${link('/tanzania-safaris', 'Tanzania safari itinerary')} and a Zanzibar finale.</p>`,
    image_url: IMG.tanzania,
    seo_title: 'Tanzania Safaris | Eton Safaris',
    meta_description: 'Serengeti and Ngorongoro safari holidays with Eton Safaris.',
  });

  await upsert('countries', {
    name: 'Rwanda',
    slug: 'rwanda',
    tagline: 'Volcanoes, lakes, and conservation',
    summary: 'Compact gorilla country with lakes and canopy walks.',
    description: `<p>Rwanda is efficient and conservation-led. Combine Volcanoes National Park gorilla trekking with ${link('/rwanda-safaris', 'Akagera wildlife')} and lake country lodges.</p>`,
    image_url: IMG.rwanda,
    seo_title: 'Rwanda Safaris | Eton Safaris',
    meta_description: 'Rwanda gorilla trekking and wildlife safaris.',
  });

  await upsert('categories', {
    name: 'Gorilla Trekking',
    slug: 'gorilla-trekking',
    country: 'Uganda',
    description: `<p>Permitted treks to habituated mountain gorilla families in Bwindi and Mgahinga. Read more about ${link('/tours/bwindi-gorilla-trekking-safari', 'our Bwindi gorilla safari')}.</p>`,
    image_url: IMG.gorilla,
  });

  await upsert('categories', {
    name: 'Wildlife Safaris',
    slug: 'wildlife-safaris',
    country: 'Kenya',
    description: `<p>Classic game drives for the Big Five, great migration herds, and birdlife across East Africa.</p>`,
    image_url: IMG.kenya,
  });

  await upsert('national_park', {
    name: 'Bwindi Impenetrable National Park',
    slug: 'bwindi-impenetrable-national-park',
    location: 'Southwestern Uganda',
    description_title: 'Home of the mountain gorilla',
    description: `<p>Bwindi protects one of the last strongholds of the mountain gorilla. ${link('/tours/bwindi-gorilla-trekking-safari', 'Trekking here')} is a once-in-a-lifetime encounter in ancient rainforest.</p>`,
    best_time_to_visit: 'June–August and December–February',
    country: 'Uganda',
    image_url: IMG.park,
  }, ['national_parks', 'parks']);

  await upsert('accommodations', {
    name: 'Bwindi Forest Lodge',
    slug: 'bwindi-forest-lodge',
    location: 'Buhoma, Bwindi',
    description_title: 'Rainforest lodge for gorilla trekkers',
    description: `<p>A comfortable mid-range lodge on the forest edge, timed for early gorilla briefings. Pair it with ${link('/parks/bwindi-impenetrable-national-park', 'Bwindi Impenetrable National Park')}.</p>`,
    type: 'Mid-range Lodge',
    country: 'Uganda',
    national_park: 'Bwindi Impenetrable National Park',
    park: 'Bwindi Impenetrable National Park',
    image_url: IMG.lodge,
  });

  await upsert('explore', {
    title: 'Source of the Nile',
    slug: 'source-of-the-nile',
    location: 'Jinja, Uganda',
    description_title: 'Where the Nile begins',
    description: `<p>Jinja is adventure HQ — rafting, sunset cruises, and the historic source of the Nile. Add it after ${link('/uganda-safaris', 'your Uganda safari')}.</p>`,
    country: 'Uganda',
    image_url: IMG.explore,
  });

  await upsert('tours', {
    title: 'Bwindi Gorilla Trekking Safari',
    slug: 'bwindi-gorilla-trekking-safari',
    country: 'Uganda',
    category: 'Gorilla Trekking',
    duration_days: 3,
    price: 2450,
    group_size: '2–6 guests',
    currency: 'USD',
    featured: true,
    image_url: IMG.gorilla,
    highlights: 'Gorilla trekking permit\nBwindi rainforest walks\nCommunity visit',
    price_includes: 'Park fees\nLodge stay\nGuide and transport',
    price_excludes: 'International flights\nVisa\nTips',
    description: `<p>Spend three days in Bwindi for a guided gorilla trek and forest lodge stay. ${link('/parks/bwindi-impenetrable-national-park', 'Bwindi Impenetrable National Park')} is the heart of Uganda’s gorilla conservation story.</p><p>This sample itinerary is published from the admin dashboard so it appears on the public website.</p>`,
    itineraries: JSON.stringify([
      { day: '1', title: 'Arrive Buhoma', description: 'Transfer to the forest edge and briefing.', mealPlan: 'Dinner', accommodationPlan: 'Bwindi Forest Lodge' },
      { day: '2', title: 'Gorilla trek', description: 'Full-day trek with a habituated family.', mealPlan: 'Breakfast, lunch, dinner', accommodationPlan: 'Bwindi Forest Lodge' },
      { day: '3', title: 'Departure', description: 'Optional community walk and transfer out.', mealPlan: 'Breakfast', accommodationPlan: '—' },
    ]),
    seo_title: 'Bwindi Gorilla Trekking Safari | Eton Safaris',
    meta_description: '3-day Bwindi gorilla trekking safari with lodge stay and park fees.',
  });

  await upsert('tours', {
    title: 'Masai Mara Wildlife Safari',
    slug: 'masai-mara-wildlife-safari',
    country: 'Kenya',
    category: 'Wildlife Safaris',
    duration_days: 4,
    price: 1890,
    group_size: '2–8 guests',
    currency: 'USD',
    featured: true,
    image_url: IMG.kenya,
    highlights: 'Game drives\nOptional balloon safari\nMaasai cultural visit',
    description: `<p>Four days of game drives in the Masai Mara. Look for big cats, elephants, and — in season — the ${link('/kenya-safaris', 'Great Migration')} herds.</p>`,
    seo_title: 'Masai Mara Wildlife Safari | Eton Safaris',
    meta_description: '4-day Masai Mara safari with game drives and lodge stays.',
  });

  await upsert('safari_updates', {
    title: 'Best time for gorilla trekking',
    slug: 'best-time-for-gorilla-trekking',
    country: 'Uganda',
    excerpt: 'Dry months offer easier forest trails, but gorillas can be tracked year-round.',
    content: `<p>Gorilla trekking runs all year. The driest windows are June to August and December to February. Book permits early and read our ${link('/tours/bwindi-gorilla-trekking-safari', 'Bwindi gorilla safari')} notes before you travel.</p>`,
    image_url: IMG.update,
    published_at: new Date().toISOString().slice(0, 10),
    post_type: 'standard',
    seo_title: 'Best time for gorilla trekking | Eton Safaris',
    meta_description: 'When to trek mountain gorillas in Uganda and Rwanda.',
  });

  await upsert('pages', {
    title: 'About Us',
    slug: 'about-us',
    image_url: IMG.uganda,
    content: `<h4>Who We Are</h4><p>Eton Safaris is a Uganda-based safari planner for East Africa. We design gorilla trekking, wildlife, and tailor-made itineraries with the same public-page layout guests expect from leading safari brands.</p><h4>What We Do</h4><p>From ${link('/uganda-safaris', 'Uganda safaris')} to Kenya, Tanzania, and Rwanda, our operators confirm lodges, permits, and guiding. ${link('/contact', 'Talk to us')} to start a quotation.</p>`,
    seo_title: 'About Us | Eton Safaris',
    meta_description: 'Meet Eton Safaris — East African safari planning from Uganda.',
  });

  for (const country of [
    { slug: 'uganda-safaris', name: 'Uganda', image: IMG.uganda },
    { slug: 'kenya-safaris', name: 'Kenya', image: IMG.kenya },
    { slug: 'tanzania-safaris', name: 'Tanzania', image: IMG.tanzania },
    { slug: 'rwanda-safaris', name: 'Rwanda', image: IMG.rwanda },
  ]) {
    await upsert('landing_pages', {
      title: `${country.name} Safaris`,
      slug: country.slug,
      country: country.name,
      image_url: country.image,
      content: `<p>Discover ${country.name} with guided lodges, park fees, and private guiding. Browse live packages and ${link('/contact', 'request a quotation')}.</p>`,
      seo_title: `${country.name} Safaris | Eton Safaris`,
      meta_description: `Plan ${country.name} safari holidays with Eton Safaris.`,
    });
  }

  const keyword = {
    keyword: 'gorilla trekking uganda',
    country: 'Uganda',
    category: 'Gorilla Trekking',
    slug: 'gorilla-trekking-uganda',
  };
  const existingKeyword = await supabase.from('keywords').select('id').eq('slug', keyword.slug).maybeSingle();
  if (existingKeyword.data?.id) {
    await save('keywords', keyword, existingKeyword.data.id);
    console.log('[seed] updated keywords gorilla-trekking-uganda');
  } else {
    const inserted = await save('keywords', keyword);
    if (inserted.error) console.error('[seed] insert keywords:', inserted.error.message);
    else console.log('[seed] created keywords gorilla-trekking-uganda');
  }

  console.log('Sample content seed finished.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
