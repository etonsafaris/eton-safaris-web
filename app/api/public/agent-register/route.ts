export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { deliverIncomingAlert } from '@/lib/deliver-alert';
import { saveAgentApplicationOnServer } from '@/lib/save-agent-application';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown> & { honeypot?: string };
    if (typeof body.honeypot === 'string' && body.honeypot.trim()) {
      return NextResponse.json({ data: [{ id: 'ok' }], alreadyExists: false });
    }

    const result = await saveAgentApplicationOnServer(body);
    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 400 });
    }

    if (!result.alreadyExists) {
      const name = String(body.name || body.username || 'Agent').trim();
      const email = String(body.email || '').trim();
      const phone = String(body.phone || body.phoneNumber || '').trim();
      const country = String(body.country || '').trim();
      await deliverIncomingAlert({
        title: 'New agent registration — approval required',
        message: `${name} (${email}${phone ? `, ${phone}` : ''}${country ? `, ${country}` : ''}) applied as an agent and is waiting for approval.`,
        category: 'agent',
        guestEmail: email,
        recordDashboard: true,
        emailAdmin: true,
      });
    }

    return NextResponse.json({
      data: result.data,
      alreadyExists: Boolean(result.alreadyExists),
      table: result.table,
    });
  } catch (error) {
    console.error('[Agent register API]', error);
    return NextResponse.json(
      {
        data: [],
        error: true,
        message: error instanceof Error ? error.message : 'Could not save the agent application.',
      },
      { status: 500 }
    );
  }
}
