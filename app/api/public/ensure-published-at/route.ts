export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE } from '@/lib/admin-session-cookie';
import { createAdminClient } from '@/lib/supabase/admin';
import { publishStampForSave, recordPublishedAt } from '@/lib/data';
import { embedContent, extractEmbeddedContent, recordBodyHtml } from '@/lib/embedded-content';
import { saveWithColumnFallback } from '@/lib/supabase-save';
import type { RecordRow } from '@/lib/types';

function hasAdminSession(request: Request) {
  const cookie = request.headers.get('cookie') || '';
  return cookie.split(';').some((part) => part.trim() === `${ADMIN_SESSION_COOKIE}=1`);
}

const TABLES = [
  'categories',
  'countries',
  'tours',
  'national_park',
  'explore',
  'accommodations',
  'safari_updates',
  'pages',
] as const;

function bodyFieldForEmbed(row: RecordRow): 'description' | 'content' | 'summary' | 'excerpt' {
  for (const key of ['description', 'content', 'summary', 'excerpt'] as const) {
    if (typeof row[key] === 'string') return key;
  }
  return 'description';
}

/**
 * Backfill missing published_at on CMS rows — admin only (never from public page views).
 * Only writes when recordPublishedAt was empty.
 */
export async function POST(request: Request) {
  if (!hasAdminSession(request)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }
  try {
    const body = (await request.json().catch(() => ({}))) as { table?: string; id?: string };
    const table = String(body.table || '').trim();
    const id = body.id !== undefined && body.id !== null ? String(body.id).trim() : '';
    if (!TABLES.includes(table as (typeof TABLES)[number])) {
      return NextResponse.json({ error: 'Unsupported table' }, { status: 400 });
    }
    if (!id) {
      return NextResponse.json({ error: 'Record id is required' }, { status: 400 });
    }

    const client = createAdminClient();
    const { data, error } = await client.from(table).select('*').eq('id', id).maybeSingle();
    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Record not found' }, { status: 404 });
    }

    const row = data as RecordRow;
    const existing = recordPublishedAt(row);
    if (existing) {
      return NextResponse.json({ ok: true, published_at: existing, updated: false });
    }

    const stamp = publishStampForSave(
      String(row.created_at || row.created_date || row.updated_at || row.updated_date || '')
    );

    const saved = await saveWithColumnFallback(table, { published_at: stamp }, { id, client });
    if (!saved.error) {
      return NextResponse.json({ ok: true, published_at: stamp, updated: true });
    }

    // Column may be absent — persist stamp inside the CMS HTML embed so public readers still see it.
    const field = bodyFieldForEmbed(row);
    const currentHtml = String(row[field] || recordBodyHtml(row) || '');
    const embedded = extractEmbeddedContent(currentHtml);
    const nextHtml = embedContent(currentHtml, {
      ...embedded,
      fields: { ...(embedded.fields || {}), published_at: stamp },
    });
    const embeddedSave = await saveWithColumnFallback(table, { [field]: nextHtml }, { id, client });
    if (embeddedSave.error) {
      return NextResponse.json(
        { error: embeddedSave.error.message || saved.error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, published_at: stamp, updated: true, via: 'embed' });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not backfill published date' },
      { status: 500 }
    );
  }
}
