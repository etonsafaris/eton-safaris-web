import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE } from '@/lib/admin-session-cookie';
import { importKeywordsForScope } from '@/lib/keyword-import';
import { chipsFromKeywordRows } from '@/lib/keywords';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminUser } from '@/lib/require-admin';

function hasAdminSession(request: Request) {
  const cookie = request.headers.get('cookie') || '';
  return cookie.split(';').some((part) => part.trim() === `${ADMIN_SESSION_COOKIE}=1`);
}

function errorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Failed to save keywords.';
}

async function isAuthorized(request: Request) {
  if (hasAdminSession(request)) return true;
  const auth = await requireAdminUser(request);
  return auth.ok;
}

export async function GET(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: 'Sign in to manage keywords.' }, { status: 401 });
  }

  try {
    const client = createAdminClient();
    const { data, error } = await client.from('keywords').select('*');
    if (error) {
      return NextResponse.json({ error: error.message, rows: [] }, { status: 500 });
    }
    return NextResponse.json({ rows: data || [], table: 'keywords' });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error), rows: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: 'Sign in to manage keywords.' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      country?: string;
      category?: string;
      keywords?: unknown;
      merge?: unknown;
      import?: unknown;
    };
    const country = String(body.country || '').trim();
    const category = String(body.category || '').trim();
    const merge = body.merge === true || body.import === true;

    if (!country) {
      return NextResponse.json({ error: 'Select a country first.' }, { status: 400 });
    }
    if (!category) {
      return NextResponse.json({ error: 'Select a category first.' }, { status: 400 });
    }

    const client = createAdminClient();
    const result = await importKeywordsForScope(client, {
      country,
      category,
      keywords: body.keywords,
      merge,
    });

    const { data: refreshed } = await client.from('keywords').select('*');
    return NextResponse.json({
      ok: true,
      rows: refreshed || [],
      chips: chipsFromKeywordRows((refreshed as Record<string, unknown>[]) || []),
      table: 'keywords',
      imported: result,
    });
  } catch (error) {
    console.error('[Keywords] Save failed:', error);
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: 'Sign in to manage keywords.' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { id?: string; ids?: unknown };
    const ids = Array.isArray(body.ids)
      ? body.ids.map((value) => String(value || '').trim()).filter(Boolean)
      : [String(body.id || '').trim()].filter(Boolean);

    if (ids.length === 0) {
      return NextResponse.json({ error: 'Missing keyword id.' }, { status: 400 });
    }

    const client = createAdminClient();
    const { error } = await client.from('keywords').delete().in('id', ids);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: refreshed } = await client.from('keywords').select('*');
    return NextResponse.json({ ok: true, rows: refreshed || [] });
  } catch (error) {
    console.error('[Keywords] Delete failed:', error);
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
