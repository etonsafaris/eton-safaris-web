export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { insertAgentApplication, updateAgentFields } from '@/lib/agent-row';
import { findAgentRecord } from '@/lib/find-agent';
import { isOwnerAdminEmail } from '@/lib/inbox';
import { readPasswordResetToken } from '@/lib/password-reset';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string; password?: string };
    const password = String(body.password || '');
    const parsed = readPasswordResetToken(String(body.token || ''));
    if (!parsed) {
      return NextResponse.json({ error: 'This reset link is invalid or has expired.' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Use at least 8 characters.' }, { status: 400 });
    }

    const client = createAdminClient();
    const found = await findAgentRecord(client, { email: parsed.email });
    if (found) {
      const updated = await updateAgentFields(client, found.table, found.row, { password });
      if (updated.error) {
        return NextResponse.json({ error: updated.error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true, email: parsed.email });
    }

    const configuredEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    if (isOwnerAdminEmail(parsed.email) && parsed.email === configuredEmail) {
      const created = await insertAgentApplication(client, 'registered_agents', {
        name: parsed.email.split('@')[0],
        email: parsed.email,
        password,
        role: 'Full Access (Admin)',
      });
      if (created.error) {
        return NextResponse.json({ error: created.error.message }, { status: 400 });
      }
      const row = await findAgentRecord(client, { email: parsed.email });
      if (row) {
        await updateAgentFields(client, row.table, row.row, { password, status: 'Active', name: parsed.email.split('@')[0] });
      }
      return NextResponse.json({ ok: true, email: parsed.email });
    }

    return NextResponse.json({ error: 'No account was found for this reset link.' }, { status: 404 });
  } catch (error) {
    console.error('[Auth] reset-password failed:', error);
    return NextResponse.json({ error: 'Could not save the new password.' }, { status: 503 });
  }
}
