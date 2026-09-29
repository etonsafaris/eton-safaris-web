export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { CMS_PUBLIC_CACHE_TAG } from '@/lib/cms-public-cache';
import { ADMIN_SESSION_COOKIE } from '@/lib/admin-session-cookie';
import { applyAutoIndexSeo, collectionIdToTable } from '@/lib/auto-index-seo';
import { getCollection } from '@/lib/collections';
import { publicRecordSlug } from '@/lib/data';
import { indexableContentKindForTable } from '@/lib/public-indexing';
import { requireAdminUser } from '@/lib/require-admin';
import { packSeoSettings, seoValuesFromRecord } from '@/lib/seo';
import { createAdminClient } from '@/lib/supabase/admin';
import { saveWithColumnFallback } from '@/lib/supabase-save';
import type { RecordRow } from '@/lib/types';
import { withAdminPgRoute } from '@/lib/admin-pg-route';

function quoteIdentifier(value: string) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) throw new Error('Invalid collection table');
  return `"${value}"`;
}

async function findRecord(table: string, aliases: string[], id: string | number) {
  for (const name of [table, ...aliases]) {
    try {
      const rows = await withAdminPgRoute((client) =>
        client.query<RecordRow>(
          `SELECT * FROM ${quoteIdentifier(name)} WHERE CAST(id AS text) = $1 LIMIT 1`,
          [String(id)]
        )
      );
      if (rows.rows[0]) return rows.rows[0];
    } catch (error) {
      if (!/relation .* does not exist|column .* does not exist/i.test(error instanceof Error ? error.message : '')) {
        console.error(`[Google Index] Could not load ${name}:`, error);
      }
    }
  }
  return null;
}

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
    const full = await findRecord(table, aliases, id);
    if (!full) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    const kind = indexableContentKindForTable(table);
    if (!kind) {
      return NextResponse.json({ error: 'Unsupported content type' }, { status: 400 });
    }

    const nextEnabled = configureOnly ? true : enabled;
    let payload: Record<string, unknown>;

    if (configureOnly || nextEnabled) {
      const { recordPatch, seo } = applyAutoIndexSeo(full, kind, {
        publicPath: publicPathForRecord(collectionId, full) || undefined,
        enableGoogle: nextEnabled,
      });
      const packed = packSeoSettings({ ...seo, robots_index: nextEnabled, robots_follow: true });
      let seoSchema = seo.seo_schema || String(full.seo_schema || '');
      try {
        const parsed = seoSchema
          ? (JSON.parse(seoSchema) as Record<string, unknown>)
          : { '@context': 'https://schema.org', '@type': seo.schema_type };
        parsed._etonSeo = JSON.parse(packed);
        seoSchema = JSON.stringify(parsed);
      } catch {
        seoSchema = JSON.stringify({
          '@context': 'https://schema.org',
          '@type': seo.schema_type || 'WebPage',
          _etonSeo: JSON.parse(packed),
        });
      }
      // Persist Google flag in seo_schema._etonSeo — robots_index / seo_settings columns are absent.
      payload = {
        seo_title: recordPatch.seo_title,
        meta_description: recordPatch.meta_description,
        social_image_url: recordPatch.social_image_url,
        seo_schema: seoSchema,
        ...(typeof recordPatch.description === 'string' ? { description: recordPatch.description } : {}),
      };
    } else {
      const patched = withRobotsFlags(full, false);
      payload = {
        seo_schema: patched.seo_schema,
      };
    }

    const result = await saveWithColumnFallback(table, payload, {
      id,
      client: createAdminClient(),
    });
    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    const savedRaw = (result.data?.[0] || { ...full, ...payload, id }) as RecordRow;
    // Always return an explicit robots_index for the admin UI (column may not exist in DB).
    const saved = {
      ...withRobotsFlags(savedRaw, nextEnabled),
      robots_index: nextEnabled,
    } as RecordRow;
    revalidateTag(CMS_PUBLIC_CACHE_TAG);
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
