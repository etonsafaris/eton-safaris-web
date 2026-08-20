import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE } from '@/lib/admin-session-cookie';

function hasAdminSession(request: Request) {
  const cookie = request.headers.get('cookie') || '';
  return cookie.split(';').some((part) => part.trim() === `${ADMIN_SESSION_COOKIE}=1`);
}

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!hasAdminSession(request) && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  revalidatePath('/', 'layout');
  revalidatePath('/destinations', 'layout');
  revalidatePath('/tours', 'layout');
  revalidatePath('/parks', 'layout');
  revalidatePath('/explore', 'layout');
  revalidatePath('/safari-updates', 'layout');
  revalidatePath('/accommodations', 'layout');
  revalidatePath('/sitemap.xml');

  return NextResponse.json({ ok: true, at: Date.now() });
}
