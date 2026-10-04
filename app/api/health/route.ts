export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { isDatabaseConfigured, withPgClient } from '@/lib/supabase/pool';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const deep = url.searchParams.get('deep') === '1';
  const configured = isDatabaseConfigured();

  if (!deep) {
    return NextResponse.json({
      ok: true,
      database: configured ? 'configured' : 'missing',
      runtime: process.env.CLOUDFLARE === '1' ? 'cloudflare-worker' : 'node',
    });
  }

  if (!configured) {
    return NextResponse.json({ ok: false, database: 'missing' }, { status: 503 });
  }

  try {
    const probe = withPgClient((client) => client.query('SELECT 1 AS ok'));
    await Promise.race([
      probe,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Database probe timed out after 12s')), 12000)
      ),
    ]);
    return NextResponse.json({ ok: true, database: 'connected' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Database unreachable';
    console.error('[Health] Database probe failed:', message);
    return NextResponse.json({ ok: false, database: 'error', error: message }, { status: 503 });
  }
}
