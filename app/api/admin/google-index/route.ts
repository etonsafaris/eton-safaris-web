import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { ADMIN_SESSION_COOKIE } from '@/lib/admin-session-cookie';
import { applyAutoIndexSeo, collectionIdToTable } from '@/lib/auto-index-seo';
import { getCollection } from '@/lib/collections';
import { fetchCollectionRecordById, publicRecordSlug } from '@/lib/data';
import { indexableContentKindForTable } from '@/lib/public-indexing';
import { requireAdminUser } from '@/lib/require-admin';
import { seoValuesFromRecord } from '@/lib/seo';
import { createPrivilegedClient } from '@/lib/supabase/admin';
import { buildSavePayload } from '@/lib/supabase-payload';
import { saveWithColumnFallback } from '@/lib/supabase-save';
import type { RecordRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function allowAdmin(request: Request) {
  const cookie = request.headers.get('cookie') || '';
  if (cookie.split(';').some((part) => part.trim() === `${ADMIN_SESSION_COOKIE}=1`)) {
    return true;
  }
  const auth = await requireAdminUser(request);
  return auth.ok;
}

function publicPathForRecord(collectionId: string, record: RecordRow) {
  const config = getCollection(collectionId);
  const slug = publicRecordSlug(record);
  if (!slug || !config.publicPath) return null;
  if (collectionId === 'pages') {
    if (slug === 'home-page' || slug === 'home' || slug === 'homepage') return '/';
    return `/${slug.replace(/^\//, '')}`;
  }
  return `${config.publicPath.replace(/\/$/, '')}/${slug.replace(/^\//, '')}`;
}

export async function POST(request: Request) {
  if (!(await allowAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      collectionId?: string;
      id?: string | number;
      enabled?: boolean;
      configureOnly?: boolean;
    };
    const collectionId = String(body.collectionId || '').trim();
    const id = body.id;
    const enabled = Boolean(body.enabled);
    const configureOnly = Boolean(body.configureOnly);

    if (!collectionId || id == null || id === '') {
      return NextResponse.json({ error: 'collectionId and id are required' }, { status: 400 });
    }

    if (collectionId === 'landing_pages') {
      return NextResponse.json({ error: 'Landing pages cannot be indexed on the public site.' }, { status: 400 });
    }

    const table = collectionIdToTable(collectionId);
    if (!table) {
      return NextResponse.json({ error: 'This collection does not support Google indexing.' }, { status: 400 });
    }

    const config = getCollection(collectionId);
    const aliases = config.aliases || [];
    const full = await fetchCollectionRecordById(table, String(id), aliases);
    if (!full) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    const kind = indexableContentKindForTable(table);
    if (!kind) {
      return NextResponse.json({ error: 'Unsupported content type' }, { status: 400 });
    }

    const { recordPatch, seo } = applyAutoIndexSeo(full, kind, {
      publicPath: publicPathForRecord(collectionId, full) || undefined,
      enableGoogle: configureOnly ? seoValuesFromRecord(full).robots_index === true : enabled,
    });

    const payload = buildSavePayload(
      table,
      { ...recordPatch },
      {
        seo,
        existingRecord: full,
        publicPath: publicPathForRecord(collectionId, full),
        autoIndexSeo: false,
      }
    );

    const result = await saveWithColumnFallback(table, payload, {
      id,
      client: createPrivilegedClient(),
    });
    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    const saved = (result.data?.[0] || { ...full, ...payload, id }) as RecordRow;
    revalidatePath('/', 'layout');
    revalidatePath('/sitemap.xml');

    return NextResponse.json({ ok: true, record: saved });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Google index update failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
