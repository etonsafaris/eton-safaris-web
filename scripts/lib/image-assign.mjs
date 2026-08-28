import { createHash } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

export function loadEnv() {
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

export function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

export function slugSafe(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export function imageLooksRisky(url) {
  const value = String(url || '').toLowerCase();
  if (!value) return true;
  return /logo|watermark|stamp|shutterstock|getty|istock|alamy|dreamstime|depositphotos|123rf|bigstock|brand|badge|icon|sprite|canva|base44|tourradar|viator|tripadvisor|safaribookings|booking\.com\/logo/i.test(
    value
  );
}

export async function fetchAll(supabase, table, columns) {
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

export async function getVqd(query) {
  const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`;
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    },
  });
  const html = await response.text();
  const match = html.match(/vqd=["']([^"']+)["']/i) || html.match(/vqd=([\d-]+)/i);
  if (!match) throw new Error(`No DuckDuckGo vqd token for query: ${query}`);
  return match[1];
}

export async function searchDuckDuckGoImages(query, limit = 12) {
  const vqd = await getVqd(query);
  const url = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${encodeURIComponent(vqd)}&f=,,,,&p=1`;
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Referer: 'https://duckduckgo.com/',
      Accept: 'application/json',
    },
  });
  if (!response.ok) throw new Error(`DuckDuckGo image search failed (${response.status})`);
  const payload = await response.json();
  const results = Array.isArray(payload.results) ? payload.results : [];
  return results
    .map((item) => ({
      image: String(item.image || item.thumbnail || '').trim(),
      width: Number(item.width) || 0,
      height: Number(item.height) || 0,
      title: String(item.title || ''),
      source: String(item.url || item.source || ''),
    }))
    .filter((item) => item.image.startsWith('http'))
    .filter((item) => item.width >= 700 || item.height >= 500)
    .filter((item) => !imageLooksRisky(`${item.title} ${item.source} ${item.image}`))
    .slice(0, limit);
}

export async function fetchOgImage(website) {
  if (!website) return '';
  try {
    const response = await fetch(website, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) return '';
    const html = await response.text();
    const patterns = [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) {
        let url = match[1].trim();
        if (url.startsWith('//')) url = `https:${url}`;
        if (url.startsWith('/')) {
          const base = new URL(website);
          url = `${base.origin}${url}`;
        }
        if (url.startsWith('http') && !imageLooksRisky(url)) return url;
      }
    }
  } catch {
    /* ignore */
  }
  return '';
}

export async function downloadImage(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) throw new Error(`Download failed ${response.status}`);
  const contentType = response.headers.get('content-type') || 'image/jpeg';
  if (!contentType.startsWith('image/')) throw new Error(`Not an image: ${contentType}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 18_000) throw new Error('Image too small');
  return { buffer, contentType };
}

export async function optimizeBuffer(buffer, contentType) {
  try {
    const sharp = (await import('sharp')).default;
    const optimized = await sharp(buffer)
      .rotate()
      .resize({ width: 1400, withoutEnlargement: true })
      .webp({ quality: 78, effort: 4 })
      .toBuffer();
    if (optimized.length > 8_000) {
      return { buffer: optimized, contentType: 'image/webp' };
    }
  } catch {
    /* sharp optional */
  }
  return { buffer, contentType };
}

export async function uploadBuffer(supabase, buffer, contentType, folder) {
  const buckets = ['media', 'images', 'uploads', 'public'];
  const ext = contentType.includes('webp') ? 'webp' : contentType.includes('png') ? 'png' : 'jpg';
  const hash = createHash('sha1').update(buffer).digest('hex').slice(0, 12);
  const path = `${folder}/${Date.now()}-${hash}.${ext}`;
  let lastError = null;
  for (const bucket of buckets) {
    const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
      contentType,
      upsert: true,
    });
    if (!error) {
      return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    }
    lastError = error;
  }
  throw new Error(lastError?.message || 'Upload failed');
}

export async function resolveImageFromCandidates(supabase, candidates, folder) {
  for (const imageUrl of candidates) {
    if (!imageUrl || imageLooksRisky(imageUrl)) continue;
    try {
      const { buffer, contentType } = await downloadImage(imageUrl);
      const optimized = await optimizeBuffer(buffer, contentType);
      return await uploadBuffer(supabase, optimized.buffer, optimized.contentType, folder);
    } catch {
      /* try next */
    }
  }
  return '';
}
