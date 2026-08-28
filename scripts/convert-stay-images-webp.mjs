import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { loadEnv } from './lib/image-assign.mjs';

loadEnv();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);
const sharp = (await import('sharp')).default;

const { data } = await supabase
  .from('accommodations')
  .select('id,name,image_url')
  .or('image_url.ilike.%.png%,image_url.ilike.%.jpg%');

let converted = 0;
for (const row of data || []) {
  if (!/accommodations\//i.test(String(row.image_url || ''))) continue;
  const response = await fetch(row.image_url);
  const buffer = Buffer.from(await response.arrayBuffer());
  const webp = await sharp(buffer).rotate().resize({ width: 1400, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
  const hash = createHash('sha1').update(webp).digest('hex').slice(0, 12);
  const path = `accommodations/${Date.now()}-${hash}.webp`;
  const { error } = await supabase.storage.from('media').upload(path, webp, { contentType: 'image/webp', upsert: true });
  if (error) {
    console.warn(row.name, error.message);
    continue;
  }
  const url = supabase.storage.from('media').getPublicUrl(path).data.publicUrl;
  await supabase.from('accommodations').update({ image_url: url, social_image_url: url }).eq('id', row.id);
  converted += 1;
  console.log('converted', row.name);
}

console.log(JSON.stringify({ ok: true, converted }, null, 2));
