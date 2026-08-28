/**
 * Report accommodation cover images shared by more than one property.
 *
 *   node scripts/audit-accommodation-image-dupes.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { fingerprintFromUrl, fetchAll, loadEnv } from './lib/image-assign.mjs';

loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

const stays = await fetchAll(supabase, 'accommodations', 'id,name,country,image_url');

const byUrl = new Map();
const byFingerprint = new Map();

for (const stay of stays) {
  const url = String(stay.image_url || '').trim();
  if (!url) continue;
  const fp = fingerprintFromUrl(url);
  if (!byUrl.has(url)) byUrl.set(url, []);
  byUrl.get(url).push(stay);
  if (!byFingerprint.has(fp)) byFingerprint.set(fp, []);
  byFingerprint.get(fp).push(stay);
}

const urlDupes = [...byUrl.entries()].filter(([, rows]) => rows.length > 1);
const fpDupes = [...byFingerprint.entries()].filter(([, rows]) => rows.length > 1);

const staysInUrlDupes = new Set(urlDupes.flatMap(([, rows]) => rows.map((row) => row.id)));
const staysInFpDupes = new Set(fpDupes.flatMap(([, rows]) => rows.map((row) => row.id)));

console.log(
  JSON.stringify(
    {
      total: stays.length,
      withImage: stays.filter((row) => String(row.image_url || '').trim()).length,
      duplicateUrlGroups: urlDupes.length,
      staysSharingExactUrl: staysInUrlDupes.size,
      duplicateFingerprintGroups: fpDupes.length,
      staysSharingFingerprint: staysInFpDupes.size,
      topUrlDupes: urlDupes
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 8)
        .map(([url, rows]) => ({
          count: rows.length,
          sample: rows.slice(0, 4).map((row) => `${row.name} (${row.country})`),
          url: url.slice(0, 120),
        })),
    },
    null,
    2
  )
);
