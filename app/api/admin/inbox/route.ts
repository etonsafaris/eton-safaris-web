import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE } from '@/lib/admin-session-cookie';
import { pickRecordId } from '@/lib/data';
import { markNotificationReadPayload } from '@/lib/notification-utils';
import { requireAdminUser } from '@/lib/require-admin';
import {
  bearerTokenFromRequest,
  createWriteClient,
  isRlsError,
  rlsHelpMessage,
} from '@/lib/supabase/request-client';
import { saveWithColumnFallback } from '@/lib/supabase-save';
import type { RecordRow } from '@/lib/types';

async function allowAdmin(request: Request) {
  const cookie = request.headers.get('cookie') || '';
  if (cookie.split(';').some((part) => part.trim() === `${ADMIN_SESSION_COOKIE}=1`)) {
    return true;
  }
  const auth = await requireAdminUser(request);
  return auth.ok;
}

function fail(message: string, status = 400) {
  return NextResponse.json(
    { error: isRlsError(message) ? rlsHelpMessage('Updating inbox records') : message },
    { status }
  );
}

export async function POST(request: Request) {
  if (!(await allowAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized. Sign in to the dashboard first.' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      action?: 'mark-read' | 'mark-all-read' | 'delete';
      table?: 'notifications' | 'subscribers';
      id?: string | number;
    };
    const table = body.table === 'subscribers' ? 'subscribers' : 'notifications';
    const client = createWriteClient(bearerTokenFromRequest(request));

    if (body.action === 'delete') {
      const id = String(body.id ?? '').trim();
      if (!id) return fail('Record id is required.');
      const removed = await client.from(table).delete().eq('id', id);
      if (removed.error) return fail(removed.error.message);
      return NextResponse.json({ ok: true, deleted: true });
    }

    if (table !== 'notifications') return fail('That action is only available for notifications.');

    if (body.action === 'mark-read') {
      const id = String(body.id ?? '').trim();
      if (!id) return fail('Notification id is required.');
      const updated = await saveWithColumnFallback('notifications', markNotificationReadPayload(), { id, client });
      if (updated.error) return fail(updated.error.message);
      return NextResponse.json({ ok: true });
    }

    if (body.action === 'mark-all-read') {
      const listed = await client.from('notifications').select('*');
      if (listed.error) return fail(listed.error.message);
      const rows = (listed.data as RecordRow[] | null) || [];
      for (const row of rows) {
        const id = pickRecordId(row);
        if (id == null) continue;
        await saveWithColumnFallback('notifications', markNotificationReadPayload(), { id, client });
      }
      return NextResponse.json({ ok: true });
    }

    return fail('Unknown inbox action.');
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Could not update the inbox.', 500);
  }
}
