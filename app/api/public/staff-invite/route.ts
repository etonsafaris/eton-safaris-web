export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ensureConfirmedAuthUser } from '@/lib/ensure-auth-user';
import { findAgentRecord, isStaffRole } from '@/lib/find-agent';
import { updateAgentFields } from '@/lib/agent-row';
import { staffRoleLabel } from '@/lib/invite-staff';
import type { RecordRow } from '@/lib/types';

function publicInvite(row: RecordRow) {
  return {
    email: String(row.email || ''),
    name: String(row.name || ''),
    role: staffRoleLabel(String(row.role || 'User')),
    status: String(row.status || 'Pending'),
  };
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token')?.trim() || '';
  if (!token) return NextResponse.json({ error: 'Invite token is required.' }, { status: 400 });

  try {
    const client = createAdminClient();
    const found = await findAgentRecord(client, { token });
    if (!found || !isStaffRole(found.row.role)) {
      return NextResponse.json({ error: 'This invite link is invalid or has expired.' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, invite: publicInvite(found.row) });
  } catch (error) {
    console.error('[Public API] staff-invite GET failed:', error);
    return NextResponse.json(
      { data: [], error: true, message: error instanceof Error ? error.message : 'Could not load this invite.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string; name?: string; password?: string };
    const token = String(body.token || '').trim();
    const name = String(body.name || '').trim();
    const password = String(body.password || '').trim();
    if (!token) return NextResponse.json({ error: 'Invite token is required.' }, { status: 400 });
    if (name.length < 2) return NextResponse.json({ error: 'Enter your full name.' }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });

    const client = createAdminClient();
    const found = await findAgentRecord(client, { token });
    if (!found || !isStaffRole(found.row.role)) {
      return NextResponse.json({ error: 'This invite link is invalid or has expired.' }, { status: 404 });
    }

    const email = String(found.row.email || '').trim().toLowerCase();
    const authUser = await ensureConfirmedAuthUser(client, {
      email,
      password,
      name,
      role: String(found.row.role || 'User'),
      userId: String(found.row.user_id || ''),
    });

    const updated = await updateAgentFields(client, found.table, found.row, {
      name,
      user_id: authUser?.id || found.row.user_id,
      approval_token: crypto.randomUUID(),
    });
    if (updated.error) {
      return NextResponse.json({ error: updated.error.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      email,
      role: staffRoleLabel(String(found.row.role || 'User')),
    });
  } catch (error) {
    console.error('[Staff invite complete] Failed:', error);
    return NextResponse.json(
      { data: [], error: true, message: error instanceof Error ? error.message : 'Could not complete this invite.' },
      { status: 500 }
    );
  }
}
