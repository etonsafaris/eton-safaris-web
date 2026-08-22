import { NextResponse } from 'next/server';
import { AGENT_TABLES, isMissingTable } from '@/lib/agent-tables';
import { ADMIN_SESSION_COOKIE } from '@/lib/admin-session-cookie';
import { pickRecordId } from '@/lib/data';
import { deliverIncomingAlert } from '@/lib/deliver-alert';
import { requireAdminUser } from '@/lib/require-admin';
import {
  bearerTokenFromRequest,
  createWriteClient,
  isRlsError,
  rlsHelpMessage,
} from '@/lib/supabase/request-client';
import { saveWithColumnFallback } from '@/lib/supabase-save';
import type { RecordRow } from '@/lib/types';
import type { SupabaseClient } from '@supabase/supabase-js';

async function allowAdmin(request: Request) {
  const cookie = request.headers.get('cookie') || '';
  if (cookie.split(';').some((part) => part.trim() === `${ADMIN_SESSION_COOKIE}=1`)) {
    return true;
  }
  const auth = await requireAdminUser(request);
  return auth.ok;
}

function statusError(message: string) {
  if (isRlsError(message)) {
    return rlsHelpMessage('Activating this agent');
  }
  return message;
}

function asEmail(value: unknown) {
  const email = String(value || '').trim().toLowerCase();
  return email.includes('@') ? email : '';
}

async function findAgent(
  client: SupabaseClient,
  input: { id?: string; email?: string }
): Promise<{ row: RecordRow; table: string } | null> {
  for (const table of AGENT_TABLES) {
    if (input.id) {
      for (const column of ['id', 'uuid', '_id', 'agent_id']) {
        const { data, error } = await client.from(table).select('*').eq(column, input.id).maybeSingle();
        if (!error && data) return { row: data as RecordRow, table };
        if (error && isMissingTable(error.message)) break;
      }
    }

    if (input.email) {
      const { data, error } = await client.from(table).select('*').ilike('email', input.email).limit(8);
      if (!error && data?.length) {
        const match =
          ((data as RecordRow[]) || []).find((row) => asEmail(row.email || row.Email) === input.email) ||
          (data[0] as RecordRow);
        if (match) return { row: match, table };
      }
    }
  }

  return null;
}

export async function POST(request: Request) {
  if (!(await allowAdmin(request))) {
    return NextResponse.json(
      { error: 'Unauthorized. Sign in to the dashboard, then click Activate again.' },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as {
      id?: string | number;
      status?: string;
      email?: string;
      name?: string;
    };
    const id = String(body.id ?? '').trim();
    const email = asEmail(body.email);
    const status = String(body.status || 'Active').trim() || 'Active';
    if (!id && !email) {
      return NextResponse.json({ error: 'Agent id or email is required' }, { status: 400 });
    }

    const client = createWriteClient(bearerTokenFromRequest(request));
    const found = await findAgent(client, { id, email });
    if (!found) {
      return NextResponse.json({ error: 'Agent was not found.' }, { status: 404 });
    }

    const existing = found.row;
    const agentTable = found.table;
    const rowId = pickRecordId(existing) ?? (id || null);
    const rowEmail = asEmail(existing.email || existing.Email) || email;
    let updated = rowId
      ? await saveWithColumnFallback(agentTable, { status }, { id: rowId, client })
      : { data: null, error: { message: 'No id column' } };

    if (updated.error && rowEmail) {
      updated = await saveWithColumnFallback(
        agentTable,
        { status },
        { eq: { column: 'email', value: rowEmail }, client }
      );
    }
    if (updated.error) {
      return NextResponse.json({ error: statusError(updated.error.message) }, { status: 400 });
    }

    const name = String(existing.name || existing.full_name || body.name || 'Agent');
    const origin = (process.env.NEXT_PUBLIC_SITE_URL || request.headers.get('origin') || '').replace(/\/$/, '');

    if (status.toLowerCase() === 'active' && rowEmail) {
      await saveWithColumnFallback(
        'profiles',
        { status: 'Active' },
        { eq: { column: 'email', value: rowEmail }, client }
      ).catch(() => undefined);
    }

    const noticeTitle = status.toLowerCase() === 'active' ? 'Agent activated' : `Agent ${status}`;
    const noticeMessage =
      status.toLowerCase() === 'active'
        ? `${name} (${rowEmail || 'no email'}) was activated in the Agents module.`
        : `${name} (${rowEmail || 'no email'}) is now ${status}.`;

    const guestMessage =
      status.toLowerCase() === 'active' && rowEmail
        ? `Hello ${name}, your Eton Safaris agent account is now active. Sign in at ${origin}/login and open the agent portal: ${origin}/agents/portal`
        : undefined;

    await deliverIncomingAlert({
      title: noticeTitle,
      message: noticeMessage,
      category: 'agent',
      guestEmail: rowEmail,
      sendToGuest: Boolean(guestMessage),
      guestTitle: guestMessage ? 'Agent account approved' : undefined,
      guestMessage,
    });

    return NextResponse.json({ ok: true, status });
  } catch (error) {
    console.error('[Agents] Status update failed:', error);
    const message = error instanceof Error ? error.message : 'Could not update agent status';
    return NextResponse.json({ error: statusError(message) }, { status: 500 });
  }
}
