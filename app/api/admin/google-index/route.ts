import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { ADMIN_SESSION_COOKIE } from '@/lib/admin-session-cookie';
import { applyAutoIndexSeo, collectionIdToTable } from '@/lib/auto-index-seo';
import { getCollection } from '@/lib/collections';
import { fetchCollectionRecordById, publicRecordSlug } from '@/lib/data';
import { indexableContentKindForTable } from '@/lib/public-indexing';
import { requireAdminUser } from '@/lib/require-admin';
import { packSeoSettings, seoValuesFromRecord } from '@/lib/seo';
import { createPrivilegedClient } from '@/lib/supabase/admin';
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

function withRobotsFlags(record: RecordRow, enabled: boolean): RecordRow {
  const seo = seoValuesFromRecord(record);
  const nextSeo = { ...seo, robots_index: enabled, robots_follow: true };
  let seoSchema = nextSeo.seo_schema;
  try {
    const parsed = seoSchema
      ? (JSON.parse(seoSchema) as Record<string, unknown>)
      : { '@context': 'https://schema.org', '@type': nextSeo.schema_type };
    parsed._etonSeo = JSON.parse(packSeoSettings(nextSeo));
    seoSchema = JSON.stringify(parsed);
  } catch {
    /* keep existing schema text */
  }
  return {
    ...record,
    robots_index: enabled,
    robots_follow: true,
    seo_settings: packSeoSettings(nextSeo),
    seo_schema: seoSchema,
  };
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

    const nextEnabled = configureOnly ? seoValuesFromRecord(full).robots_index === true : enabled;
    let payload: Record<string, unknown>;

    if (configureOnly || nextEnabled) {
      const { recordPatch, seo } = applyAutoIndexSeo(full, kind, {
        publicPath: publicPathForRecord(collectionId, full) || undefined,
        enableGoogle: nextEnabled,
      });
      const packed = packSeoSettings(seo);
      let seoSchema = seo.seo_schema;
      try {
        const parsed = seoSchema
          ? (JSON.parse(seoSchema) as Record<string, unknown>)
          : { '@context': 'https://schema.org', '@type': seo.schema_type };
        parsed._etonSeo = JSON.parse(packed);
        seoSchema = JSON.stringify(parsed);
      } catch {
        /* keep */
      }
      payload = {
        ...recordPatch,
        robots_index: nextEnabled,
        robots_follow: true,
        seo_settings: packed,
        seo_schema: seoSchema,
      };
    } else {
      const patched = withRobotsFlags(full, false);
      payload = {
        robots_index: false,
        robots_follow: true,
        seo_settings: patched.seo_settings,
        seo_schema: patched.seo_schema,
      };
    }

    const result = await saveWithColumnFallback(table, payload, {
      id,
      client: createPrivilegedClient(),
    });
    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    const savedRaw = (result.data?.[0] || { ...full, ...payload, id }) as RecordRow;
    const saved = withRobotsFlags(savedRaw, nextEnabled);
    revalidatePath('/', 'layout');
    revalidatePath('/sitemap.xml');

    return NextResponse.json({
      ok: true,
      enabled: nextEnabled,
      record: saved,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Google index update failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
