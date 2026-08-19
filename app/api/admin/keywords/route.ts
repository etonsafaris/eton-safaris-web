import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE } from '@/lib/admin-session-cookie';
import { chipsFromKeywordRows, keywordRowMatchesScope, parseKeywordList } from '@/lib/keywords';
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
    };
    const country = String(body.country || '').trim();
    const category = String(body.category || '').trim();
    const keywords = parseKeywordList(body.keywords);

    if (!country) {
      return NextResponse.json({ error: 'Select a country first.' }, { status: 400 });
    }
    if (!category) {
      return NextResponse.json({ error: 'Select a category first.' }, { status: 400 });
    }

    const client = createAdminClient();
    const { data: existing, error: loadError } = await client.from('keywords').select('*');
    if (loadError) {
      return NextResponse.json({ error: loadError.message }, { status: 500 });
    }

    const scoped = ((existing as Record<string, unknown>[]) || []).filter((row) =>
      keywordRowMatchesScope(row, country, category)
    );
    const payload = { country, category, keywords };
    const existingId = scoped[0]?.id;

    const write = existingId
      ? await client.from('keywords').update(payload).eq('id', existingId).select('*')
      : await client
          .from('keywords')
          .insert({ id: crypto.randomUUID(), ...payload })
          .select('*');

    if (write.error) {
      return NextResponse.json({ error: write.error.message }, { status: 500 });
    }

    const { data: refreshed } = await client.from('keywords').select('*');
    return NextResponse.json({
      ok: true,
      rows: refreshed || [],
      chips: chipsFromKeywordRows((refreshed as Record<string, unknown>[]) || []),
      table: 'keywords',
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
