import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE } from '@/lib/admin-session-cookie';
import { adminItemSummary } from '@/lib/admin-item-notify';
import { deliverIncomingAlert } from '@/lib/deliver-alert';

function hasAdminSession(request: Request) {
  const cookie = request.headers.get('cookie') || '';
  return cookie.split(';').some((part) => part.trim() === `${ADMIN_SESSION_COOKIE}=1`);
}

export async function POST(request: Request) {
  if (!hasAdminSession(request) && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      module?: string;
      action?: 'created' | 'updated';
      item?: Record<string, unknown>;
    };
    const moduleName = body.module?.trim() || 'item';
    const action = body.action === 'updated' ? 'updated' : 'created';
    const { title, lines } = adminItemSummary(body.item || {});
    const details = lines.length
      ? lines.map((line) => `<li>${line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</li>`).join('')
      : '<li>No extra fields were saved.</li>';

    const result = await deliverIncomingAlert({
      title: `Admin ${action} ${moduleName}: ${title}`,
      message: `An admin ${action} a ${moduleName} record named ${title}.`,
      category: 'system',
      html: `<div style="font-family:Georgia,serif;line-height:1.5;color:#222">
        <p>An admin just <strong>${action}</strong> a <strong>${moduleName}</strong> record.</p>
        <p><strong>${title}</strong></p>
        <ul>${details}</ul>
      </div>`,
    });

    return NextResponse.json({
      ok: true,
      recorded: result.recorded,
      emailed: result.emailed,
      id: result.id,
      to: result.to,
      from: result.from,
    });
  } catch (error) {
    console.error('[Admin item email] Failed:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Could not send item email' },
      { status: 500 }
    );
  }
}
