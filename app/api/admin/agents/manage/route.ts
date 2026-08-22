import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE } from '@/lib/admin-session-cookie';
import { findAgentRecord } from '@/lib/find-agent';
import { pickRecordId } from '@/lib/data';
import { requireAdminUser } from '@/lib/require-admin';
import {
  bearerTokenFromRequest,
  createWriteClient,
  isRlsError,
  rlsHelpMessage,
} from '@/lib/supabase/request-client';
import { updateAgentFields } from '@/lib/agent-row';

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
    { error: isRlsError(message) ? rlsHelpMessage('Updating this agent') : message },
    { status }
  );
}

export async function POST(request: Request) {
  if (!(await allowAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized. Sign in to the dashboard first.' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      action?: 'update' | 'delete';
      id?: string | number;
      email?: string;
      name?: string;
      phone?: string;
      country?: string;
      company?: string;
      company_website?: string;
      address?: string;
      bio?: string;
      gender?: string;
      status?: string;
      allowed_modules?: string[] | string;
    };
    const id = String(body.id ?? '').trim();
    const email = String(body.email || '').trim();
    if (!id && !email.includes('@')) {
      return fail('Agent id or email is required.');
    }

    const client = createWriteClient(bearerTokenFromRequest(request));
    const found = await findAgentRecord(client, { id, email });
    if (!found) return fail('Agent was not found.', 404);

    const rowId = pickRecordId(found.row) ?? (id || null);
    if (body.action === 'delete') {
      if (rowId == null) return fail('This agent has no id, so it cannot be deleted.');
      const removed = await client.from(found.table).delete().eq('id', rowId);
      if (removed.error) return fail(removed.error.message);
      return NextResponse.json({ ok: true, deleted: true });
    }

    const payload: Record<string, unknown> = {
      name: body.name?.trim() || undefined,
      username: body.name?.trim() || undefined,
      email: email || undefined,
      phone: body.phone?.trim() || undefined,
      phoneNumber: body.phone?.trim() || undefined,
      country: body.country?.trim() || undefined,
      company: body.company?.trim() || undefined,
      companyName: body.company?.trim() || undefined,
      company_website: body.company_website?.trim() || undefined,
      companyWebsite: body.company_website?.trim() || undefined,
      address: body.address?.trim() || undefined,
      bio: body.bio?.trim() || undefined,
      gender: body.gender?.trim() || undefined,
      status: body.status?.trim() || undefined,
      allowed_modules:
        body.allowed_modules === undefined
          ? undefined
          : Array.isArray(body.allowed_modules)
            ? JSON.stringify(body.allowed_modules)
            : String(body.allowed_modules),
    };

    const updated = await updateAgentFields(client, found.table, found.row, payload);
    if (updated.error) return fail(updated.error.message);
    return NextResponse.json({ ok: true, data: updated.data });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Could not update the agent.', 500);
  }
}
