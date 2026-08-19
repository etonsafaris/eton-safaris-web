import { NextResponse } from 'next/server';
import { SITE } from '@/lib/collections';
import { sendEmail } from '@/lib/email';
import { createAdminClient } from '@/lib/supabase/admin';
import { ADMIN_SESSION_COOKIE } from '@/lib/admin-session-cookie';
import { saveWithColumnFallback } from '@/lib/supabase-save';

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || SITE.url).replace(/\/$/, '');
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id')?.trim();
  const origin = siteUrl();

  if (!id) {
    return NextResponse.redirect(`${origin}/admin/registered_agents`);
  }

  const cookie = request.headers.get('cookie') || '';
  const hasAdmin = cookie.split(';').some((part) => part.trim() === `${ADMIN_SESSION_COOKIE}=1`);
  if (!hasAdmin) {
    return NextResponse.redirect(`${origin}/login?next=${encodeURIComponent(`/api/agents/approve?id=${id}`)}`);
  }

  try {
    const supabase = createAdminClient();
    const { data: agent, error } = await supabase.from('registered_agents').select('*').eq('id', id).maybeSingle();
    if (error || !agent) {
      return NextResponse.redirect(`${origin}/admin/registered_agents`);
    }

    await saveWithColumnFallback('registered_agents', { status: 'Active' }, { id, client: supabase });
    const email = String(agent.email || '');
    if (email.includes('@')) {
      await sendEmail({
        title: 'Your Eton Safaris agent account is approved',
        message: `Hello ${String(agent.name || 'Agent')}, your agent membership has been approved. Sign in at ${origin}/login and open the agent portal: ${origin}/agents/portal`,
        to: [email],
        category: 'system',
      });
    }

    return NextResponse.redirect(`${origin}/admin/registered_agents`);
  } catch (error) {
    console.error('[Agents] Approval failed:', error);
    return NextResponse.redirect(`${origin}/admin/registered_agents`);
  }
}
