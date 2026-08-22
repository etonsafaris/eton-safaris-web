import { NextResponse } from 'next/server';
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

    return NextResponse.json({
      data: result.data,
      alreadyExists: Boolean(result.alreadyExists),
      table: result.table,
    });
  } catch (error) {
    console.error('[Agent register API]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not save the agent application.' },
      { status: 500 }
    );
  }
}
