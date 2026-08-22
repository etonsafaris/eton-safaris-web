import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE } from '@/lib/admin-session-cookie';
import { pickRecordId } from '@/lib/data';
import { deliverIncomingAlert } from '@/lib/deliver-alert';
import { findAgentRecord } from '@/lib/find-agent';
import { requireAdminUser } from '@/lib/require-admin';
import {
  bearerTokenFromRequest,
  createWriteClient,
  isRlsError,
  rlsHelpMessage,
} from '@/lib/supabase/request-client';
import { updateAgentFields } from '@/lib/agent-row';
import { ensureConfirmedAuthUser } from '@/lib/ensure-auth-user';

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
    const found = await findAgentRecord(client, { id, email });
    if (!found) {
      return NextResponse.json({ error: 'Agent was not found.' }, { status: 404 });
    }

    const existing = found.row;
    const agentTable = found.table;
    const rowId = pickRecordId(existing) ?? (id || null);
    const rowEmail = asEmail(existing.email || existing.Email) || email;
    let updated = await updateAgentFields(client, agentTable, existing, {
      status,
      isActive: status.toLowerCase() === 'active',
    });

    if (updated.error && rowEmail) {
      updated = await updateAgentFields(client, agentTable, { ...existing, email: rowEmail }, {
        status,
        isActive: status.toLowerCase() === 'active',
      });
    }
    if (updated.error) {
      return NextResponse.json({ error: statusError(updated.error.message) }, { status: 400 });
    }

    const name = String(existing.name || existing.full_name || body.name || 'Agent');
    const origin = (process.env.NEXT_PUBLIC_SITE_URL || request.headers.get('origin') || '').replace(/\/$/, '');

    if (status.toLowerCase() === 'active' && rowEmail) {
      await ensureConfirmedAuthUser(client, {
        email: rowEmail,
        name,
        role: 'Travel Agent',
        userId: String(existing.user_id || ''),
      });
    }

    if (status.toLowerCase() === 'active' && rowEmail) {
      const guestMessage = `Hello ${name}, your Eton Safaris agent account is now active. Sign in at ${origin}/login and open the agent portal: ${origin}/agents/portal`;
      await deliverIncomingAlert({
        title: 'Agent account approved',
        message: guestMessage,
        category: 'agent',
        guestEmail: rowEmail,
        sendToGuest: true,
        guestTitle: 'Agent account approved',
        guestMessage,
        emailAdmin: false,
        recordDashboard: false,
      });
    }

    return NextResponse.json({ ok: true, status });
  } catch (error) {
    console.error('[Agents] Status update failed:', error);
    const message = error instanceof Error ? error.message : 'Could not update agent status';
    return NextResponse.json({ error: statusError(message) }, { status: 500 });
  }
}
